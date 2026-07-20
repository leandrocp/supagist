-- Scope snippet asset writes to the authenticated owner's UUID prefix.
--
-- New object names use:
--   <auth.uid()>/snippets/<snippet_id>/<asset>
--
-- `owner_id` is assigned by Supabase Storage from the caller's JWT. Checking
-- both owner_id and the first path segment prevents one user from writing into
-- or deleting another user's namespace. The bucket remains public for CDN
-- delivery; no SELECT/list policy is reintroduced.

drop policy if exists "snippet_images_authenticated_insert" on storage.objects;
drop policy if exists "snippet_images_authenticated_delete" on storage.objects;
drop policy if exists "snippet_images_select_own_prefix" on storage.objects;

-- Storage remove() resolves object rows before deleting them, so owners need
-- SELECT as well as DELETE. This policy still prevents public/cross-user list
-- access; public object delivery uses the bucket's CDN route instead.
create policy "snippet_images_select_own_prefix"
on storage.objects for select to authenticated
using (
  bucket_id = 'snippet-images'
  and owner_id = (select auth.uid())::text
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] = 'snippets'
);

create policy "snippet_images_insert_own_prefix"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'snippet-images'
  and owner_id = (select auth.uid())::text
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] = 'snippets'
);

create policy "snippet_images_delete_own_prefix"
on storage.objects for delete to authenticated
using (
  bucket_id = 'snippet-images'
  and owner_id = (select auth.uid())::text
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] = 'snippets'
);
