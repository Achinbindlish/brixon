-- Admin WhatsApp contacts for low-stock alerts (max 20 enforced in app)
CREATE TABLE public.admin_whatsapp_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  phone text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_whatsapp_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage whatsapp contacts" ON public.admin_whatsapp_contacts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_awc_updated BEFORE UPDATE ON public.admin_whatsapp_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Low stock alerts queue (pending until admin sends)
CREATE TABLE public.low_stock_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_no text NOT NULL,
  stock numeric NOT NULL,
  threshold numeric NOT NULL DEFAULT 3.5,
  source text NOT NULL DEFAULT 'order', -- 'order' | 'daily'
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'sent' | 'dismissed'
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
ALTER TABLE public.low_stock_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage alerts" ON public.low_stock_alerts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE INDEX idx_low_stock_alerts_status ON public.low_stock_alerts(status, created_at DESC);