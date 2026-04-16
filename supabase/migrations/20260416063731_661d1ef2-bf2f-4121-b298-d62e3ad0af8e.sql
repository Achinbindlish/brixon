
CREATE TABLE public.app_content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_key text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.app_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view app_content" ON public.app_content FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can manage app_content" ON public.app_content FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.app_content (content_key, title, body) VALUES
  ('privacy_policy', 'Privacy Policy', 'Your privacy is important to us. This privacy policy explains how we collect, use, and protect your personal information when you use our application.'),
  ('terms_conditions', 'Terms & Conditions', 'By using this application, you agree to these terms and conditions. Please read them carefully before using our services.'),
  ('contacts', 'Contact Us', 'For inquiries, please reach out to us via WhatsApp at +91 8076173815 or email us.');
