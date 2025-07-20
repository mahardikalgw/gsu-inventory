-- Quick Fix untuk Profile User
-- Jalankan script ini di Supabase SQL Editor

-- 1. Lihat semua users
SELECT 'Users in auth.users:' as info;
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC;

-- 2. Lihat semua profiles
SELECT 'Profiles in public.profiles:' as info;
SELECT id, user_id, full_name, role, created_at FROM public.profiles ORDER BY created_at DESC;

-- 3. Lihat users yang tidak punya profile
SELECT 'Users without profiles:' as info;
SELECT u.id, u.email, u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.user_id
WHERE p.id IS NULL;

-- 4. Buat profile untuk user yang belum punya (GANTI EMAIL_ANDA)
-- Jalankan query ini jika user Anda tidak punya profile:
/*
INSERT INTO public.profiles (
  user_id,
  full_name,
  role,
  phone,
  created_at,
  updated_at
) 
SELECT 
  id,
  'Admin User',
  'admin',
  '+62-xxx-xxx-xxxx',
  now(),
  now()
FROM auth.users 
WHERE email = 'EMAIL_ANDA@example.com'
AND id NOT IN (SELECT user_id FROM public.profiles);
*/

-- 5. Update role menjadi admin (GANTI EMAIL_ANDA)
-- Jalankan query ini untuk mengubah role menjadi admin:
/*
UPDATE public.profiles 
SET role = 'admin' 
WHERE user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'EMAIL_ANDA@example.com'
);
*/

-- 6. Verifikasi hasil
SELECT 'Verification:' as info;
SELECT 
  p.full_name,
  p.role,
  u.email,
  p.created_at
FROM public.profiles p
JOIN auth.users u ON p.user_id = u.id
WHERE u.email = 'EMAIL_ANDA@example.com'; 