
CREATE OR REPLACE FUNCTION public.process_order(
  p_items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_order_id uuid;
  v_item jsonb;
  v_article_id uuid;
  v_quantity numeric;
  v_available numeric;
  v_price numeric;
  v_article_number text;
  v_description text;
  v_stock_unit text;
  v_grand_total numeric := 0;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- First pass: validate all items have sufficient stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_article_id := (v_item->>'article_id')::uuid;
    v_quantity := (v_item->>'quantity')::numeric;

    SELECT COALESCE(SUM(s.quantity), 0) INTO v_available
    FROM stock s WHERE s.article_id = v_article_id;

    IF v_available < v_quantity THEN
      SELECT a.article_number INTO v_article_number
      FROM articles a WHERE a.id = v_article_id;
      RAISE EXCEPTION 'Insufficient stock for article %: available %, requested %', 
        COALESCE(v_article_number, v_article_id::text), v_available, v_quantity;
    END IF;
  END LOOP;

  -- Calculate grand total
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_article_id := (v_item->>'article_id')::uuid;
    v_quantity := (v_item->>'quantity')::numeric;

    SELECT a.price INTO v_price FROM articles a WHERE a.id = v_article_id;
    v_grand_total := v_grand_total + (v_price * v_quantity);
  END LOOP;

  -- Create the order
  INSERT INTO orders (user_id, grand_total)
  VALUES (v_user_id, v_grand_total)
  RETURNING id INTO v_order_id;

  -- Insert order items (the existing trigger will deduct stock)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_article_id := (v_item->>'article_id')::uuid;
    v_quantity := (v_item->>'quantity')::numeric;

    SELECT a.price, a.article_number, a.description, a.stock_unit
    INTO v_price, v_article_number, v_description, v_stock_unit
    FROM articles a WHERE a.id = v_article_id;

    INSERT INTO order_items (order_id, article_id, article_number, description, price, quantity, total, stock_unit)
    VALUES (v_order_id, v_article_id, v_article_number, v_description, v_price, v_quantity, v_price * v_quantity, v_stock_unit);
  END LOOP;

  RETURN v_order_id;
END;
$$;
