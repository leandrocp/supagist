-- Public snippets' share images (OG spec v2.1) are JPEG, stored at publish
-- beside the snippet's other files: <owner>/snippets/<id>/og-<hash>.jpg.
-- Adds image/jpeg to the bucket's allowed types and keeps the existing ones.
update storage.buckets
set allowed_mime_types = allowed_mime_types || array['image/jpeg']
where id = 'snippet-images'
  and not ('image/jpeg' = any (allowed_mime_types));
