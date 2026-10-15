-- Configuration only: no accounts, roles, properties, subscriptions, or financial events.
INSERT INTO public.company_wallet(balance,total_earned) VALUES(0,0);
INSERT INTO public.commission_settings(sales_percent,rental_percent,reservation_flat) VALUES(1.00,5.00,5000);
INSERT INTO public.platform_settings(company_account_name,company_account_number,company_bank_name)
VALUES(NULL,NULL,NULL);
INSERT INTO prop_connect_private.installation_history(revision,source_history_sha256,notes)
VALUES('prop-connect-independent-v1','e0bbc1b6d984777cc160e77fb4d23fc3a31a05956457d9310aefe373d469202c','Historical files preserved as provenance, not marked executed. Financial features locked pending owner decisions.');
