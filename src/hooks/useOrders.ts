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
      const p_items = items.map((i) => ({
        article_id: i.article.id,
        quantity: i.quantity,
      }));

      const { data, error } = await supabase.rpc("process_order", {
        p_items: p_items as any,
      });

      if (error) throw error;
      return data as string; // order id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles-with-stock"] });
    },
  });
};
