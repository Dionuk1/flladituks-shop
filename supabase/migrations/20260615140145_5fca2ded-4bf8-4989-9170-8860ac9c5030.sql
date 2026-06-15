
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.app_settings TO service_role;
GRANT SELECT ON public.app_settings TO anon, authenticated;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings"
  ON public.app_settings FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO public.app_settings (key, value) VALUES ('shipping_price', '2.00'::jsonb)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC NOT NULL DEFAULT 0;
