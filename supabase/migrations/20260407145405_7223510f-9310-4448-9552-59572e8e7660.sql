
-- Add referral columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id);

-- Create earnings table
CREATE TABLE public.earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount BIGINT NOT NULL DEFAULT 0,
  type TEXT NOT NULL CHECK (type IN ('referral', 'rent_reward', 'sale_reward')),
  description TEXT,
  transaction_id UUID REFERENCES public.transactions(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(transaction_id, user_id)
);

ALTER TABLE public.earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own earnings" ON public.earnings
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all earnings" ON public.earnings
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert earnings" ON public.earnings
FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update earnings" ON public.earnings
FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete earnings" ON public.earnings
FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Function to generate referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  code TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    code := 'PC-' || upper(substr(md5(random()::text), 1, 6));
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN code;
END;
$$;

-- Auto-assign referral code on profile creation for agents
CREATE OR REPLACE FUNCTION public.auto_assign_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL AND NEW.profile_type = 'agent' THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_referral_code
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_referral_code();

-- Backfill existing agents with referral codes
UPDATE public.profiles 
SET referral_code = public.generate_referral_code()
WHERE profile_type = 'agent' AND referral_code IS NULL;

-- Function to reward referrer on completed transaction
CREATE OR REPLACE FUNCTION public.reward_referrer_on_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  buyer_profile RECORD;
  referrer_profile RECORD;
  reward_amount BIGINT;
  reward_type TEXT;
  reward_desc TEXT;
BEGIN
  -- Only trigger on status change to completed
  IF NEW.status <> 'completed' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN RETURN NEW; END IF;

  -- Get buyer profile
  SELECT * INTO buyer_profile FROM profiles WHERE user_id = NEW.buyer_id;
  IF buyer_profile IS NULL OR buyer_profile.referred_by IS NULL THEN RETURN NEW; END IF;

  -- Get referrer profile
  SELECT * INTO referrer_profile FROM profiles WHERE id = buyer_profile.referred_by;
  IF referrer_profile IS NULL THEN RETURN NEW; END IF;
  IF referrer_profile.profile_type <> 'agent' THEN RETURN NEW; END IF;
  IF referrer_profile.kyc_verified <> true THEN RETURN NEW; END IF;

  -- Determine reward
  IF NEW.type = 'rent' THEN
    reward_amount := 10000;
    reward_type := 'rent_reward';
    reward_desc := 'Referral rent reward from downline transaction';
  ELSIF NEW.type = 'sale' OR NEW.type = 'purchase' THEN
    reward_amount := 50000;
    reward_type := 'sale_reward';
    reward_desc := 'Referral sale reward from downline transaction';
  ELSE
    RETURN NEW;
  END IF;

  -- Insert earning (unique constraint prevents duplicates)
  INSERT INTO earnings (user_id, amount, type, description, transaction_id)
  VALUES (referrer_profile.user_id, reward_amount, reward_type, reward_desc, NEW.id)
  ON CONFLICT (transaction_id, user_id) DO NOTHING;

  -- Notify the referrer
  INSERT INTO notifications (user_id, title, message, type, link)
  VALUES (
    referrer_profile.user_id,
    'Referral Reward Earned!',
    'You earned ₦' || reward_amount || ' from a downline transaction.',
    'success',
    '/earnings'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reward_referrer
AFTER INSERT OR UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.reward_referrer_on_transaction();

-- Allow system/triggers to insert earnings
CREATE POLICY "System can insert earnings" ON public.earnings
FOR INSERT WITH CHECK (true);
