
-- KYC verification status changes -> update profile + notify
DROP TRIGGER IF EXISTS trg_kyc_verification_status ON public.kyc_verifications;
CREATE TRIGGER trg_kyc_verification_status
AFTER UPDATE ON public.kyc_verifications
FOR EACH ROW EXECUTE FUNCTION public.notify_kyc_verification_status();

-- Profile kyc_verified flip -> notify + bump trust score
DROP TRIGGER IF EXISTS trg_profile_kyc_change ON public.profiles;
CREATE TRIGGER trg_profile_kyc_change
AFTER UPDATE OF kyc_verified ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.notify_kyc_status_change();

-- Property status changes -> notify agent
DROP TRIGGER IF EXISTS trg_property_status_change ON public.properties;
CREATE TRIGGER trg_property_status_change
AFTER UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.notify_property_status_change();

-- Auto-assign referral code on profile insert
DROP TRIGGER IF EXISTS trg_auto_referral_code ON public.profiles;
CREATE TRIGGER trg_auto_referral_code
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.auto_assign_referral_code();

-- Matrix placement on referral
DROP TRIGGER IF EXISTS trg_auto_place_referral ON public.profiles;
CREATE TRIGGER trg_auto_place_referral
BEFORE INSERT OR UPDATE OF referred_by ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.auto_place_referral();

-- Sensitive field protection
DROP TRIGGER IF EXISTS trg_protect_profile_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_sensitive_field_updates();

-- Subscription activation -> distribute matrix earnings
DROP TRIGGER IF EXISTS trg_subscription_activated ON public.subscriptions;
CREATE TRIGGER trg_subscription_activated
AFTER INSERT OR UPDATE OF status ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.on_subscription_activated();

-- Announcements -> broadcast notifications
DROP TRIGGER IF EXISTS trg_announcement_notify ON public.announcements;
CREATE TRIGGER trg_announcement_notify
AFTER INSERT ON public.announcements
FOR EACH ROW EXECUTE FUNCTION public.notify_new_announcement();

-- updated_at maintenance on key tables
DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_properties_updated ON public.properties;
CREATE TRIGGER trg_properties_updated BEFORE UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_kyc_updated ON public.kyc_verifications;
CREATE TRIGGER trg_kyc_updated BEFORE UPDATE ON public.kyc_verifications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_subs_updated ON public.subscriptions;
CREATE TRIGGER trg_subs_updated BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
