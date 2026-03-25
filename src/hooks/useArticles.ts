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
  stockBreakdown: number[];
};

export const useArticles = () => {
  return useQuery({
    queryKey: ["articles-with-stock"],
    queryFn: async (): Promise<ArticleWithStock[]> => {
      const { data: articlesData, error: artError } = await supabase
        .from("articles")
        .select("*")
        .order("article_number");

      if (artError) throw artError;

      const { data: stockData, error: stockError } = await supabase
        .from("stock")
        .select("article_id, quantity");

      if (stockError) throw stockError;

      // Group stock entries by article_id
      const stockMap = new Map<string, number[]>();
      for (const s of stockData || []) {
        const existing = stockMap.get(s.article_id) || [];
        existing.push(Number(s.quantity));
        stockMap.set(s.article_id, existing);
      }

      return (articlesData || []).map((a) => {
        const breakdown = stockMap.get(a.id) || [];
        const total = breakdown.reduce((sum, q) => sum + q, 0);
        return {
          id: a.id,
          articleNumber: a.article_number,
          description: a.description,
          price: a.price,
          unit: a.unit,
          stockUnit: a.stock_unit,
          stock: total,
          stockBreakdown: breakdown,
        };
      });
    },
  });
};
