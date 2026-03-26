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
      // Fetch all articles with pagination to avoid 1000-row limit
      const allArticles: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("articles")
          .select("*")
          .order("article_number")
          .range(from, from + 999);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allArticles.push(...data);
        if (data.length < 1000) break;
        from += 1000;
      }

      // Fetch all stock with pagination
      const allStock: any[] = [];
      from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("stock")
          .select("article_id, quantity")
          .range(from, from + 999);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allStock.push(...data);
        if (data.length < 1000) break;
        from += 1000;
      }

      // Group stock entries by article_id
      const stockMap = new Map<string, number[]>();
      for (const s of allStock) {
        const existing = stockMap.get(s.article_id) || [];
        existing.push(Number(s.quantity));
        stockMap.set(s.article_id, existing);
      }

      return allArticles.map((a) => {
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
