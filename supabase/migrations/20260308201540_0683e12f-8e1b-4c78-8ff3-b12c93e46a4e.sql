
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS buyer_name text,
  ADD COLUMN IF NOT EXISTS buyer_phone text,
  ADD COLUMN IF NOT EXISTS buyer_email text,
  ADD COLUMN IF NOT EXISTS message text,
  ADD COLUMN IF NOT EXISTS viewing_date date;
