
-- Fix profiles.referred_by to SET NULL on delete
ALTER TABLE public.profiles DROP CONSTRAINT profiles_referred_by_fkey;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_referred_by_fkey 
  FOREIGN KEY (referred_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Fix reservations.agent_id to SET NULL on delete
ALTER TABLE public.reservations DROP CONSTRAINT reservations_agent_id_fkey;
ALTER TABLE public.reservations ADD CONSTRAINT reservations_agent_id_fkey 
  FOREIGN KEY (agent_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Fix verification_documents.reviewed_by to SET NULL on delete
ALTER TABLE public.verification_documents DROP CONSTRAINT verification_documents_reviewed_by_fkey;
ALTER TABLE public.verification_documents ADD CONSTRAINT verification_documents_reviewed_by_fkey 
  FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Fix kyc_verifications.reviewed_by to SET NULL on delete
ALTER TABLE public.kyc_verifications DROP CONSTRAINT kyc_verifications_reviewed_by_fkey;
ALTER TABLE public.kyc_verifications ADD CONSTRAINT kyc_verifications_reviewed_by_fkey 
  FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Fix earnings.transaction_id to SET NULL on delete
ALTER TABLE public.earnings DROP CONSTRAINT earnings_transaction_id_fkey;
ALTER TABLE public.earnings ADD CONSTRAINT earnings_transaction_id_fkey 
  FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE SET NULL;

-- Fix transactions.property_id to SET NULL on delete  
ALTER TABLE public.transactions DROP CONSTRAINT transactions_property_id_fkey;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_property_id_fkey 
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;

-- Add user_id FK on earnings to auth.users with CASCADE
ALTER TABLE public.earnings ADD CONSTRAINT earnings_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
