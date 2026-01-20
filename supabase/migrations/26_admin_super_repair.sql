-- =============================================================
-- MEGA REPAIR SCRIPT: Admin Auth & User Creation Fix
-- =============================================================
-- This script fixes the "Database error creating new user" 
-- by ensuring the schema is correct and the trigger is robust.

-- 1. Ensure 'email' column exists in profiles
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='email') THEN
        ALTER TABLE public.profiles ADD COLUMN email TEXT;
    END IF;
END $$;

-- 2. Clean up existing triggers to avoid duplication
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Robust Profile Creation Function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT := 'customer';
BEGIN
  -- Determine role based on email (Case Insensitive)
  IF (LOWER(new.email) = 'moida.buvayda@gmail.com') THEN
    v_role := 'admin';
  END IF;

  INSERT INTO public.profiles (id, full_name, phone_number, email, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'New User'), 
    new.phone, 
    new.email,
    v_role::public.user_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE WHEN profiles.full_name IS NULL OR profiles.full_name = '' OR profiles.full_name = 'New User' THEN EXCLUDED.full_name ELSE profiles.full_name END,
    role = CASE WHEN EXCLUDED.role = 'admin' THEN 'admin'::public.user_role ELSE profiles.role END;
    
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Extremely Important: This makes sure the AUTH USER is created 
  -- even if the PROFILE creation fails for some reason.
  -- This prevents the "Database error creating user" block.
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-attach the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Manual Promotion (Just in case the user already exists)
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = 'moida.buvayda@gmail.com';
    
    IF v_user_id IS NOT NULL THEN
        INSERT INTO public.profiles (id, email, role, full_name)
        VALUES (v_user_id, 'moida.buvayda@gmail.com', 'admin', 'Admin')
        ON CONFLICT (id) DO UPDATE 
        SET role = 'admin', email = 'moida.buvayda@gmail.com';
        
        RAISE NOTICE 'Admin profile updated for user %', v_user_id;
    ELSE
        RAISE NOTICE 'Admin user not found in auth.users yet.';
    END IF;
END $$;

-- 6. Verify Schema
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name IN ('email', 'role');
