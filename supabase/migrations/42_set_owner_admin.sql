-- Migration: Set Owner as Admin
-- Ensures the owner email always has the admin role in the profiles table.

DO $$
DECLARE
    owner_id UUID;
BEGIN
    -- 1. Find the user ID for the owner email
    SELECT id INTO owner_id 
    FROM auth.users 
    WHERE email = 'moida.buvayda@gmail.com'
    LIMIT 1;

    -- 2. If found, ensure the profile exists and has the admin role
    IF owner_id IS NOT NULL THEN
        -- Insert or Update profile role
        INSERT INTO public.profiles (id, role, full_name, created_at, updated_at)
        VALUES (owner_id, 'admin', 'Cakerr Owner', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE 
        SET role = 'admin', updated_at = NOW();
        
        RAISE NOTICE 'Owner role set to admin for user id: %', owner_id;
    ELSE
        RAISE NOTICE 'Owner user not found in auth.users';
    END IF;
END $$;
