
-- Drop the stock deduction trigger on order_items (if exists)
DROP TRIGGER IF EXISTS deduct_stock_on_order ON public.order_items;

-- Drop FK constraint on article_id so we can insert without valid article reference
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_article_id_fkey;

-- Set default for article_id so edge function can insert without specifying it
ALTER TABLE public.order_items ALTER COLUMN article_id SET DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;
