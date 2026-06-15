
-- Lock down products: keep public read, remove anon write
DROP POLICY IF EXISTS "Anyone can insert products" ON public.products;
DROP POLICY IF EXISTS "Anyone can update products" ON public.products;
DROP POLICY IF EXISTS "Anyone can delete products" ON public.products;

-- Lock down orders: keep public insert (guest checkout), remove anon read/update/delete
DROP POLICY IF EXISTS "Anyone can view orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can update orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can delete orders" ON public.orders;

-- Revoke broad anon privileges; keep what is needed
REVOKE ALL ON public.products FROM anon;
REVOKE ALL ON public.orders FROM anon;
GRANT SELECT ON public.products TO anon;
GRANT INSERT ON public.orders TO anon;
GRANT ALL ON public.products TO service_role;
GRANT ALL ON public.orders TO service_role;
