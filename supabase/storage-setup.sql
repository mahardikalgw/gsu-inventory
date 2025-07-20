-- Create storage bucket for inventory images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inventory',
  'inventory',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Create storage policies for inventory bucket
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'inventory');

CREATE POLICY "Authenticated users can upload images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'inventory' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'inventory-images'
);

CREATE POLICY "Users can update their own uploads" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'inventory' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Admins can delete any image" ON storage.objects
FOR DELETE USING (
  bucket_id = 'inventory' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
); 