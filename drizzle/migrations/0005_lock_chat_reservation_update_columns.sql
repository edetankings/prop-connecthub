-- 1. chat_threads: participants may only touch last_message_at
CREATE OR REPLACE FUNCTION public.guard_chat_thread_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.id <> OLD.id
     OR NEW.buyer_id IS DISTINCT FROM OLD.buyer_id
     OR NEW.agent_id IS DISTINCT FROM OLD.agent_id
     OR NEW.property_id IS DISTINCT FROM OLD.property_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only last_message_at can be updated on a chat thread';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_chat_thread_update ON public.chat_threads;
CREATE TRIGGER guard_chat_thread_update
BEFORE UPDATE ON public.chat_threads
FOR EACH ROW EXECUTE FUNCTION public.guard_chat_thread_update();

-- 2. messages: only the sender may edit content; other participants may only mark as seen
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;

CREATE POLICY "Senders can update own messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (sender_id = get_my_profile_id())
WITH CHECK (sender_id = get_my_profile_id());

CREATE POLICY "Recipients can mark messages as seen"
ON public.messages
FOR UPDATE
TO authenticated
USING (
  sender_id <> get_my_profile_id()
  AND thread_id IN (
    SELECT id FROM public.chat_threads
    WHERE buyer_id = get_my_profile_id() OR agent_id = get_my_profile_id()
  )
)
WITH CHECK (
  sender_id <> get_my_profile_id()
  AND thread_id IN (
    SELECT id FROM public.chat_threads
    WHERE buyer_id = get_my_profile_id() OR agent_id = get_my_profile_id()
  )
);

CREATE OR REPLACE FUNCTION public.guard_message_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- immutable for everyone (non-admin)
  IF NEW.id <> OLD.id
     OR NEW.thread_id IS DISTINCT FROM OLD.thread_id
     OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Message identity fields cannot be changed';
  END IF;

  -- non-senders may only flip the seen flag
  IF OLD.sender_id IS DISTINCT FROM get_my_profile_id() THEN
    IF NEW.content IS DISTINCT FROM OLD.content
       OR NEW.is_blocked IS DISTINCT FROM OLD.is_blocked THEN
      RAISE EXCEPTION 'Only the sender can modify a message';
    END IF;
  ELSE
    -- senders cannot self-clear moderation flags
    IF NEW.is_blocked IS DISTINCT FROM OLD.is_blocked THEN
      RAISE EXCEPTION 'Moderation flags cannot be changed';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_message_update ON public.messages;
CREATE TRIGGER guard_message_update
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.guard_message_update();

-- 3. reservations: parties cannot reassign the reservation
CREATE OR REPLACE FUNCTION public.guard_reservation_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.id <> OLD.id
     OR NEW.buyer_id IS DISTINCT FROM OLD.buyer_id
     OR NEW.agent_id IS DISTINCT FROM OLD.agent_id
     OR NEW.property_id IS DISTINCT FROM OLD.property_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Reservation parties and property cannot be reassigned';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_reservation_update ON public.reservations;
CREATE TRIGGER guard_reservation_update
BEFORE UPDATE ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.guard_reservation_update();