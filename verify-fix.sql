-- Verify Fix: Check if infinite recursion is resolved
-- Jalankan script ini setelah menjalankan emergency-fix.sql

-- 1. Check if profiles table exists and has no RLS
SELECT 'Profiles table status:' as info;
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'profiles';

-- 2. Check if there are any policies on profiles table
SELECT 'Policies on profiles table:' as info;
SELECT 
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'profiles';

-- 3. Test direct access to profiles table
SELECT 'Testing direct access:' as info;
SELECT COUNT(*) as total_profiles FROM public.profiles;

-- 4. Check if your profile exists
SELECT 'Your profile:' as info;
SELECT 
  p.full_name,
  p.role,
  u.email,
  p.created_at
FROM public.profiles p
JOIN auth.users u ON p.user_id = u.id
WHERE u.email = 'EMAIL_ANDA@example.com';

-- 5. Test inserting a new profile (if needed)
-- Uncomment and run if you need to create a profile
/*
INSERT INTO public.profiles (user_id, full_name, role, phone)
SELECT 
    id,
    'Test User',
    'staff',
    '+62-xxx-xxx-xxxx'
FROM auth.users 
WHERE email = 'EMAIL_ANDA@example.com'
AND id NOT IN (SELECT user_id FROM public.profiles);
*/

-- 6. Show all profiles
SELECT 'All profiles in system:' as info;
SELECT 
  p.full_name,
  p.role,
  u.email,
  p.created_at
FROM public.profiles p
JOIN auth.users u ON p.user_id = u.id
ORDER BY p.created_at DESC; 