CREATE TABLE public.discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value numeric NOT NULL DEFAULT 0,
  start_date timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.discounts TO service_role;

ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_discounts_updated_at
BEFORE UPDATE ON public.discounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.discounts_uppercase_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.code = upper(trim(NEW.code)); RETURN NEW; END; $$;

CREATE TRIGGER discounts_code_upper
BEFORE INSERT OR UPDATE ON public.discounts
FOR EACH ROW EXECUTE FUNCTION public.discounts_uppercase_code();

ALTER TABLE public.orders
  ADD COLUMN discount_id uuid REFERENCES public.discounts(id) ON DELETE SET NULL,
  ADD COLUMN discount_code text,
  ADD COLUMN discount_amount numeric NOT NULL DEFAULT 0;