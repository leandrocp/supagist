-- Public read on snippet-images bucket
create policy "snippet_images_public_read"
on storage.objects for select
using (bucket_id = 'snippet-images');

-- Authenticated users can upload
create policy "snippet_images_authenticated_insert"
on storage.objects for insert to authenticated
with check (bucket_id = 'snippet-images');

-- Authenticated users can delete their own uploads (for cleanup on publish failure)
create policy "snippet_images_authenticated_delete"
on storage.objects for delete to authenticated
using (bucket_id = 'snippet-images');
