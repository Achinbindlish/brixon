
CREATE OR REPLACE FUNCTION public.deduct_stock_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  remaining numeric;
  stock_row record;
BEGIN
  remaining := NEW.quantity;

  FOR stock_row IN
    SELECT id, quantity FROM public.stock
    WHERE article_id = NEW.article_id AND quantity > 0
    ORDER BY updated_at ASC
  LOOP
    IF remaining <= 0 THEN
      EXIT;
    END IF;

    IF stock_row.quantity >= remaining THEN
      UPDATE public.stock SET quantity = quantity - remaining, updated_at = now() WHERE id = stock_row.id;
      remaining := 0;
    ELSE
      remaining := remaining - stock_row.quantity;
      UPDATE public.stock SET quantity = 0, updated_at = now() WHERE id = stock_row.id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_deduct_stock_on_order
AFTER INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.deduct_stock_on_order();
