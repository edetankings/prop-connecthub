-- Internal helpers are not API endpoints. All grants are finalized in 07_security.sql.
CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
      AND (_user_id = auth.uid() OR auth.role() = 'service_role'));
$$;

CREATE FUNCTION public.get_my_profile_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid();
$$;

CREATE FUNCTION prop_connect_private.assert_admin() RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Administrator authorization required' USING ERRCODE='42501';
  END IF;
END $$;

CREATE FUNCTION prop_connect_private.assert_finance_ready() RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.platform_settings
      WHERE money_rules_approved AND monetary_unit='NGN_MAJOR'
        AND nullif(btrim(company_account_name),'') IS NOT NULL
        AND nullif(btrim(company_account_number),'') IS NOT NULL
        AND nullif(btrim(company_bank_name),'') IS NOT NULL
        AND company_account_number <> '0000000000') THEN
    RAISE EXCEPTION 'Financial rules, currency units, and bank configuration require owner approval';
  END IF;
END $$;

CREATE FUNCTION public.update_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

CREATE FUNCTION public.log_admin_action(_action text, _details jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM prop_connect_private.assert_admin();
  IF nullif(btrim(_action),'') IS NULL OR length(_action)>120 THEN
    RAISE EXCEPTION 'Invalid audit action';
  END IF;
  INSERT INTO public.audit_logs(user_id,action,details)
    VALUES(auth.uid(),_action,coalesce(_details,'{}'::jsonb));
END $$;

CREATE FUNCTION public.touch_last_login() RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  UPDATE public.profiles SET last_login_at=now() WHERE user_id=auth.uid();
$$;

CREATE FUNCTION public.generate_referral_code() RETURNS text
LANGUAGE sql VOLATILE SET search_path = public, pg_temp AS $$
  SELECT 'PC-' || upper(replace(gen_random_uuid()::text,'-',''));
$$;

CREATE FUNCTION public.auto_assign_referral_code() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.profile_type IN ('agent','builder') AND NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END $$;

-- Serialize placements and track actual BFS depth. No approximate depth counter.
CREATE FUNCTION public.place_in_matrix(_referrer_profile_id uuid)
RETURNS TABLE(parent_id uuid,lvl integer,pos integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE nodes uuid[]:=ARRAY[_referrer_profile_id]; depths integer[]:=ARRAY[1];
  visited uuid[]:='{}'; node uuid; depth integer; slot integer; child record;
BEGIN
  PERFORM pg_advisory_xact_lock(731904201);
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=_referrer_profile_id) THEN
    RAISE EXCEPTION 'Invalid referral';
  END IF;
  WHILE cardinality(nodes)>0 LOOP
    node:=nodes[1]; depth:=depths[1]; nodes:=nodes[2:]; depths:=depths[2:];
    IF node=ANY(visited) THEN RAISE EXCEPTION 'Referral cycle detected'; END IF;
    visited:=array_append(visited,node);
    IF cardinality(visited)>100000 THEN RAISE EXCEPTION 'Referral placement requires review'; END IF;
    SELECT s INTO slot FROM generate_series(1,2) AS s
      WHERE NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.referred_by=node AND p.referral_position=s)
      ORDER BY s LIMIT 1;
    IF slot IS NOT NULL THEN RETURN QUERY SELECT node,depth,slot; RETURN; END IF;
    FOR child IN SELECT id FROM public.profiles WHERE referred_by=node ORDER BY referral_position,id LOOP
      nodes:=array_append(nodes,child.id); depths:=array_append(depths,depth+1);
    END LOOP;
  END LOOP;
  RAISE EXCEPTION 'Referral placement unavailable';
END $$;

CREATE FUNCTION public.auto_place_referral() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE placement record;
BEGIN
  IF TG_OP='UPDATE' THEN
    IF NEW.referred_by IS DISTINCT FROM OLD.referred_by THEN
      RAISE EXCEPTION 'Referral placement is immutable; reviewed maintenance required';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.referred_by IS NULL THEN RETURN NEW; END IF;
  IF NEW.referred_by=NEW.id THEN RAISE EXCEPTION 'Self-referral forbidden'; END IF;
  NEW.invited_by:=NEW.referred_by;
  SELECT * INTO placement FROM public.place_in_matrix(NEW.referred_by);
  NEW.referred_by:=placement.parent_id;
  NEW.referral_level:=placement.lvl; NEW.referral_position:=placement.pos;
  RETURN NEW;
END $$;

CREATE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE kind public.profile_type:='buyer'; ref uuid;
BEGIN
  IF NEW.raw_user_meta_data->>'profile_type' IN ('agent','builder') THEN
    kind:=(NEW.raw_user_meta_data->>'profile_type')::public.profile_type;
  END IF;
  SELECT id INTO ref FROM public.profiles
    WHERE referral_code=nullif(NEW.raw_user_meta_data->>'referral_code','');
  INSERT INTO public.profiles(user_id,full_name,profile_type,phone,trust_score,referred_by)
    VALUES(NEW.id,left(coalesce(NEW.raw_user_meta_data->>'full_name',''),200),kind,
      nullif(NEW.raw_user_meta_data->>'phone',''),CASE WHEN kind='agent' THEN 50 ELSE 0 END,ref);
  -- User metadata never assigns user_roles, KYC, phone verification, or admin access.
  RETURN NEW;
END $$;

-- Invoker trigger: current_user distinguishes direct API writes from checked definer RPCs.
CREATE FUNCTION public.prevent_profile_sensitive_field_updates() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF current_user IN ('postgres','service_role','supabase_admin') THEN RETURN NEW; END IF;
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.referred_by IS DISTINCT FROM OLD.referred_by
     OR NEW.invited_by IS DISTINCT FROM OLD.invited_by
     OR NEW.referral_code IS DISTINCT FROM OLD.referral_code
     OR NEW.referral_level IS DISTINCT FROM OLD.referral_level
     OR NEW.referral_position IS DISTINCT FROM OLD.referral_position THEN
    RAISE EXCEPTION 'Profile identity and referral fields are immutable';
  END IF;
  IF NOT public.has_role(auth.uid(),'admin') AND
     (to_jsonb(NEW)-ARRAY['full_name','phone','avatar_url','bio','location','welcome_seen','updated_at'])
       IS DISTINCT FROM
     (to_jsonb(OLD)-ARRAY['full_name','phone','avatar_url','bio','location','welcome_seen','updated_at']) THEN
    RAISE EXCEPTION 'Protected profile field';
  END IF;
  IF NEW.phone IS DISTINCT FROM OLD.phone THEN
    NEW.phone_verified:=false; NEW.phone_verified_at:=NULL;
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION public.clamp_profile_trust_score() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.trust_score NOT BETWEEN 0 AND 100 THEN RAISE EXCEPTION 'Invalid trust score'; END IF;
  RETURN NEW;
END $$;

-- Explicitly bounded SECURITY DEFINER projection; no direct anonymous profile grant.
CREATE FUNCTION prop_connect_private.public_agent_rows()
RETURNS TABLE(id uuid,full_name text,avatar_url text,bio text,profile_type public.profile_type,
 trust_score integer,kyc_verified boolean,is_visible boolean,properties_listed integer,
 completed_transactions integer,location text,created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT id,full_name,avatar_url,bio,profile_type,trust_score,kyc_verified,is_visible,
    properties_listed,completed_transactions,location,created_at
  FROM public.profiles WHERE is_visible AND profile_type IN ('agent','builder');
$$;
CREATE VIEW public.public_profiles WITH (security_invoker=true,security_barrier=true) AS
  SELECT * FROM prop_connect_private.public_agent_rows();

CREATE FUNCTION public.get_platform_stats()
RETURNS TABLE(buyers bigint,verified_agents bigint,live_listings bigint,secured_escrow bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
 SELECT (SELECT count(*) FROM public.profiles WHERE profile_type='buyer'),
 (SELECT count(*) FROM public.profiles WHERE profile_type IN ('agent','builder') AND kyc_verified),
 (SELECT count(*) FROM public.properties WHERE is_verified AND status IN ('available','for_sale','for_rent')),
 (SELECT coalesce(sum(total_payable),0)::bigint FROM public.transactions WHERE payment_status IN ('secured','released'));
$$;

CREATE FUNCTION public.get_company_payment_details()
RETURNS TABLE(company_account_name text,company_account_number text,company_bank_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  PERFORM prop_connect_private.assert_finance_ready();
  RETURN QUERY SELECT p.company_account_name,p.company_account_number,p.company_bank_name FROM public.platform_settings p;
END $$;
