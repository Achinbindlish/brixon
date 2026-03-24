import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ArticleWithStock } from "./useArticles";

type OrderItem = {
  article: ArticleWithStock;
  quantity: number;
};

export const usePlaceOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: OrderItem[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const grandTotal = items.reduce((sum, i) => sum + i.article.price * i.quantity, 0);

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({ user_id: user.id, grand_total: grandTotal })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = items.map((i) => ({
        order_id: order.id,
        article_id: i.article.id,
        article_number: i.article.articleNumber,
        description: i.article.description,
        price: i.article.price,
        quantity: i.quantity,
        total: i.article.price * i.quantity,
        stock_unit: i.article.stockUnit,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw itemsError;

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles-with-stock"] });
    },
  });
};
