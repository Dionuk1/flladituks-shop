-- 1. Lock down SECURITY DEFINER helper
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated, anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

-- 2. Seller-scoped policies (sellers)
DROP POLICY IF EXISTS "Sellers can update their own shop" ON public.sellers;
CREATE POLICY "Sellers can update their own shop"
ON public.sellers FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own shop" ON public.sellers;
CREATE POLICY "Users can create their own shop"
ON public.sellers FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

GRANT SELECT ON public.sellers TO anon;
GRANT SELECT, INSERT, UPDATE ON public.sellers TO authenticated;
GRANT ALL ON public.sellers TO service_role;

-- 3. Seller-scoped policies (products)
DROP POLICY IF EXISTS "Sellers manage their own products" ON public.products;
CREATE POLICY "Sellers manage their own products"
ON public.products FOR ALL TO authenticated
USING (
  seller_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.sellers s
    WHERE s.id = products.seller_id AND s.user_id = auth.uid()
  )
)
WITH CHECK (
  seller_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.sellers s
    WHERE s.id = products.seller_id AND s.user_id = auth.uid()
  )
);

GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

-- 4. Storage: explicit read-only for clients, writes only via service role
DROP POLICY IF EXISTS "Public can read product images" ON storage.objects;
DROP POLICY IF EXISTS "Public read product-images" ON storage.objects;
DROP POLICY IF EXISTS "Public read flladituks-images" ON storage.objects;

CREATE POLICY "Public read of image buckets"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id IN ('product-images', 'flladituks-images'));
