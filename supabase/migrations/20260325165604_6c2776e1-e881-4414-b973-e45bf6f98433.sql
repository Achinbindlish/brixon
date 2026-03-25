
CREATE TABLE public.sync_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sync_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sync_settings"
  ON public.sync_settings FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can read sync_settings"
  ON public.sync_settings FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default settings
INSERT INTO public.sync_settings (setting_key, setting_value) VALUES
  ('prices_csv_url', ''),
  ('stock_csv_url', ''),
  ('auto_sync_enabled', 'false'),
  ('auto_sync_interval', '60');
