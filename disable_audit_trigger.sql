-- Disable audit trigger temporarily
ALTER TABLE public.inventory_items DISABLE TRIGGER inventory_audit_trigger;
