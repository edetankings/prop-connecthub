
-- Create kyc_verifications table to store all KYC submissions
CREATE TABLE public.kyc_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  government_id_url TEXT,
  government_id_type TEXT,
  selfie_url TEXT,
  nin_or_bvn TEXT,
  nin_bvn_type TEXT,
  proof_of_address_url TEXT,
  bank_name TEXT,
  account_number TEXT,
  residential_address TEXT,
  phone_verified BOOLEAN DEFAULT false,
  kyc_status TEXT NOT NULL DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
  rejection_reason TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own KYC submission
CREATE POLICY "Users can view own kyc submission"
ON public.kyc_verifications
FOR SELECT
USING (user_id = auth.uid());

-- Users can insert their own KYC submission
CREATE POLICY "Users can insert own kyc submission"
ON public.kyc_verifications
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own KYC submission (for resubmission)
CREATE POLICY "Users can update own kyc submission"
ON public.kyc_verifications
FOR UPDATE
USING (user_id = auth.uid() AND kyc_status IN ('pending', 'rejected'));

-- Admins can view all KYC submissions
CREATE POLICY "Admins can view all kyc submissions"
ON public.kyc_verifications
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update any KYC submission (for approval/rejection)
CREATE POLICY "Admins can update any kyc submission"
ON public.kyc_verifications
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_kyc_verifications_updated_at
BEFORE UPDATE ON public.kyc_verifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Create function to notify user when KYC status changes
CREATE OR REPLACE FUNCTION public.notify_kyc_verification_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only notify on status changes
  IF (TG_OP = 'UPDATE' AND OLD.kyc_status IS DISTINCT FROM NEW.kyc_status) THEN
    IF NEW.kyc_status = 'verified' THEN
      -- Update the profile kyc_verified status
      UPDATE profiles 
      SET kyc_verified = true
      WHERE user_id = NEW.user_id;
      
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        NEW.user_id,
        'KYC Verification Approved',
        'Congratulations! Your KYC verification has been approved. You now have full access to all platform features.',
        'success',
        '/settings'
      );
    ELSIF NEW.kyc_status = 'rejected' THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        NEW.user_id,
        'KYC Verification Declined',
        COALESCE('Your verification was declined: ' || NEW.rejection_reason || '. Please upload correct documents and try again.', 'Your verification was declined. Please upload correct documents and try again.'),
        'warning',
        '/identity-verification'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for KYC status notifications
CREATE TRIGGER notify_kyc_status
AFTER UPDATE ON public.kyc_verifications
FOR EACH ROW
EXECUTE FUNCTION public.notify_kyc_verification_status();
