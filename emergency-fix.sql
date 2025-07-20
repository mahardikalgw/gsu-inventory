-- EMERGENCY FIX: Complete Reset for Profiles Table
-- Jalankan script ini di Supabase SQL Editor untuk mengatasi infinite recursion

-- 1. Drop the problematic profiles table completely
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. Create a fresh profiles table without any RLS
CREATE TABLE public.profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create index for performance
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);

-- 4. Insert admin profile for your user (GANTI EMAIL_ANDA dengan email Anda)
INSERT INTO public.profiles (user_id, full_name, role, phone)
SELECT 
    id,
    'Administrator',
    'admin',
    '+62-xxx-xxx-xxxx'
FROM auth.users 
WHERE email = 'EMAIL_ANDA@example.com';

-- 5. Verify the profile was created
SELECT 'Profile created:' as info;
SELECT 
    p.full_name,
    p.role,
    u.email
FROM public.profiles p
JOIN auth.users u ON p.user_id = u.id
WHERE u.email = 'EMAIL_ANDA@example.com';

-- 6. Test access to profiles table
SELECT 'Testing access:' as info;
SELECT COUNT(*) as total_profiles FROM public.profiles;

-- 7. Show all profiles
SELECT 'All profiles:' as info;
SELECT 
    p.full_name,
    p.role,
    u.email
FROM public.profiles p
JOIN auth.users u ON p.user_id = u.id; 