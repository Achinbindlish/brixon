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
      const { data, error } = await supabase.functions.invoke(
        "google-sheets-inventory",
        {
          body: {
            action: "process-order",
            items: items.map((i) => ({
              article_no: i.article.articleNumber,
              quantity: i.quantity,
            })),
          },
        }
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return (data?.order_id as string | null) ?? null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles-with-stock"] });
    },
  });
};
