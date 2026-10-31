-- Enforce restricted-chat quick questions on the server, including direct API calls.
BEGIN;
CREATE OR REPLACE FUNCTION public.guard_message_update() RETURNS trigger
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
 IF NOT EXISTS (SELECT 1 FROM public.chat_threads WHERE id=NEW.thread_id AND status='active')
    AND NEW.content <> ALL(ARRAY[
      'Is this property still available?', 'What is the final price?',
      'Can I schedule an inspection?', 'Where is the exact location?', 'Is there any discount?'
    ]) THEN
   RAISE EXCEPTION 'Use a quick question until this chat is activated';
 END IF;
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

COMMIT;
