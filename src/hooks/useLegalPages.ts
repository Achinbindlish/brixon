import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LegalPage = {
  id: string;
  slug: string;
  title: string;
  content: string;
  updated_at: string;
};

export const useLegalPage = (slug: string) =>
  useQuery({
    queryKey: ["legal_page", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_pages")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data as LegalPage | null;
    },
  });

export const useAllLegalPages = () =>
  useQuery({
    queryKey: ["legal_pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_pages")
        .select("*")
        .order("slug");
      if (error) throw error;
      return data as LegalPage[];
    },
  });

export const useUpsertLegalPage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (page: { slug: string; title: string; content: string }) => {
      const { error } = await supabase
        .from("legal_pages")
        .upsert({ ...page, updated_at: new Date().toISOString() }, { onConflict: "slug" });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["legal_page", variables.slug] });
      queryClient.invalidateQueries({ queryKey: ["legal_pages"] });
    },
  });
};
