/*
  # Create legal_pages table

  ## Summary
  Creates a table to store editable legal content pages (Privacy Policy, Terms & Conditions, Contact).
  These pages can be edited by admins from the admin panel and displayed publicly.

  ## New Tables
  - `legal_pages`
    - `id` (uuid, primary key)
    - `slug` (text, unique) - identifier like 'privacy-policy', 'terms', 'contact'
    - `title` (text) - display title of the page
    - `content` (text) - the page body content
    - `updated_at` (timestamptz) - last update timestamp

  ## Security
  - RLS enabled
  - Public SELECT allowed (anyone can view legal pages)
  - Only admins (via has_role check) can INSERT/UPDATE
*/

CREATE TABLE IF NOT EXISTS legal_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE legal_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view legal pages"
  ON legal_pages FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert legal pages"
  ON legal_pages FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update legal pages"
  ON legal_pages FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO legal_pages (slug, title, content) VALUES
  ('privacy-policy', 'Privacy Policy', 'We respect your privacy. Any information you provide is used solely for processing your orders and will not be shared with third parties.'),
  ('terms', 'Terms & Conditions', 'By using this platform you agree to our terms. All prices are subject to change. Orders are confirmed only upon written acknowledgment.'),
  ('contact', 'Contact', 'For any queries, reach us on WhatsApp at +91 80761 73815 or email us at support@brixon.in.')
ON CONFLICT (slug) DO NOTHING;
