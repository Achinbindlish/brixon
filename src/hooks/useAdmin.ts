import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useAdminOrders = () => {
  return useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = [
        ...new Set(
          orders?.map((o) => o.user_id).filter(Boolean) as string[]
        ),
      ];
      let profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, phone")
          .in("user_id", userIds);
        profilesMap = Object.fromEntries(
          (profiles || []).map((p) => [p.user_id, p])
        );
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
      const { error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-orders"] }),
  });
};

export const useAdminArticles = () => {
  return useQuery({
    queryKey: ["admin-articles"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "google-sheets-inventory",
        { body: { action: "get-all" } }
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return (data?.data || []).map((a: any) => ({
        id: a.id,
        article_number: a.articleNumber,
        description: a.description || "",
        price: a.price,
        unit: a.unit || "pc",
        stock_unit: a.stockUnit || "meter",
        stock: { quantity: a.stock },
      }));
    },
    staleTime: 0,
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
        const { data, error } = await supabase.functions.invoke(
          "google-sheets-inventory",
          {
            body: {
              action: "update-row",
              article_no: article.article_number,
              data: {
                price: article.price,
                category: article.description,
              },
            },
          }
        );
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
      } else {
        const { data, error } = await supabase.functions.invoke(
          "google-sheets-inventory",
          {
            body: {
              action: "add-row",
              article_no: article.article_number,
              bundle_no: "1",
              category: article.description,
              stock: 0,
              price: article.price,
            },
          }
        );
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-articles"] }),
  });
};

export const useUpdateStock = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      articleId,
      quantity,
    }: {
      articleId: string;
      quantity: number;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "google-sheets-inventory",
        {
          body: {
            action: "update-row",
            article_no: articleId,
            data: { stock: quantity },
          },
        }
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-articles"] }),
  });
};
