-- Migration: 26_admin_email_promotion.sql
-- Description: Adds email field to profiles and promotes specific email to admin.

-- 1. Add email field to profiles if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='email') THEN
        ALTER TABLE public.profiles ADD COLUMN email TEXT;
    END IF;
END $$;

-- 2. Update handle_new_user trigger to include email and handle conflicts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role user_role := 'customer';
BEGIN
  -- Determine role based on email
  IF (new.email = 'moida.buvayda@gmail.com') THEN
    default_role := 'admin'::user_role;
  END IF;

  INSERT INTO public.profiles (id, full_name, phone_number, email, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), 
    new.phone, 
    new.email,
    default_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE WHEN profiles.full_name = '' THEN EXCLUDED.full_name ELSE profiles.full_name END,
    role = CASE WHEN EXCLUDED.role = 'admin' THEN 'admin'::user_role ELSE profiles.role END;
    
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error or just allow the user to be created in auth without a profile
  -- (Better to have a user without profile than no user at all, 
  -- although for TORTEL'E profile is usually required).
  -- RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Manually update existing profile if it exists
UPDATE public.profiles 
SET role = 'admin', email = 'moida.buvayda@gmail.com'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'moida.buvayda@gmail.com'
);
