-- Create notifications for property status changes
CREATE OR REPLACE FUNCTION notify_property_status_change()
RETURNS TRIGGER AS $$
DECLARE
  agent_profile_id uuid;
  agent_user_id uuid;
BEGIN
  -- Get agent profile and user ID
  SELECT id INTO agent_profile_id FROM profiles WHERE id = NEW.agent_id;
  SELECT user_id INTO agent_user_id FROM profiles WHERE id = NEW.agent_id;
  
  -- Only notify on status changes that matter
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Property approved
    IF OLD.status = 'under_verification' AND NEW.status IN ('available', 'for_sale', 'for_rent') THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        agent_user_id,
        'Property Approved',
        'Your property "' || NEW.title || '" has been approved and is now live',
        'success',
        '/property/' || NEW.id
      );
    END IF;
    
    -- Property rejected (moved to draft)
    IF OLD.status = 'under_verification' AND NEW.status = 'draft' THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        agent_user_id,
        'Property Rejected',
        'Your property "' || NEW.title || '" needs revision before approval',
        'warning',
        '/property/' || NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;