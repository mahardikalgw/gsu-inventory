-- Re-enable audit trigger
ALTER TABLE public.inventory_items ENABLE TRIGGER inventory_audit_trigger;
