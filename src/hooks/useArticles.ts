import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ArticleWithStock = {
  id: string;
  articleNumber: string;
  description: string;
  price: number;
  unit: string;
  stockUnit: string;
  stock: number;
};

export const useArticles = () => {
  return useQuery({
    queryKey: ["articles-with-stock"],
    queryFn: async (): Promise<ArticleWithStock[]> => {
      const { data, error } = await supabase
        .from("articles")
        .select("*, stock(quantity)")
        .order("article_number");

      if (error) throw error;

      return (data || []).map((a) => ({
        id: a.id,
        articleNumber: a.article_number,
        description: a.description,
        price: a.price,
        unit: a.unit,
        stockUnit: a.stock_unit,
        stock: (a.stock as any)?.quantity ?? 0,
      }));
    },
  });
};
