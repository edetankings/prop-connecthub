-- Synthetic accounts and all messages roll back; no customer messages are read.
BEGIN;
DO $$
DECLARE
 buyer_user uuid := gen_random_uuid(); agent_user uuid := gen_random_uuid(); outsider_user uuid := gen_random_uuid();
 buyer_profile uuid; agent_profile uuid; outsider_profile uuid; thread uuid; message uuid; n integer;
BEGIN
 INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 (buyer_user,buyer_user||'@example.invalid','{"full_name":"Chat rollback buyer","profile_type":"buyer"}'),
 (agent_user,agent_user||'@example.invalid','{"full_name":"Chat rollback agent","profile_type":"agent"}'),
 (outsider_user,outsider_user||'@example.invalid','{"full_name":"Chat rollback outsider","profile_type":"buyer"}');
 SELECT id INTO STRICT buyer_profile FROM public.profiles WHERE user_id=buyer_user;
 SELECT id INTO STRICT agent_profile FROM public.profiles WHERE user_id=agent_user;
 SELECT id INTO STRICT outsider_profile FROM public.profiles WHERE user_id=outsider_user;
 UPDATE public.profiles SET kyc_verified=true WHERE id=agent_profile;
 INSERT INTO public.chat_threads(buyer_id,agent_id) VALUES(buyer_profile,agent_profile) RETURNING id INTO thread;
 PERFORM set_config('request.jwt.claim.sub',buyer_user::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',buyer_user,'role','authenticated')::text,true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 INSERT INTO public.messages(thread_id,sender_id,content) VALUES(thread,buyer_profile,'Is this property still available?') RETURNING id INTO message;
 BEGIN
   INSERT INTO public.messages(thread_id,sender_id,content) VALUES(thread,buyer_profile,'Unrestricted text must fail');
   RAISE EXCEPTION 'Restricted chat incorrectly allowed free text';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM <> 'Use a quick question until this chat is activated' THEN RAISE; END IF;
 END;
 BEGIN
   INSERT INTO public.messages(thread_id,sender_id,content) VALUES(thread,buyer_profile,'[[pcatt]]{"kind":"location","lat":6,"lng":3}');
   RAISE EXCEPTION 'Restricted chat incorrectly allowed attachment';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM <> 'Use a quick question until this chat is activated' THEN RAISE; END IF;
 END;
 PERFORM set_config('request.jwt.claim.sub',outsider_user::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',outsider_user,'role','authenticated')::text,true);
 SELECT count(*) INTO n FROM public.messages WHERE thread_id=thread;
 IF n<>0 THEN RAISE EXCEPTION 'Outsider read another account messages'; END IF;
 SELECT count(*) INTO n FROM public.chat_threads WHERE id=thread;
 IF n<>0 THEN RAISE EXCEPTION 'Outsider read another account thread'; END IF;
 BEGIN
   INSERT INTO public.messages(thread_id,sender_id,content) VALUES(thread,outsider_profile,'Is this property still available?');
   RAISE EXCEPTION 'Outsider unexpectedly sent message';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 EXECUTE 'RESET ROLE';
 UPDATE public.chat_threads SET status='active' WHERE id=thread;
 PERFORM set_config('request.jwt.claim.sub',buyer_user::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',buyer_user,'role','authenticated')::text,true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 INSERT INTO public.messages(thread_id,sender_id,content) VALUES(thread,buyer_profile,'Ordinary property question');
 BEGIN
   INSERT INTO public.messages(thread_id,sender_id,content) VALUES(thread,agent_profile,'Forged sender');
   RAISE EXCEPTION 'Forged sender accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 WHEN raise_exception THEN IF SQLERRM <> 'Invalid sender' THEN RAISE; END IF;
 END;
 EXECUTE 'RESET ROLE';
END $$;
ROLLBACK;
