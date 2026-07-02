-- Tighten public read access on app_settings so only whitelisted non-sensitive
-- keys are visible via the Data API. Sensitive keys (emailjs_config,
-- notification_email) are only reachable through server functions using the
-- service role client.

DROP POLICY IF EXISTS "Anyone can read settings" ON public.app_settings;

CREATE POLICY "Public can read non-sensitive settings"
  ON public.app_settings
  FOR SELECT
  TO anon, authenticated
  USING (key IN ('shipping_price'));
