-- 1. Create Storage Bucket for Custom Cake Images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('custom-cakes', 'custom-cakes', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage Policies
-- Allow anyone to view custom-cake images
DROP POLICY IF EXISTS "Custom cakes are publicly accessible" ON storage.objects;
CREATE POLICY "Custom cakes are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'custom-cakes');

-- Allow anyone to upload to custom-cakes (Public for the builder)
-- Note: In production you might want to restrict this by size or rate limit, 
-- but for the current UX of guests building cakes, it needs to be accessible.
DROP POLICY IF EXISTS "Anyone can upload custom cake images" ON storage.objects;
CREATE POLICY "Anyone can upload custom cake images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'custom-cakes');

-- Allow anyone to update/delete (Optional: users can manage their own during the session)
DROP POLICY IF EXISTS "Anyone can delete their own custom cake images" ON storage.objects;
CREATE POLICY "Anyone can delete their own custom cake images" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'custom-cakes');
-- 3. Create Placeholder Product for Custom/Reference Image cakes
-- Using a fixed UUID so we can easily reference it from the code
INSERT INTO public.products (id, title, description, base_price, image_url, category, is_available)
VALUES (
    '00000000-0000-0000-0000-000000000000', 
    'Maxsus tort (Rasm asosida)', 
    'Mijoz tomonidan yuklangan rasm asosida tayyorlanadigan tort', 
    350000, 
    'https://weocyrjmzuksukbmuqjs.supabase.co/storage/v1/object/public/custom-cakes/placeholder.png',
    'Maxsus',
    true
)
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;
