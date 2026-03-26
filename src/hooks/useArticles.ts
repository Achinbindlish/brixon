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
      const { data, error } = await supabase.functions.invoke(
        "google-sheets-inventory",
        { body: { action: "get-all" } }
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return (data?.data || []).map((a: any) => ({
        id: a.id,
        articleNumber: a.articleNumber,
        description: a.description || "",
        price: a.price,
        unit: a.unit || "pc",
        stockUnit: a.stockUnit || "meter",
        stock: a.stock,
        stockBreakdown: a.stockBreakdown || [],
      }));
    },
    staleTime: 0,
    gcTime: 0,
  });
};
