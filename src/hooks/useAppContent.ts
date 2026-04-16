import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useAppContent = (contentKey: string) => {
  return useQuery({
    queryKey: ["app-content", contentKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_content")
        .select("*")
        .eq("content_key", contentKey)
        .single();
      if (error) throw error;
      return data;
    },
  });
};

export const useAllAppContent = () => {
  return useQuery({
    queryKey: ["app-content-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_content")
        .select("*")
        .order("content_key");
      if (error) throw error;
      return data || [];
    },
  });
};

export const useUpdateAppContent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, title, body }: { id: string; title: string; body: string }) => {
      const { error } = await supabase
        .from("app_content")
        .update({ title, body, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["app-content-all"] });
      qc.invalidateQueries({ queryKey: ["app-content"] });
    },
  });
};
