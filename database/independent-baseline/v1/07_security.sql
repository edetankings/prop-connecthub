CREATE FUNCTION prop_connect_private.can_chat(_thread uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
 SELECT auth.uid() IS NOT NULL AND (public.has_role(auth.uid(),'admin') OR EXISTS(
 SELECT 1 FROM public.chat_threads t JOIN public.profiles p ON p.user_id=auth.uid()
 WHERE t.id=_thread AND p.id IN (t.buyer_id,t.agent_id)));
$$;
CREATE FUNCTION prop_connect_private.can_read_document(_property uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
 SELECT auth.uid() IS NOT NULL AND (public.has_role(auth.uid(),'admin')
 OR EXISTS(SELECT 1 FROM public.properties WHERE id=_property AND agent_id=public.get_my_profile_id())
 OR EXISTS(SELECT 1 FROM public.deal_requests WHERE property_id=_property AND buyer_id=auth.uid() AND status='accepted'));
$$;
CREATE FUNCTION prop_connect_private.can_read_chat_file(_path text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
 SELECT auth.uid() IS NOT NULL AND (public.has_role(auth.uid(),'admin') OR split_part(_path,'/',1)=auth.uid()::text
 OR EXISTS(SELECT 1 FROM public.messages m WHERE m.attachment_path=_path AND NOT m.is_blocked AND prop_connect_private.can_chat(m.thread_id)));
$$;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC,anon,authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC,anon,authenticated;
REVOKE ALL ON SCHEMA prop_connect_private FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA prop_connect_private FROM PUBLIC,anon,authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC,anon,authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC,anon,authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA prop_connect_private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC,anon,authenticated;
REVOKE CREATE ON SCHEMA public FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
-- Schema usage permits these narrowly granted helpers; keep this schema out of Data API exposed schemas.
GRANT USAGE ON SCHEMA prop_connect_private TO anon,authenticated;
GRANT EXECUTE ON FUNCTION prop_connect_private.public_agent_rows() TO anon,authenticated;
GRANT EXECUTE ON FUNCTION prop_connect_private.can_chat(uuid),prop_connect_private.can_list(uuid),
 prop_connect_private.can_read_document(uuid),prop_connect_private.can_read_chat_file(text) TO authenticated;
GRANT SELECT ON public.public_profiles TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid,public.app_role) TO anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_my_profile_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_stats() TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.touch_last_login(),public.log_admin_action(text,jsonb),
 public.get_company_payment_details(),public.request_deal(uuid,text),public.accept_deal(uuid),
 public.decline_deal(uuid,text),public.initiate_secure_payment(uuid),public.submit_payment_proof(uuid,text),
 public.approve_secure_payment(uuid,text),public.reject_secure_payment(uuid,text),public.release_secure_payment(uuid),
 public.refund_secure_payment(uuid,text),public.expire_stale_transactions(),public.raise_dispute(uuid,text),
 public.resolve_dispute(uuid,text,text),public.request_withdrawal(bigint,text,text,text),
 public.approve_withdrawal(uuid,text),public.reject_withdrawal(uuid,text),public.activate_subscription(uuid,timestamptz,text),
 public.advance_deal_stage(uuid,text),public.agent_respond_inspection(uuid,text,text,date,text),
 public.buyer_respond_inspection(uuid,text),public.activate_chat(uuid),public.get_deal_participants(uuid),
 public.get_referral_summary(),public.get_chat_participants(uuid),public.reject_subscription_request(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.expire_stale_transactions() TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Internal/trigger functions intentionally have no direct client EXECUTE grant.
-- All application tables are protected before the transaction commits.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.profiles TO authenticated;
CREATE POLICY admin_read ON public.profiles FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.user_roles TO authenticated;
CREATE POLICY admin_read ON public.user_roles FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.properties TO authenticated;
CREATE POLICY admin_read ON public.properties FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.chat_threads TO authenticated;
CREATE POLICY admin_read ON public.chat_threads FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.messages TO authenticated;
CREATE POLICY admin_read ON public.messages FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.reservations TO authenticated;
CREATE POLICY admin_read ON public.reservations FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.ratings TO authenticated;
CREATE POLICY admin_read ON public.ratings FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.verification_documents TO authenticated;
CREATE POLICY admin_read ON public.verification_documents FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.announcements TO authenticated;
CREATE POLICY admin_read ON public.announcements FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.disputes TO authenticated;
CREATE POLICY admin_read ON public.disputes FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.audit_logs TO authenticated;
CREATE POLICY admin_read ON public.audit_logs FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.wallets TO authenticated;
CREATE POLICY admin_read ON public.wallets FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.transactions TO authenticated;
CREATE POLICY admin_read ON public.transactions FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.support_tickets TO authenticated;
CREATE POLICY admin_read ON public.support_tickets FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.user_preferences TO authenticated;
CREATE POLICY admin_read ON public.user_preferences FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
ALTER TABLE public.verification_steps ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.verification_steps TO authenticated;
CREATE POLICY admin_read ON public.verification_steps FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.notifications TO authenticated;
CREATE POLICY admin_read ON public.notifications FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
ALTER TABLE public.phone_otp_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.kyc_verifications TO authenticated;
CREATE POLICY admin_read ON public.kyc_verifications FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
ALTER TABLE public.earnings ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.earnings TO authenticated;
CREATE POLICY admin_read ON public.earnings FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
ALTER TABLE public.subscription_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.subscription_requests TO authenticated;
CREATE POLICY admin_read ON public.subscription_requests FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.subscriptions TO authenticated;
CREATE POLICY admin_read ON public.subscriptions FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.withdrawals TO authenticated;
CREATE POLICY admin_read ON public.withdrawals FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
ALTER TABLE public.company_wallet ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.company_wallet TO authenticated;
CREATE POLICY admin_read ON public.company_wallet FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
ALTER TABLE public.escrow_holds ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.escrow_holds TO authenticated;
CREATE POLICY admin_read ON public.escrow_holds FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
ALTER TABLE public.property_documents ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.property_documents TO authenticated;
CREATE POLICY admin_read ON public.property_documents FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
ALTER TABLE public.commission_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.commission_settings TO authenticated;
CREATE POLICY admin_read ON public.commission_settings FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.platform_settings TO authenticated;
CREATE POLICY admin_read ON public.platform_settings FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
ALTER TABLE public.deal_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.deal_requests TO authenticated;
CREATE POLICY admin_read ON public.deal_requests FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
ALTER TABLE public.deal_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.deal_events TO authenticated;
CREATE POLICY admin_read ON public.deal_events FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE POLICY owner_read ON public.profiles FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY owner_read ON public.user_roles FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY owner_read ON public.wallets FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY owner_read ON public.user_preferences FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY owner_read ON public.verification_documents FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY owner_read ON public.verification_steps FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY owner_read ON public.kyc_verifications FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY owner_read ON public.earnings FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY owner_read ON public.subscriptions FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY owner_read ON public.subscription_requests FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY owner_read ON public.withdrawals FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY owner_read ON public.support_tickets FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY owner_read ON public.notifications FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY party_read ON public.transactions FOR SELECT TO authenticated USING(buyer_id=auth.uid() OR seller_id=auth.uid());
CREATE POLICY party_read ON public.disputes FOR SELECT TO authenticated USING(reporter_id=public.get_my_profile_id() OR reported_id=public.get_my_profile_id());
CREATE POLICY party_read ON public.deal_requests FOR SELECT TO authenticated USING(buyer_id=auth.uid() OR agent_user_id=auth.uid());
CREATE POLICY party_read ON public.deal_events FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.deal_requests d WHERE d.id=deal_id AND auth.uid() IN (d.buyer_id,d.agent_user_id)));
CREATE POLICY owner_read ON public.escrow_holds FOR SELECT TO authenticated USING(intended_user_id=auth.uid());
GRANT SELECT ON public.announcements TO anon;
CREATE POLICY public_read ON public.announcements FOR SELECT TO anon,authenticated USING(true);
GRANT SELECT ON public.ratings TO anon;
CREATE POLICY public_read ON public.ratings FOR SELECT TO anon,authenticated USING(true);
GRANT SELECT ON public.properties TO anon;
CREATE POLICY public_listings ON public.properties FOR SELECT TO anon,authenticated USING(is_verified AND status IN ('available','for_sale','for_rent'));
CREATE POLICY owner_read ON public.properties FOR SELECT TO authenticated USING(agent_id=public.get_my_profile_id());
CREATE POLICY owner_update ON public.profiles FOR UPDATE TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
CREATE POLICY admin_update ON public.profiles FOR UPDATE TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
GRANT UPDATE ON public.profiles TO authenticated;
CREATE POLICY admin_insert ON public.user_roles FOR INSERT TO authenticated WITH CHECK(public.has_role(auth.uid(),'admin') AND user_id<>auth.uid());
CREATE POLICY admin_delete ON public.user_roles FOR DELETE TO authenticated USING(public.has_role(auth.uid(),'admin') AND user_id<>auth.uid());
GRANT INSERT,DELETE ON public.user_roles TO authenticated;
CREATE POLICY agent_insert ON public.properties FOR INSERT TO authenticated WITH CHECK(agent_id=public.get_my_profile_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY agent_update ON public.properties FOR UPDATE TO authenticated USING(agent_id=public.get_my_profile_id() OR public.has_role(auth.uid(),'admin')) WITH CHECK(agent_id=public.get_my_profile_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY agent_delete ON public.properties FOR DELETE TO authenticated USING((agent_id=public.get_my_profile_id() AND status='draft') OR public.has_role(auth.uid(),'admin'));
GRANT INSERT,UPDATE,DELETE ON public.properties TO authenticated;
CREATE POLICY admin_update ON public.commission_settings FOR UPDATE TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
GRANT UPDATE ON public.commission_settings TO authenticated;
CREATE POLICY admin_update ON public.platform_settings FOR UPDATE TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
GRANT UPDATE ON public.platform_settings TO authenticated;
CREATE POLICY owner_insert ON public.user_preferences FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid());
CREATE POLICY owner_update ON public.user_preferences FOR UPDATE TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
GRANT INSERT,UPDATE ON public.user_preferences TO authenticated;
CREATE POLICY owner_insert ON public.verification_documents FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid());
CREATE POLICY owner_update ON public.verification_documents FOR UPDATE TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
CREATE POLICY admin_update ON public.verification_documents FOR UPDATE TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
GRANT INSERT,UPDATE ON public.verification_documents TO authenticated;
CREATE POLICY owner_insert ON public.verification_steps FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid());
CREATE POLICY owner_update ON public.verification_steps FOR UPDATE TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
CREATE POLICY admin_update ON public.verification_steps FOR UPDATE TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
GRANT INSERT,UPDATE ON public.verification_steps TO authenticated;
CREATE POLICY owner_insert ON public.kyc_verifications FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid());
CREATE POLICY owner_update ON public.kyc_verifications FOR UPDATE TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
CREATE POLICY admin_update ON public.kyc_verifications FOR UPDATE TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
GRANT INSERT,UPDATE ON public.kyc_verifications TO authenticated;
CREATE POLICY owner_insert ON public.subscription_requests FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid() AND status='pending' AND reviewed_by IS NULL AND reviewed_at IS NULL AND split_part(screenshot_url,'/',1)=auth.uid()::text);
GRANT INSERT(user_id,screenshot_url,note) ON public.subscription_requests TO authenticated;
CREATE POLICY owner_insert ON public.notifications FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY owner_update ON public.notifications FOR UPDATE TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
GRANT INSERT,UPDATE(is_read) ON public.notifications TO authenticated;
CREATE POLICY owner_insert ON public.support_tickets FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid() AND status='open');
CREATE POLICY admin_update ON public.support_tickets FOR UPDATE TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE POLICY admin_delete ON public.support_tickets FOR DELETE TO authenticated USING(public.has_role(auth.uid(),'admin'));
GRANT INSERT(user_id,subject,message,name,email),UPDATE(status),DELETE ON public.support_tickets TO authenticated;
CREATE POLICY author_insert ON public.announcements FOR INSERT TO authenticated WITH CHECK(public.has_role(auth.uid(),'admin') OR (author_id=public.get_my_profile_id() AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=author_id AND p.profile_type='agent' AND p.kyc_verified)));
CREATE POLICY author_update ON public.announcements FOR UPDATE TO authenticated USING(public.has_role(auth.uid(),'admin') OR (author_id=public.get_my_profile_id() AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=author_id AND p.profile_type='agent' AND p.kyc_verified))) WITH CHECK(public.has_role(auth.uid(),'admin') OR (author_id=public.get_my_profile_id() AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=author_id AND p.profile_type='agent' AND p.kyc_verified)));
CREATE POLICY author_delete ON public.announcements FOR DELETE TO authenticated USING(public.has_role(auth.uid(),'admin') OR (author_id=public.get_my_profile_id() AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=author_id AND p.profile_type='agent' AND p.kyc_verified)));
GRANT INSERT,UPDATE,DELETE ON public.announcements TO authenticated;
CREATE POLICY owner_insert ON public.ratings FOR INSERT TO authenticated WITH CHECK(reviewer_id=public.get_my_profile_id() AND agent_id<>reviewer_id AND EXISTS(SELECT 1 FROM public.public_profiles p WHERE p.id=agent_id));
GRANT INSERT ON public.ratings TO authenticated;
CREATE POLICY party_read ON public.chat_threads FOR SELECT TO authenticated USING(prop_connect_private.can_chat(id));
CREATE POLICY owner_insert ON public.chat_threads FOR INSERT TO authenticated WITH CHECK(buyer_id=public.get_my_profile_id());
CREATE POLICY party_update ON public.chat_threads FOR UPDATE TO authenticated USING(prop_connect_private.can_chat(id)) WITH CHECK(prop_connect_private.can_chat(id));
GRANT INSERT,UPDATE(last_message_at) ON public.chat_threads TO authenticated;
CREATE POLICY party_read ON public.messages FOR SELECT TO authenticated USING(prop_connect_private.can_chat(thread_id) AND (NOT is_blocked OR sender_id=public.get_my_profile_id()));
CREATE POLICY sender_insert ON public.messages FOR INSERT TO authenticated WITH CHECK(prop_connect_private.can_chat(thread_id) AND sender_id=public.get_my_profile_id());
CREATE POLICY party_update ON public.messages FOR UPDATE TO authenticated USING(prop_connect_private.can_chat(thread_id)) WITH CHECK(prop_connect_private.can_chat(thread_id));
GRANT INSERT,UPDATE(seen) ON public.messages TO authenticated;
CREATE POLICY party_read ON public.reservations FOR SELECT TO authenticated USING(buyer_id=public.get_my_profile_id() OR agent_id=public.get_my_profile_id());
CREATE POLICY buyer_insert ON public.reservations FOR INSERT TO authenticated WITH CHECK(buyer_id=public.get_my_profile_id());
GRANT INSERT ON public.reservations TO authenticated;
CREATE POLICY party_read ON public.property_documents FOR SELECT TO authenticated USING(prop_connect_private.can_read_document(property_id));
CREATE POLICY owner_insert ON public.property_documents FOR INSERT TO authenticated WITH CHECK((public.has_role(auth.uid(),'admin')) OR (agent_id=public.get_my_profile_id() AND split_part(file_url,'/',1)=auth.uid()::text AND EXISTS(SELECT 1 FROM public.properties p WHERE p.id=property_id AND p.agent_id=public.get_my_profile_id())));
CREATE POLICY owner_update ON public.property_documents FOR UPDATE TO authenticated USING((public.has_role(auth.uid(),'admin')) OR (agent_id=public.get_my_profile_id() AND split_part(file_url,'/',1)=auth.uid()::text AND EXISTS(SELECT 1 FROM public.properties p WHERE p.id=property_id AND p.agent_id=public.get_my_profile_id()))) WITH CHECK((public.has_role(auth.uid(),'admin')) OR (agent_id=public.get_my_profile_id() AND split_part(file_url,'/',1)=auth.uid()::text AND EXISTS(SELECT 1 FROM public.properties p WHERE p.id=property_id AND p.agent_id=public.get_my_profile_id())));
CREATE POLICY owner_delete ON public.property_documents FOR DELETE TO authenticated USING((public.has_role(auth.uid(),'admin')) OR (agent_id=public.get_my_profile_id() AND split_part(file_url,'/',1)=auth.uid()::text AND EXISTS(SELECT 1 FROM public.properties p WHERE p.id=property_id AND p.agent_id=public.get_my_profile_id())));
GRANT INSERT,UPDATE,DELETE ON public.property_documents TO authenticated;
