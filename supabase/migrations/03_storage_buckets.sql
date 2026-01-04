-- Create storage bucket for images
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

-- Set up storage policies
-- 1. Public Access
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'images' );

-- 2. Authenticated Upload/Delete (Admin)
create policy "Authenticated Upload"
  on storage.objects for insert
  with check ( bucket_id = 'images' and auth.role() = 'authenticated' );

create policy "Authenticated Update"
  on storage.objects for update
  using ( bucket_id = 'images' and auth.role() = 'authenticated' );

create policy "Authenticated Delete"
  on storage.objects for delete
  using ( bucket_id = 'images' and auth.role() = 'authenticated' );
