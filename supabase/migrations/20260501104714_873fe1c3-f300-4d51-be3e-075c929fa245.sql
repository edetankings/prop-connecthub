-- Drop the restrictive FK so earnings can reference subscriptions too
ALTER TABLE public.earnings DROP CONSTRAINT IF EXISTS earnings_transaction_id_fkey;

-- Fix earnings type check
ALTER TABLE public.earnings DROP CONSTRAINT IF EXISTS earnings_type_check;
ALTER TABLE public.earnings ADD CONSTRAINT earnings_type_check
  CHECK (type IN ('referral','rent_reward','sale_reward','direct_referral','matrix','company_fee','bonus','adjustment'));

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS videos text[] DEFAULT '{}'::text[];

CREATE OR REPLACE FUNCTION public.distribute_subscription_payment(_subscription_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sub RECORD;
  subscriber_profile RECORD;
  current_parent_id uuid;
  current_parent_profile RECORD;
  is_active boolean;
  lvl integer := 1;
  share bigint;
  weights integer[] := ARRAY[1000,600,400,300,300,200,200,200,200,200,80,80,80,80,80];
  already_distributed boolean;
BEGIN
  SELECT * INTO sub FROM subscriptions WHERE id = _subscription_id;
  IF sub IS NULL THEN RETURN; END IF;
  SELECT EXISTS(SELECT 1 FROM earnings WHERE transaction_id = _subscription_id AND source = 'subscription' AND type IN ('matrix','direct_referral','company_fee')) INTO already_distributed;
  IF already_distributed THEN RETURN; END IF;
  SELECT * INTO subscriber_profile FROM profiles WHERE user_id = sub.user_id;
  IF subscriber_profile IS NULL THEN RETURN; END IF;

  INSERT INTO company_wallet (balance, total_earned)
  SELECT 0, 0 WHERE NOT EXISTS (SELECT 1 FROM company_wallet);

  UPDATE company_wallet SET balance = balance + 2500, total_earned = total_earned + 2500, updated_at = now();
  INSERT INTO earnings (user_id, amount, type, source, level, from_user_id, transaction_id, description)
  VALUES (sub.user_id, 0, 'company_fee', 'subscription', 0, sub.user_id, _subscription_id, 'Company fee logged');

  IF subscriber_profile.referred_by IS NOT NULL THEN
    SELECT * INTO current_parent_profile FROM profiles WHERE id = subscriber_profile.referred_by;
    IF current_parent_profile IS NOT NULL THEN
      SELECT EXISTS(SELECT 1 FROM subscriptions WHERE user_id = current_parent_profile.user_id AND status='active' AND end_date >= now()) INTO is_active;
      IF is_active THEN
        INSERT INTO earnings (user_id, amount, type, source, level, from_user_id, transaction_id, description)
        VALUES (current_parent_profile.user_id, 1000, 'direct_referral', 'subscription', 1, sub.user_id, _subscription_id, 'Direct referral bonus');
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (current_parent_profile.user_id, 'Direct Referral Bonus!', '₦1,000 earned from your direct referral subscription.', 'success', '/earnings');
      ELSE
        INSERT INTO escrow_holds (intended_user_id, from_user_id, subscription_id, level, amount)
        VALUES (current_parent_profile.user_id, sub.user_id, _subscription_id, 1, 1000);
      END IF;
    END IF;
  ELSE
    UPDATE company_wallet SET balance = balance + 1000, total_earned = total_earned + 1000, updated_at = now();
  END IF;

  current_parent_id := subscriber_profile.referred_by;
  WHILE current_parent_id IS NOT NULL AND lvl <= 15 LOOP
    SELECT * INTO current_parent_profile FROM profiles WHERE id = current_parent_id;
    EXIT WHEN current_parent_profile IS NULL;
    share := weights[lvl];
    SELECT EXISTS(SELECT 1 FROM subscriptions WHERE user_id = current_parent_profile.user_id AND status='active' AND end_date >= now()) INTO is_active;
    IF is_active THEN
      INSERT INTO earnings (user_id, amount, type, source, level, from_user_id, transaction_id, description)
      VALUES (current_parent_profile.user_id, share, 'matrix', 'subscription', lvl, sub.user_id, _subscription_id, 'Matrix L'||lvl||' earning');
    ELSE
      INSERT INTO escrow_holds (intended_user_id, from_user_id, subscription_id, level, amount)
      VALUES (current_parent_profile.user_id, sub.user_id, _subscription_id, lvl, share);
    END IF;
    current_parent_id := current_parent_profile.referred_by;
    lvl := lvl + 1;
  END LOOP;
  WHILE lvl <= 15 LOOP
    UPDATE company_wallet SET balance = balance + weights[lvl], total_earned = total_earned + weights[lvl], updated_at = now();
    lvl := lvl + 1;
  END LOOP;
END;
$function$;

DO $$
DECLARE s RECORD;
BEGIN
  FOR s IN SELECT id FROM subscriptions WHERE status='active' LOOP
    PERFORM public.distribute_subscription_payment(s.id);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.touch_last_login()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.profiles SET last_login_at = now() WHERE user_id = auth.uid();
END; $$;

DROP POLICY IF EXISTS "Admins can create threads" ON public.chat_threads;
CREATE POLICY "Admins can create threads" ON public.chat_threads FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "Admins can send messages anywhere" ON public.messages;
CREATE POLICY "Admins can send messages anywhere" ON public.messages FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(),'admin'::app_role));