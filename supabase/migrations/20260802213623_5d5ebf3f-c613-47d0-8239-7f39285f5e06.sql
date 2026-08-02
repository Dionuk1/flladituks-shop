CREATE TABLE public.private_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT 'Kosovë',
  city text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  cost_price numeric NOT NULL DEFAULT 0,
  selling_price numeric NOT NULL DEFAULT 0,
  shipping_cost numeric NOT NULL DEFAULT 0,
  profit numeric GENERATED ALWAYS AS (selling_price - cost_price - shipping_cost) STORED,
  status text NOT NULL DEFAULT 'processing',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.private_orders TO service_role;

ALTER TABLE public.private_orders ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_private_orders_updated_at
BEFORE UPDATE ON public.private_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();