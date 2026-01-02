-- Fix Missing Profiles Script
-- Run this to create profile rows for users that exist in auth.users but are missing from public.profiles
-- This fixes the "violates foreign key constraint orders_user_id_fkey" error.

INSERT INTO public.profiles (id, full_name, phone_number, role)
SELECT 
    id, 
    COALESCE(raw_user_meta_data->>'full_name', 'Unnamed User'), 
    phone, 
    'customer'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);

-- Verify the fix
SELECT count(*) as profiles_created FROM public.profiles;
