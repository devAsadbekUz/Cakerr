-- Fix Address Table Foreign Key
-- Problem: Addresses were linked to auth.users, but Telegram users are stored in public.profiles.
-- Solution: Point user_id to public.profiles(id) and update RLS policies to match.

-- 1. Drop the restrictive foreign key
ALTER TABLE public.addresses 
DROP CONSTRAINT IF EXISTS addresses_user_id_fkey;

-- 2. Ensure user_id column exists (it does) and is UUID type
-- (Already UUID from previous migration)

-- 3. Add the new foreign key pointing to PROFILES
ALTER TABLE public.addresses
ADD CONSTRAINT addresses_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- 4. Update RLS Policies to be polymorphic (works for both auth.users and telegram-only profiles)
-- Since the API uses service_role, this is mostly for future-proofing and local testing.
DROP POLICY IF EXISTS "Users can manage their own addresses" ON public.addresses;

CREATE POLICY "Users can manage their own addresses via profile"
    ON public.addresses
    FOR ALL
    USING (
        -- If authenticated via Supabase Auth
        (auth.uid() = user_id) OR 
        -- If identified via profiles (handled by Service Role API but visible for debugging)
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = addresses.user_id 
              AND (profiles.id = auth.uid() OR auth.role() = 'service_role')
        )
    )
    WITH CHECK (
        (auth.uid() = user_id) OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = addresses.user_id 
              AND (profiles.id = auth.uid() OR auth.role() = 'service_role')
        )
    );

COMMENT ON TABLE public.addresses IS 'Stores user delivery addresses. Linked to public.profiles for Telegram Mini App users.';
