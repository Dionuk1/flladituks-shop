-- Public read access for flladituks-images bucket (so getPublicUrl works)
CREATE POLICY "Public read flladituks-images"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'flladituks-images');

-- Same for existing product-images so old uploaded images keep displaying
CREATE POLICY "Public read product-images"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'product-images');