-- Ensure only one default address per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_default_address_per_user 
ON public.addresses (user_id) 
WHERE (is_default = TRUE);
