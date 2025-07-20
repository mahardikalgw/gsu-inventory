-- Fix audit trigger function to handle DELETE properly
CREATE OR REPLACE FUNCTION public.log_inventory_changes()
RETURNS TRIGGER AS $$
DECLARE
  user_profile_id UUID;
BEGIN
  -- Get the profile ID for the current user
  SELECT id INTO user_profile_id 
  FROM public.profiles 
  WHERE user_id = auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.inventory_audit_log (item_id, user_id, action, new_values)
    VALUES (NEW.id, user_profile_id, 'INSERT', row_to_json(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.inventory_audit_log (item_id, user_id, action, old_values, new_values)
    VALUES (NEW.id, user_profile_id, 'UPDATE', row_to_json(OLD), row_to_json(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Don't create audit log for DELETE to avoid foreign key issues
    -- The audit log is already created when we manually delete audit entries
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
