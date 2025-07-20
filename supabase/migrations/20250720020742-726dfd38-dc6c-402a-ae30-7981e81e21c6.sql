-- Create inventory management database schema for Kelurahan Gunung Sari Ulu

-- Create enum types for better data integrity
CREATE TYPE public.item_category AS ENUM (
  'office_equipment',
  'furniture', 
  'it_devices',
  'vehicle',
  'tools',
  'other'
);

CREATE TYPE public.item_condition AS ENUM (
  'excellent',
  'good', 
  'fair',
  'poor',
  'damaged'
);

CREATE TYPE public.user_role AS ENUM (
  'admin',
  'staff'
);

-- Create profiles table for user management
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'staff',
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create locations table for office organization
CREATE TABLE public.locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  building TEXT,
  floor TEXT,
  room TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inventory items table
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barcode TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category item_category NOT NULL,
  condition item_condition NOT NULL DEFAULT 'good',
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  purchase_date DATE,
  purchase_price DECIMAL(15,2),
  warranty_expiry DATE,
  supplier TEXT,
  notes TEXT,
  image_url TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audit log for tracking changes
CREATE TABLE public.inventory_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all profiles" 
ON public.profiles 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create RLS policies for locations
CREATE POLICY "Authenticated users can view locations" 
ON public.locations 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Admins can manage locations" 
ON public.locations 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create RLS policies for inventory items
CREATE POLICY "Authenticated users can view inventory items" 
ON public.inventory_items 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can update inventory items" 
ON public.inventory_items 
FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can insert inventory items" 
ON public.inventory_items 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Admins can delete inventory items" 
ON public.inventory_items 
FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create RLS policies for audit log
CREATE POLICY "Users can view audit log" 
ON public.inventory_audit_log 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "System can insert audit log" 
ON public.inventory_audit_log 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_inventory_items_barcode ON public.inventory_items(barcode);
CREATE INDEX idx_inventory_items_category ON public.inventory_items(category);
CREATE INDEX idx_inventory_items_condition ON public.inventory_items(condition);
CREATE INDEX idx_inventory_items_location ON public.inventory_items(location_id);
CREATE INDEX idx_inventory_items_created_at ON public.inventory_items(created_at);
CREATE INDEX idx_audit_log_item_id ON public.inventory_audit_log(item_id);
CREATE INDEX idx_audit_log_timestamp ON public.inventory_audit_log(timestamp);

-- Create function to generate barcode
CREATE OR REPLACE FUNCTION public.generate_barcode()
RETURNS TEXT AS $$
DECLARE
  prefix TEXT := 'GSU';
  timestamp_part TEXT;
  random_part TEXT;
  barcode TEXT;
BEGIN
  -- Use current timestamp for uniqueness
  timestamp_part := EXTRACT(EPOCH FROM NOW())::TEXT;
  
  -- Generate random 4-digit number
  random_part := LPAD((RANDOM() * 9999)::INT::TEXT, 4, '0');
  
  -- Combine parts
  barcode := prefix || '-' || RIGHT(timestamp_part, 8) || '-' || random_part;
  
  RETURN barcode;
END;
$$ LANGUAGE plpgsql;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to log inventory changes
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
    INSERT INTO public.inventory_audit_log (item_id, user_id, action, old_values)
    VALUES (OLD.id, user_profile_id, 'DELETE', row_to_json(OLD));
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for inventory audit logging
CREATE TRIGGER inventory_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.log_inventory_changes();

-- Insert default locations
INSERT INTO public.locations (name, description, building, floor, room) VALUES
('Kantor Utama', 'Main office area', 'Gedung Utama', '1', 'Ruang Kepala'),
('Ruang Pelayanan', 'Public service area', 'Gedung Utama', '1', 'Loket Pelayanan'),
('Ruang Arsip', 'Document storage', 'Gedung Utama', '1', 'Ruang Arsip'),
('Ruang IT', 'IT equipment storage', 'Gedung Utama', '2', 'Ruang Server'),
('Gudang', 'General storage', 'Gedang Belakang', '1', 'Gudang Utama');

-- Create function to automatically assign barcode
CREATE OR REPLACE FUNCTION public.auto_assign_barcode()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.barcode IS NULL OR NEW.barcode = '' THEN
    NEW.barcode := public.generate_barcode();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto barcode assignment
CREATE TRIGGER auto_assign_barcode_trigger
  BEFORE INSERT ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_barcode();