import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useAdminOrders = () => {
  return useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      // Fetch orders
      const { data: orders, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch profiles for all user_ids
      const userIds = [...new Set(orders?.map((o) => o.user_id).filter(Boolean) as string[])];
      let profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, phone")
          .in("user_id", userIds);
        profilesMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p]));
      }

      return (orders || []).map((o) => ({
        ...o,
        profiles: profilesMap[o.user_id || ""] || null,
      }));
    },
  });
};

export const useUpdateOrderStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-orders"] }),
  });
};

export const useAdminArticles = () => {
  return useQuery({
    queryKey: ["admin-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*, stock(quantity)")
        .order("article_number");
      if (error) throw error;
      return data;
    },
  });
};

export const useUpsertArticle = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (article: {
      id?: string;
      article_number: string;
      description: string;
      price: number;
      unit: string;
      stock_unit: string;
    }) => {
      if (article.id) {
        const { error } = await supabase.from("articles").update(article).eq("id", article.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("articles").insert(article);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-articles"] }),
  });
};

export const useUpdateStock = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ articleId, quantity }: { articleId: string; quantity: number }) => {
      const { error } = await supabase
        .from("stock")
        .upsert({ article_id: articleId, quantity }, { onConflict: "article_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-articles"] }),
  });
};
