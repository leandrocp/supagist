UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/png', 'image/svg+xml', 'text/plain']
WHERE id = 'snippet-images';
