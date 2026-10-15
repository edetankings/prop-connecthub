CREATE FUNCTION prop_connect_private.can_list(_profile uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles p JOIN public.subscriptions s ON s.user_id=p.user_id
 WHERE p.id=_profile AND p.profile_type IN ('agent','builder') AND p.kyc_verified
 AND s.status='active' AND s.end_date>now());
$$;

CREATE FUNCTION prop_connect_private.guard_property() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
 IF current_user IN ('postgres','service_role','supabase_admin') THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND (NEW.id IS DISTINCT FROM OLD.id OR NEW.agent_id IS DISTINCT FROM OLD.agent_id
   OR NEW.property_code IS DISTINCT FROM OLD.property_code OR NEW.created_at IS DISTINCT FROM OLD.created_at) THEN
   RAISE EXCEPTION 'Listing identity is immutable';
 END IF;
 IF public.has_role(auth.uid(),'admin') THEN
   IF NEW.status IN ('payment_pending','transaction_in_progress','sold','rented') THEN
     RAISE EXCEPTION 'Financial listing state is controlled by payment RPCs';
   END IF;
   RETURN NEW;
 END IF;
 IF NEW.agent_id IS DISTINCT FROM public.get_my_profile_id()
   OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=NEW.agent_id AND profile_type IN ('agent','builder')) THEN
   RAISE EXCEPTION 'Agent ownership required';
 END IF;
 IF TG_OP='UPDATE' AND OLD.status IN ('payment_pending','transaction_in_progress','sold','rented') THEN
   RAISE EXCEPTION 'Listing is locked by a transaction';
 END IF;
 IF TG_OP='INSERT' AND NEW.is_verified THEN RAISE EXCEPTION 'Approval requires administrator'; END IF;
 IF TG_OP='UPDATE' AND NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN RAISE EXCEPTION 'Approval requires administrator'; END IF;
 IF TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
   IF NEW.status NOT IN ('draft','under_verification') THEN RAISE EXCEPTION 'Submit for review instead of publishing'; END IF;
 END IF;
 IF NEW.status<>'draft' AND NOT prop_connect_private.can_list(NEW.agent_id) THEN
   RAISE EXCEPTION 'Verified agent and active subscription required for submission';
 END IF;
 IF TG_OP='UPDATE' AND OLD.is_verified THEN NEW.is_verified:=false; NEW.status:='under_verification'; END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION prop_connect_private.guard_kyc() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE field text;
BEGIN
 IF TG_OP='UPDATE' AND (NEW.id IS DISTINCT FROM OLD.id OR NEW.user_id IS DISTINCT FROM OLD.user_id
   OR NEW.created_at IS DISTINCT FROM OLD.created_at) THEN RAISE EXCEPTION 'KYC identity is immutable'; END IF;
 IF current_user IN ('postgres','service_role','supabase_admin') OR public.has_role(auth.uid(),'admin') THEN
   IF NEW.kyc_status='verified' AND (TG_OP='INSERT' OR NEW.kyc_status IS DISTINCT FROM OLD.kyc_status) THEN
     IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authenticated reviewer required for KYC approval'; END IF;
     NEW.reviewed_by:=auth.uid(); NEW.reviewed_at:=now();
   END IF;
   RETURN NEW;
 END IF;
 IF NEW.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'KYC ownership required'; END IF;
 IF TG_OP='UPDATE' AND OLD.kyc_status='verified' THEN RAISE EXCEPTION 'Verified submissions require administrator review'; END IF;
 IF NEW.kyc_status<>'pending' THEN RAISE EXCEPTION 'Review fields are protected'; END IF;
 NEW.reviewed_by:=NULL; NEW.reviewed_at:=NULL; NEW.rejection_reason:=NULL;
 FOREACH field IN ARRAY ARRAY['government_id_url','selfie_url','proof_of_address_url'] LOOP
   IF to_jsonb(NEW)->>field IS NOT NULL AND split_part(to_jsonb(NEW)->>field,'/',1) IS DISTINCT FROM auth.uid()::text THEN
     RAISE EXCEPTION 'Private verification files require owned object paths';
   END IF;
 END LOOP;
 SELECT phone_verified INTO NEW.phone_verified FROM public.profiles WHERE user_id=auth.uid();
 RETURN NEW;
END $$;

CREATE FUNCTION public.guard_chat_thread_update() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
 IF TG_OP='INSERT' THEN
   IF NEW.buyer_id IS DISTINCT FROM public.get_my_profile_id() AND NOT public.has_role(auth.uid(),'admin')
     AND current_user NOT IN ('postgres','service_role','supabase_admin') THEN RAISE EXCEPTION 'Invalid chat owner'; END IF;
   IF current_user NOT IN ('postgres','service_role','supabase_admin') THEN NEW.status:='restricted'; END IF;
   IF NOT EXISTS(SELECT 1 FROM public.public_profiles WHERE id=NEW.agent_id) THEN
     RAISE EXCEPTION 'Public agent required'; END IF;
 ELSIF current_user NOT IN ('postgres','service_role','supabase_admin') THEN
   IF (to_jsonb(NEW)-ARRAY['last_message_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['last_message_at']) THEN
     RAISE EXCEPTION 'Only last_message_at may be updated directly'; END IF;
 END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.guard_message_update() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE a jsonb; body text;
BEGIN
 IF TG_OP='UPDATE' THEN
   IF (to_jsonb(NEW)-ARRAY['seen','content']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['seen','content']) THEN
     RAISE EXCEPTION 'Message metadata is immutable'; END IF;
   IF OLD.sender_id IS DISTINCT FROM public.get_my_profile_id() AND NEW.content IS DISTINCT FROM OLD.content THEN
     RAISE EXCEPTION 'Only sender may edit content'; END IF;
   IF NEW.content IS DISTINCT FROM OLD.content THEN RAISE EXCEPTION 'Message editing is disabled pending moderation policy'; END IF;
   RETURN NEW;
 END IF;
 IF NEW.sender_id IS DISTINCT FROM public.get_my_profile_id() THEN RAISE EXCEPTION 'Invalid sender'; END IF;
 NEW.attachment_path:=NULL; NEW.seen:=false; body:=NEW.content;
 IF NEW.content LIKE '[[pcatt]]%' THEN
   a:=substring(NEW.content FROM 10)::jsonb;
   body:=coalesce(a->>'caption',a->>'text','');
   IF a->>'kind' IN ('contact','system','payment') THEN RAISE EXCEPTION 'Reserved attachment kind'; END IF;
   IF a->>'path' IS NOT NULL THEN
     IF split_part(a->>'path','/',1) IS DISTINCT FROM auth.uid()::text THEN RAISE EXCEPTION 'Attachment ownership mismatch'; END IF;
     NEW.attachment_path:=a->>'path';
   END IF;
 END IF;
 -- Conservative contact filter; not a claim of complete DLP coverage.
 IF body ~* '([[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}|[+]?[0-9][0-9 ()-]{8,}[0-9])' THEN NEW.is_blocked:=true; END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.guard_reservation_update() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
 IF current_user IN ('postgres','service_role','supabase_admin') THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' THEN RAISE EXCEPTION 'Use inspection response RPCs'; END IF;
 IF NEW.buyer_id IS DISTINCT FROM public.get_my_profile_id() OR NEW.status<>'pending'
   OR NEW.inspection_status<>'requested' OR NEW.agent_note IS NOT NULL
   OR NEW.proposed_date IS NOT NULL OR NEW.proposed_time IS NOT NULL THEN RAISE EXCEPTION 'Invalid inspection request'; END IF;
 SELECT agent_id INTO NEW.agent_id FROM public.properties WHERE id=NEW.property_id
   AND is_verified AND status IN ('available','for_sale','for_rent');
 IF NEW.agent_id IS NULL OR NEW.agent_id=NEW.buyer_id THEN RAISE EXCEPTION 'Invalid inspection property'; END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION prop_connect_private.guard_verification() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE path text;
BEGIN
 IF current_user IN ('postgres','service_role','supabase_admin') OR public.has_role(auth.uid(),'admin') THEN RETURN NEW; END IF;
 IF NEW.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Verification ownership required'; END IF;
 path:=coalesce(to_jsonb(NEW)->>'document_url',to_jsonb(NEW)->>'file_url');
 IF path IS NOT NULL AND split_part(path,'/',1) IS DISTINCT FROM auth.uid()::text THEN RAISE EXCEPTION 'Owned private object path required'; END IF;
 IF TG_OP='UPDATE' AND (NEW.id IS DISTINCT FROM OLD.id OR NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.created_at IS DISTINCT FROM OLD.created_at) THEN RAISE EXCEPTION 'Verification identity immutable'; END IF;
 IF TG_TABLE_NAME='verification_steps' THEN
   IF NEW.status NOT IN ('not_started','pending') OR NEW.rejection_reason IS NOT NULL
     OR (TG_OP='UPDATE' AND OLD.status='approved') THEN RAISE EXCEPTION 'Verification decision protected'; END IF;
 ELSE
   IF NEW.status<>'pending' OR NEW.reviewed_by IS NOT NULL THEN RAISE EXCEPTION 'Document review protected'; END IF;
 END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.notify_kyc_status_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
 IF NEW.kyc_verified IS DISTINCT FROM OLD.kyc_verified THEN
   IF NEW.kyc_verified AND NOT OLD.kyc_trust_awarded THEN
     UPDATE public.profiles SET trust_score=least(trust_score+35,100),kyc_trust_awarded=true WHERE id=NEW.id;
   END IF;
   IF pg_trigger_depth()=1 THEN
     INSERT INTO public.notifications(user_id,title,message,type,link)
       VALUES(NEW.user_id,'Verification update',CASE WHEN NEW.kyc_verified THEN 'Identity verified.' ELSE 'Verification requires review.' END,'info','/settings');
   END IF;
 END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.notify_kyc_verification_status() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
 IF NEW.kyc_status IS DISTINCT FROM OLD.kyc_status THEN
   UPDATE public.profiles SET kyc_verified=(NEW.kyc_status='verified') WHERE user_id=NEW.user_id;
   INSERT INTO public.notifications(user_id,title,message,type,link)
     VALUES(NEW.user_id,'KYC review',CASE WHEN NEW.kyc_status='verified' THEN 'Identity verified.' ELSE coalesce(NEW.rejection_reason,'Submission requires review.') END,'info','/verification');
 END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.notify_property_status_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
 IF NEW.status IS DISTINCT FROM OLD.status AND OLD.status='under_verification' THEN
   INSERT INTO public.notifications(user_id,title,message,type,link)
     SELECT user_id,'Listing review','Your listing status is now '||NEW.status::text,'info','/property/'||NEW.id FROM public.profiles WHERE id=NEW.agent_id;
 END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION public.notify_new_announcement() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
 INSERT INTO public.notifications(user_id,title,message,type,link)
   SELECT user_id,'New announcement',NEW.title,'info','/announcements' FROM public.profiles WHERE is_visible;
 RETURN NEW;
END $$;

CREATE FUNCTION public.notify_new_inspection() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
 INSERT INTO public.notifications(user_id,title,message,type,link)
   SELECT user_id,'Inspection requested','A buyer requested an inspection.','info','/dashboard/agent/inspections' FROM public.profiles WHERE id=NEW.agent_id;
 RETURN NEW;
END $$;
