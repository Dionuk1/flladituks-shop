CREATE SEQUENCE IF NOT EXISTS public.order_no_seq START WITH 1001 INCREMENT BY 1;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_no integer;
ALTER TABLE public.private_orders ADD COLUMN IF NOT EXISTS order_no integer;

UPDATE public.orders SET order_no = nextval('public.order_no_seq') WHERE order_no IS NULL;
UPDATE public.private_orders SET order_no = nextval('public.order_no_seq') WHERE order_no IS NULL;

ALTER TABLE public.orders ALTER COLUMN order_no SET DEFAULT nextval('public.order_no_seq');
ALTER TABLE public.private_orders ALTER COLUMN order_no SET DEFAULT nextval('public.order_no_seq');

CREATE UNIQUE INDEX IF NOT EXISTS orders_order_no_key ON public.orders(order_no);
CREATE UNIQUE INDEX IF NOT EXISTS private_orders_order_no_key ON public.private_orders(order_no);