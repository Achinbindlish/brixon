
-- Allow anonymous (public) read access to articles
DROP POLICY IF EXISTS "Anyone authenticated can view articles" ON public.articles;
CREATE POLICY "Anyone can view articles" ON public.articles FOR SELECT TO anon, authenticated USING (true);

-- Allow anonymous (public) read access to stock
DROP POLICY IF EXISTS "Anyone authenticated can view stock" ON public.stock;
CREATE POLICY "Anyone can view stock" ON public.stock FOR SELECT TO anon, authenticated USING (true);
