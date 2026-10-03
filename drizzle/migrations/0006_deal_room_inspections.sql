CREATE SEQUENCE IF NOT EXISTS public.deal_number_seq START 1;
GRANT USAGE ON SEQUENCE public.deal_number_seq TO authenticated, service_role;

ALTER TABLE public.deal_requests
  ADD COLUMN IF NOT EXISTS deal_number text UNIQUE,
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'pending_agent';

UPDATE public.deal_requests SET deal_number = 'PC-' || to_char(created_at,'YYYY') || '-' || lpad(nextval('public.deal_number_seq')::text,6,'0') WHERE deal_number IS NULL;
UPDATE public.deal_requests SET stage = CASE status WHEN 'pending' THEN 'pending_agent' WHEN 'accepted' THEN 'payment_pending' ELSE status END;

CREATE OR REPLACE FUNCTION public.assign_deal_number() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.deal_number IS NULL THEN
    NEW.deal_number := 'PC-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.deal_number_seq')::text,6,'0');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_assign_deal_number ON public.deal_requests;
CREATE TRIGGER trg_assign_deal_number BEFORE INSERT ON public.deal_requests FOR EACH ROW EXECUTE FUNCTION public.assign_deal_number();

CREATE UNIQUE INDEX IF NOT EXISTS deal_requests_one_pending_per_buyer ON public.deal_requests(buyer_id, property_id) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.deal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deal_requests(id) ON DELETE CASCADE,
  actor_id uuid,
  event text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.deal_events TO authenticated;
GRANT ALL ON public.deal_events TO service_role;
ALTER TABLE public.deal_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deal parties and admins read events" ON public.deal_events FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.deal_requests d WHERE d.id = deal_id AND (d.buyer_id = auth.uid() OR d.agent_user_id = auth.uid())) OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.log_deal_status() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.deal_events(deal_id, actor_id, event, details) VALUES (NEW.id, auth.uid(), 'requested', NEW.buyer_message);
    INSERT INTO public.notifications(user_id,title,message,type,link) VALUES (NEW.agent_user_id,'New deal request','A buyer requested a deal on ' || COALESCE(NEW.property_code,'your property') || '.','info','/dashboard/agent/deals');
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.stage := CASE NEW.status WHEN 'accepted' THEN 'payment_pending' WHEN 'pending' THEN 'pending_agent' ELSE NEW.status END;
    INSERT INTO public.deal_events(deal_id, actor_id, event, details) VALUES (NEW.id, auth.uid(), NEW.status, NEW.decline_reason);
  ELSIF NEW.stage IS DISTINCT FROM OLD.stage THEN
    INSERT INTO public.deal_events(deal_id, actor_id, event) VALUES (NEW.id, auth.uid(), 'stage:' || NEW.stage);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_log_deal_ins ON public.deal_requests;
CREATE TRIGGER trg_log_deal_ins AFTER INSERT ON public.deal_requests FOR EACH ROW EXECUTE FUNCTION public.log_deal_status();
DROP TRIGGER IF EXISTS trg_log_deal_upd ON public.deal_requests;
CREATE TRIGGER trg_log_deal_upd BEFORE UPDATE ON public.deal_requests FOR EACH ROW EXECUTE FUNCTION public.log_deal_status();

-- Sync deal stage with payment status
CREATE OR REPLACE FUNCTION public.sync_deal_stage_from_tx() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s text;
BEGIN
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    s := CASE NEW.payment_status::text
      WHEN 'pending_payment' THEN 'payment_pending'
      WHEN 'under_review' THEN 'payment_under_review'
      WHEN 'secured' THEN 'payment_confirmed'
      WHEN 'released' THEN 'completed'
      WHEN 'refunded' THEN 'cancelled'
      WHEN 'expired' THEN 'cancelled'
      WHEN 'rejected' THEN 'payment_pending'
      ELSE NULL END;
    IF s IS NOT NULL THEN
      UPDATE public.deal_requests SET stage = s, updated_at = now() WHERE transaction_id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_sync_deal_stage ON public.transactions;
CREATE TRIGGER trg_sync_deal_stage AFTER UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.sync_deal_stage_from_tx();

CREATE OR REPLACE FUNCTION public.advance_deal_stage(_deal_id uuid, _stage text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _stage NOT IN ('inspection','documents','payment_pending','disputed') THEN RAISE EXCEPTION 'Invalid stage'; END IF;
  SELECT * INTO d FROM public.deal_requests WHERE id = _deal_id FOR UPDATE;
  IF d IS NULL THEN RAISE EXCEPTION 'Deal not found'; END IF;
  IF d.agent_user_id <> auth.uid() AND d.buyer_id <> auth.uid() AND NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF d.status <> 'accepted' THEN RAISE EXCEPTION 'Deal is not active'; END IF;
  IF d.stage IN ('payment_under_review','payment_confirmed','completed') AND _stage <> 'disputed' THEN RAISE EXCEPTION 'Deal stage is controlled by payment'; END IF;
  UPDATE public.deal_requests SET stage = _stage, updated_at = now() WHERE id = _deal_id;
  INSERT INTO public.notifications(user_id,title,message,type,link)
  VALUES (CASE WHEN auth.uid() = d.buyer_id THEN d.agent_user_id ELSE d.buyer_id END, 'Deal updated', 'Deal ' || d.deal_number || ' moved to ' || replace(_stage,'_',' ') || '.', 'info', '/deal/' || d.id);
END $$;
REVOKE ALL ON FUNCTION public.advance_deal_stage(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.advance_deal_stage(uuid,text) TO authenticated;

-- Inspections
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS inspection_status text NOT NULL DEFAULT 'requested',
  ADD COLUMN IF NOT EXISTS inspection_time text,
  ADD COLUMN IF NOT EXISTS proposed_date date,
  ADD COLUMN IF NOT EXISTS proposed_time text,
  ADD COLUMN IF NOT EXISTS agent_note text;
UPDATE public.reservations SET inspection_status = CASE status::text WHEN 'confirmed' THEN 'confirmed' WHEN 'rejected' THEN 'declined' WHEN 'cancelled' THEN 'cancelled' ELSE 'requested' END;

CREATE OR REPLACE FUNCTION public.notify_new_inspection() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE agent_uid uuid;
BEGIN
  SELECT pr.user_id INTO agent_uid FROM public.properties p JOIN public.profiles pr ON pr.id = p.agent_id WHERE p.id = NEW.property_id;
  IF agent_uid IS NOT NULL THEN
    INSERT INTO public.notifications(user_id,title,message,type,link) VALUES (agent_uid,'New inspection request','A buyer requested an inspection' || COALESCE(' on ' || NEW.viewing_date::text,'') || '.','info','/dashboard/agent/inspections');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_new_inspection ON public.reservations;
CREATE TRIGGER trg_notify_new_inspection AFTER INSERT ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.notify_new_inspection();

CREATE OR REPLACE FUNCTION public.agent_respond_inspection(_id uuid, _action text, _note text DEFAULT NULL, _date date DEFAULT NULL, _time text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r RECORD; agent_uid uuid; buyer_uid uuid; title text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO r FROM public.reservations WHERE id = _id FOR UPDATE;
  IF r IS NULL THEN RAISE EXCEPTION 'Inspection not found'; END IF;
  SELECT pr.user_id, p.title INTO agent_uid, title FROM public.properties p JOIN public.profiles pr ON pr.id = p.agent_id WHERE p.id = r.property_id;
  IF agent_uid <> auth.uid() AND NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT user_id INTO buyer_uid FROM public.profiles WHERE id = r.buyer_id;
  IF _action = 'confirm' THEN
    UPDATE public.reservations SET inspection_status='confirmed', status='confirmed', agent_note=_note, updated_at=now() WHERE id=_id;
  ELSIF _action = 'decline' THEN
    UPDATE public.reservations SET inspection_status='declined', status='rejected', agent_note=_note, updated_at=now() WHERE id=_id;
  ELSIF _action = 'propose' THEN
    IF _date IS NULL THEN RAISE EXCEPTION 'Proposed date required'; END IF;
    UPDATE public.reservations SET inspection_status='reschedule_proposed', proposed_date=_date, proposed_time=_time, agent_note=_note, updated_at=now() WHERE id=_id;
  ELSIF _action IN ('completed','no_show') THEN
    UPDATE public.reservations SET inspection_status=_action, updated_at=now() WHERE id=_id;
  ELSE RAISE EXCEPTION 'Invalid action'; END IF;
  IF buyer_uid IS NOT NULL THEN
    INSERT INTO public.notifications(user_id,title,message,type,link) VALUES (buyer_uid,'Inspection update','Your inspection for "' || COALESCE(title,'property') || '" is now ' || replace(CASE _action WHEN 'confirm' THEN 'confirmed' WHEN 'decline' THEN 'declined' WHEN 'propose' THEN 'reschedule proposed' ELSE _action END,'_',' ') || '.','info','/dashboard/buyer/inspections');
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.agent_respond_inspection(uuid,text,text,date,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.agent_respond_inspection(uuid,text,text,date,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.buyer_respond_inspection(_id uuid, _action text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r RECORD; agent_uid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO r FROM public.reservations WHERE id = _id FOR UPDATE;
  IF r IS NULL OR r.buyer_id <> public.get_my_profile_id() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _action = 'accept' THEN
    IF r.inspection_status <> 'reschedule_proposed' THEN RAISE EXCEPTION 'No proposal to accept'; END IF;
    UPDATE public.reservations SET inspection_status='confirmed', status='confirmed', viewing_date=r.proposed_date, inspection_time=r.proposed_time, updated_at=now() WHERE id=_id;
  ELSIF _action = 'cancel' THEN
    UPDATE public.reservations SET inspection_status='cancelled', status='cancelled', updated_at=now() WHERE id=_id;
  ELSE RAISE EXCEPTION 'Invalid action'; END IF;
  SELECT pr.user_id INTO agent_uid FROM public.properties p JOIN public.profiles pr ON pr.id=p.agent_id WHERE p.id=r.property_id;
  IF agent_uid IS NOT NULL THEN
    INSERT INTO public.notifications(user_id,title,message,type,link) VALUES (agent_uid,'Inspection update','A buyer ' || CASE _action WHEN 'accept' THEN 'accepted your proposed time' ELSE 'cancelled an inspection' END || '.','info','/dashboard/agent/inspections');
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.buyer_respond_inspection(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buyer_respond_inspection(uuid,text) TO authenticated;