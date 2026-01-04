-- Create user addresses table
CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    label TEXT NOT NULL, -- e.g. 'Uy', 'Ish', 'Boshqa'
    address_text TEXT NOT NULL,
    apartment TEXT,
    floor TEXT,
    entrance TEXT,
    lat NUMERIC,
    lng NUMERIC,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own addresses"
    ON public.addresses
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Ensure only one default address per user (optional trigger or just logic)
-- For now, we'll handle this in the application logic.

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses(user_id);
