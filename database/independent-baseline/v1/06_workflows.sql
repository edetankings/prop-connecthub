CREATE FUNCTION public.state_code_for(_state TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  s TEXT := upper(trim(coalesce(_state, '')));
BEGIN
  RETURN CASE s
    WHEN 'LAGOS' THEN 'LAG'
    WHEN 'ABUJA' THEN 'ABJ'
    WHEN 'FCT' THEN 'ABJ'
    WHEN 'FEDERAL CAPITAL TERRITORY' THEN 'ABJ'
    WHEN 'RIVERS' THEN 'RIV'
    WHEN 'OYO' THEN 'OYO'
    WHEN 'KANO' THEN 'KAN'
    WHEN 'KADUNA' THEN 'KAD'
    WHEN 'OGUN' THEN 'OGN'
    WHEN 'DELTA' THEN 'DEL'
    WHEN 'ANAMBRA' THEN 'ANA'
    WHEN 'ENUGU' THEN 'ENU'
    WHEN 'EDO' THEN 'EDO'
    WHEN 'IMO' THEN 'IMO'
    WHEN 'ABIA' THEN 'ABI'
    WHEN 'AKWA IBOM' THEN 'AKW'
    WHEN 'CROSS RIVER' THEN 'CRS'
    WHEN 'BAYELSA' THEN 'BAY'
    WHEN 'PLATEAU' THEN 'PLA'
    WHEN 'BENUE' THEN 'BEN'
    WHEN 'NIGER' THEN 'NIG'
    WHEN 'KWARA' THEN 'KWA'
    WHEN 'KOGI' THEN 'KOG'
    WHEN 'NASARAWA' THEN 'NAS'
    WHEN 'OSUN' THEN 'OSU'
    WHEN 'ONDO' THEN 'OND'
    WHEN 'EKITI' THEN 'EKI'
    WHEN 'BORNO' THEN 'BOR'
    WHEN 'BAUCHI' THEN 'BAU'
    WHEN 'GOMBE' THEN 'GOM'
    WHEN 'ADAMAWA' THEN 'ADA'
    WHEN 'TARABA' THEN 'TAR'
    WHEN 'YOBE' THEN 'YOB'
    WHEN 'JIGAWA' THEN 'JIG'
    WHEN 'KATSINA' THEN 'KAT'
    WHEN 'KEBBI' THEN 'KEB'
    WHEN 'SOKOTO' THEN 'SOK'
    WHEN 'ZAMFARA' THEN 'ZAM'
    WHEN 'EBONYI' THEN 'EBO'
    ELSE COALESCE(NULLIF(regexp_replace(s, '[^A-Z]', '', 'g'), ''), 'NGA')
  END;
END;
$$;

CREATE FUNCTION public.generate_property_code(_agent_id uuid,_state text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE ref text; number text;
BEGIN
 SELECT coalesce(referral_code,left(replace(id::text,'-',''),8)) INTO STRICT ref FROM public.profiles WHERE id=_agent_id;
 number:=nextval('public.property_number_seq')::text;
 RETURN 'PROP-'||left(public.state_code_for(_state),3)||'-'||replace(ref,'PC-','')||'-'||lpad(number,greatest(6,length(number)),'0');
END $$;
CREATE FUNCTION public.auto_assign_property_code() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN NEW.property_code:=public.generate_property_code(NEW.agent_id,NEW.state); RETURN NEW; END $$;

CREATE FUNCTION public.assign_deal_number() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE number text;
BEGIN
 number:=nextval('public.deal_number_seq')::text;
 NEW.deal_number:='PC-'||to_char(now(),'YYYY')||'-'||lpad(number,greatest(6,length(number)),'0');
 RETURN NEW;
END $$;

CREATE FUNCTION public.request_deal(_property_id uuid,_message text DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE p public.properties; agent public.profiles; result uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT * INTO STRICT p FROM public.properties WHERE id=_property_id FOR UPDATE;
 IF NOT p.is_verified OR p.status NOT IN ('available','for_sale','for_rent') THEN RAISE EXCEPTION 'Listing unavailable'; END IF;
 SELECT * INTO STRICT agent FROM public.profiles WHERE id=p.agent_id;
 IF agent.user_id=auth.uid() THEN RAISE EXCEPTION 'Own listing forbidden'; END IF;
 SELECT id INTO result FROM public.deal_requests WHERE property_id=p.id AND buyer_id=auth.uid() AND status='pending';
 IF result IS NOT NULL THEN RETURN result; END IF;
 INSERT INTO public.deal_requests(buyer_id,agent_user_id,agent_profile_id,property_id,property_code,buyer_message)
 VALUES(auth.uid(),agent.user_id,agent.id,p.id,p.property_code,left(_message,5000)) RETURNING id INTO result;
 RETURN result;
END $$;

CREATE FUNCTION public.accept_deal(_request_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE d public.deal_requests; p public.properties; cs public.commission_settings; tx uuid; fee bigint;
BEGIN
 PERFORM prop_connect_private.assert_finance_ready();
 SELECT * INTO STRICT d FROM public.deal_requests WHERE id=_request_id FOR UPDATE;
 IF auth.uid() IS NULL OR (d.agent_user_id IS DISTINCT FROM auth.uid() AND NOT public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'Agent authorization required'; END IF;
 IF d.status<>'pending' THEN RAISE EXCEPTION 'Pending deal required'; END IF;
 SELECT * INTO STRICT p FROM public.properties WHERE id=d.property_id FOR UPDATE;
 IF NOT p.is_verified OR p.status NOT IN ('available','for_sale','for_rent') OR p.price<=0 THEN RAISE EXCEPTION 'Listing unavailable'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p.agent_id AND user_id=d.agent_user_id AND id=d.agent_profile_id) THEN RAISE EXCEPTION 'Agent identity mismatch'; END IF;
 SELECT * INTO STRICT cs FROM public.commission_settings;
 fee:=round(p.price*CASE WHEN p.listing_type='rental' THEN cs.rental_percent ELSE cs.sales_percent END/100.0);
 INSERT INTO public.transactions(buyer_id,seller_id,property_id,property_code,amount,commission,commission_amount,total_payable,payment_status,type,status,expires_at)
 VALUES(d.buyer_id,d.agent_user_id,p.id,p.property_code,p.price,fee,fee,p.price,'pending_payment',p.listing_type,'pending_payment',now()+interval '72 hours') RETURNING id INTO tx;
 UPDATE public.properties SET status='payment_pending' WHERE id=p.id;
 UPDATE public.deal_requests SET status='accepted',transaction_id=tx,accepted_at=now() WHERE id=d.id;
 UPDATE public.deal_requests SET status='cancelled' WHERE property_id=p.id AND status='pending' AND id<>d.id;
 RETURN tx;
END $$;

CREATE FUNCTION public.initiate_secure_payment(_property_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE result uuid;
BEGIN
 PERFORM prop_connect_private.assert_finance_ready();
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT d.transaction_id INTO result FROM public.deal_requests d JOIN public.transactions t ON t.id=d.transaction_id
 WHERE d.property_id=_property_id AND d.buyer_id=auth.uid() AND d.status='accepted'
 AND t.payment_status IN ('pending_payment','under_review') ORDER BY d.accepted_at DESC LIMIT 1;
 IF result IS NULL THEN RAISE EXCEPTION 'Agent acceptance required; no direct payment bypass'; END IF;
 RETURN result;
END $$;

CREATE FUNCTION public.decline_deal(_request_id uuid,_reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE d public.deal_requests;
BEGIN
 SELECT * INTO STRICT d FROM public.deal_requests WHERE id=_request_id FOR UPDATE;
 IF auth.uid() IS NULL OR (d.agent_user_id IS DISTINCT FROM auth.uid() AND NOT public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'Agent authorization required'; END IF;
 IF d.status<>'pending' OR nullif(btrim(_reason),'') IS NULL THEN RAISE EXCEPTION 'Pending deal and reason required'; END IF;
 UPDATE public.deal_requests SET status='declined',decline_reason=_reason,declined_at=now() WHERE id=d.id;
END $$;

CREATE FUNCTION public.log_deal_status() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE event_name text; target uuid;
BEGIN
 IF TG_OP='INSERT' THEN event_name:='requested'; target:=NEW.agent_user_id;
 ELSE
   IF NEW.status IS DISTINCT FROM OLD.status THEN
     NEW.stage:=CASE NEW.status WHEN 'accepted' THEN 'payment_pending' WHEN 'pending' THEN 'pending_agent' ELSE NEW.status END;
     event_name:=NEW.status; target:=NEW.buyer_id;
   ELSIF NEW.stage IS DISTINCT FROM OLD.stage THEN event_name:='stage:'||NEW.stage;
   ELSE RETURN NEW; END IF;
 END IF;
 INSERT INTO public.deal_events(deal_id,actor_id,event,details) VALUES(NEW.id,auth.uid(),event_name,CASE WHEN TG_OP='INSERT' THEN NEW.buyer_message ELSE NEW.decline_reason END);
 IF target IS NOT NULL THEN
   INSERT INTO public.notifications(user_id,title,message,type,link) VALUES(target,'Deal update',event_name,'info','/deal/'||NEW.id);
 END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.sync_deal_stage_from_tx() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
 IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
   UPDATE public.deal_requests SET stage=CASE NEW.payment_status
    WHEN 'pending_payment' THEN 'payment_pending' WHEN 'under_review' THEN 'payment_under_review'
    WHEN 'secured' THEN 'payment_confirmed' WHEN 'released' THEN 'completed'
    WHEN 'rejected' THEN 'cancelled' ELSE 'cancelled' END WHERE transaction_id=NEW.id;
 END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.advance_deal_stage(_deal_id uuid,_stage text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE d public.deal_requests;
BEGIN
 IF _stage IS NULL OR _stage NOT IN ('inspection','documents','payment_pending','disputed') THEN RAISE EXCEPTION 'Invalid stage'; END IF;
 SELECT * INTO STRICT d FROM public.deal_requests WHERE id=_deal_id FOR UPDATE;
 IF auth.uid() IS NULL OR (auth.uid() NOT IN (d.buyer_id,d.agent_user_id) AND NOT public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'Deal authorization required'; END IF;
 IF d.status<>'accepted' OR d.stage IN ('completed','cancelled') THEN RAISE EXCEPTION 'Inactive deal'; END IF;
 IF d.stage IN ('payment_under_review','payment_confirmed') AND _stage<>'disputed' THEN RAISE EXCEPTION 'Payment controls this stage'; END IF;
 IF _stage='disputed' AND NOT EXISTS(SELECT 1 FROM public.disputes WHERE transaction_id=d.transaction_id AND status IN ('open','under_review')) THEN RAISE EXCEPTION 'Raise a dispute first'; END IF;
 UPDATE public.deal_requests SET stage=_stage WHERE id=d.id;
END $$;

CREATE FUNCTION public.agent_respond_inspection(_id uuid,_action text,_note text DEFAULT NULL,_date date DEFAULT NULL,_time text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE r public.reservations; agent uuid; buyer uuid;
BEGIN
 SELECT * INTO STRICT r FROM public.reservations WHERE id=_id FOR UPDATE;
 SELECT p.user_id INTO STRICT agent FROM public.profiles p JOIN public.properties q ON q.agent_id=p.id WHERE q.id=r.property_id;
 IF auth.uid() IS NULL OR (agent IS DISTINCT FROM auth.uid() AND NOT public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'Agent authorization required'; END IF;
 IF r.inspection_status IN ('completed','declined','cancelled','no_show') THEN RAISE EXCEPTION 'Inspection is terminal'; END IF;
 IF _action='confirm' THEN UPDATE public.reservations SET inspection_status='confirmed',status='confirmed',agent_note=_note WHERE id=_id;
 ELSIF _action='decline' THEN UPDATE public.reservations SET inspection_status='declined',status='rejected',agent_note=_note WHERE id=_id;
 ELSIF _action='propose' THEN
   IF _date IS NULL OR _date<current_date THEN RAISE EXCEPTION 'Future proposal date required'; END IF;
   UPDATE public.reservations SET inspection_status='reschedule_proposed',proposed_date=_date,proposed_time=_time,agent_note=_note WHERE id=_id;
 ELSIF _action IN ('completed','no_show') AND r.inspection_status='confirmed' THEN
   UPDATE public.reservations SET inspection_status=_action,agent_note=_note WHERE id=_id;
 ELSE RAISE EXCEPTION 'Invalid inspection transition'; END IF;
 SELECT user_id INTO STRICT buyer FROM public.profiles WHERE id=r.buyer_id;
 INSERT INTO public.notifications(user_id,title,message,type,link) VALUES(buyer,'Inspection update',_action,'info','/dashboard/buyer/inspections');
END $$;

CREATE FUNCTION public.buyer_respond_inspection(_id uuid,_action text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE r public.reservations;
BEGIN
 SELECT * INTO STRICT r FROM public.reservations WHERE id=_id FOR UPDATE;
 IF auth.uid() IS NULL OR r.buyer_id IS DISTINCT FROM public.get_my_profile_id() THEN RAISE EXCEPTION 'Buyer authorization required'; END IF;
 IF _action='accept' AND r.inspection_status='reschedule_proposed' THEN
   UPDATE public.reservations SET inspection_status='confirmed',status='confirmed',viewing_date=r.proposed_date,inspection_time=r.proposed_time WHERE id=_id;
 ELSIF _action='cancel' AND r.inspection_status IN ('requested','confirmed','reschedule_proposed') THEN
   UPDATE public.reservations SET inspection_status='cancelled',status='cancelled' WHERE id=_id;
 ELSE RAISE EXCEPTION 'Invalid inspection transition'; END IF;
 INSERT INTO public.notifications(user_id,title,message,type,link)
   SELECT user_id,'Inspection update',_action,'info','/dashboard/agent/inspections' FROM public.profiles WHERE id=r.agent_id;
END $$;

CREATE FUNCTION public.activate_chat(_thread_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
 PERFORM prop_connect_private.assert_admin();
 UPDATE public.chat_threads SET status='active' WHERE id=_thread_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Thread not found'; END IF;
 PERFORM public.log_admin_action('activate_chat',jsonb_build_object('thread_id',_thread_id));
END $$;

CREATE FUNCTION public.get_deal_participants(_deal_id uuid)
RETURNS TABLE(profile_id uuid,user_id uuid,full_name text,avatar_url text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE d public.deal_requests;
BEGIN
 SELECT * INTO STRICT d FROM public.deal_requests WHERE id=_deal_id;
 IF auth.uid() IS NULL OR (auth.uid() NOT IN (d.buyer_id,d.agent_user_id) AND NOT public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'Deal participant authorization required'; END IF;
 RETURN QUERY SELECT p.id,p.user_id,p.full_name,p.avatar_url FROM public.profiles p WHERE p.user_id IN (d.buyer_id,d.agent_user_id);
END $$;

CREATE FUNCTION public.get_referral_summary()
RETURNS TABLE(id uuid,full_name text,profile_type public.profile_type,kyc_verified boolean,created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 RETURN QUERY SELECT p.id,p.full_name,p.profile_type,p.kyc_verified,p.created_at FROM public.profiles p WHERE p.invited_by=public.get_my_profile_id();
END $$;

CREATE FUNCTION public.get_chat_participants(_thread_id uuid)
RETURNS TABLE(id uuid,full_name text,avatar_url text,profile_type public.profile_type)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
 IF NOT prop_connect_private.can_chat(_thread_id) THEN RAISE EXCEPTION 'Thread authorization required'; END IF;
 RETURN QUERY SELECT p.id,p.full_name,p.avatar_url,p.profile_type FROM public.profiles p
 JOIN public.chat_threads t ON p.id IN (t.buyer_id,t.agent_id) WHERE t.id=_thread_id;
END $$;
