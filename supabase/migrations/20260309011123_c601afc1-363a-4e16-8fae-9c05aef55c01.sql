-- Create triggers and additional notification functions
CREATE TRIGGER property_status_change_trigger
  AFTER UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION notify_property_status_change();

-- Create notifications for KYC verification changes
CREATE OR REPLACE FUNCTION notify_kyc_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify on KYC verification changes
  IF (TG_OP = 'UPDATE' AND OLD.kyc_verified IS DISTINCT FROM NEW.kyc_verified) THEN
    IF NEW.kyc_verified = true THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        NEW.user_id,
        'KYC Verification Approved',
        'Your identity verification has been approved. You can now access all features.',
        'success',
        '/settings'
      );
    ELSE
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        NEW.user_id,
        'KYC Verification Required',
        'Please complete your identity verification to access all features.',
        'warning',
        '/identity-verification'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER kyc_status_change_trigger
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_kyc_status_change();

-- Create notifications for new announcements
CREATE OR REPLACE FUNCTION notify_new_announcement()
RETURNS TRIGGER AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Send notification to all users when a new announcement is created
  FOR user_record IN 
    SELECT user_id FROM profiles WHERE is_visible = true
  LOOP
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      user_record.user_id,
      'New Announcement',
      'Check out the latest update: ' || NEW.title,
      'info',
      '/announcements'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER new_announcement_trigger
  AFTER INSERT ON announcements
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_announcement();