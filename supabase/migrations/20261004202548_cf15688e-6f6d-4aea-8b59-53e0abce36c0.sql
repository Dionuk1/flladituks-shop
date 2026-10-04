CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  order_no integer,
  type text NOT NULL DEFAULT 'order_status',
  status text,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX notifications_user_idx ON public.notifications(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.order_status_label_sq(_s text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _s
    WHEN 'pending' THEN 'Pranuar' WHEN 'new' THEN 'Pranuar'
    WHEN 'processing' THEN 'Në procesim' WHEN 'verified' THEN 'Verifikuar'
    WHEN 'shipped' THEN 'Dërguar' WHEN 'completed' THEN 'Përfunduar'
    WHEN 'cancelled' THEN 'Anuluar' WHEN 'rejected' THEN 'Anuluar'
    ELSE _s END
$$;

CREATE OR REPLACE FUNCTION public.notify_buyer_on_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE lbl text; num text;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  num := COALESCE('#' || NEW.order_no::text, '');
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications(user_id, order_id, order_no, type, status, title, body)
    VALUES (NEW.user_id, NEW.id, NEW.order_no, 'new_order', NEW.status,
      'Porosia ' || num || ' u pranua',
      'Faleminderit! Porosia jote ' || num || ' u regjistrua me sukses dhe do të përpunohet së shpejti.');
  ELSIF NEW.status IS DISTINCT FROM OLD.status
     AND public.order_status_label_sq(NEW.status) IS DISTINCT FROM public.order_status_label_sq(OLD.status) THEN
    lbl := public.order_status_label_sq(NEW.status);
    INSERT INTO public.notifications(user_id, order_id, order_no, type, status, title, body)
    VALUES (NEW.user_id, NEW.id, NEW.order_no, 'order_status', NEW.status,
      'Porosia ' || num || ': ' || lbl,
      'Statusi i porosisë sate ' || num || ' tani është "' || lbl || '".');
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notify_buyer_on_order() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER orders_notify_buyer
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_buyer_on_order();