import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"));
  return lines.slice(1).map((line) => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { values.push(current.trim()); current = ""; }
      else { current += ch; }
    }
    values.push(current.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = values[i] || ""));
    return row;
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { data: roleData } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!roleData) throw new Error("Admin access required");

    const { type, csvUrl } = await req.json();
    if (!type || !csvUrl) throw new Error("Missing type or csvUrl");

    const csvResponse = await fetch(csvUrl);
    if (!csvResponse.ok) throw new Error(`Failed to fetch CSV: ${csvResponse.status}`);
    const csvText = await csvResponse.text();
    const rows = parseCSV(csvText);

    if (rows.length === 0) throw new Error("No data found in CSV");

    let count = 0;
    const BATCH_SIZE = 500;

    if (type === "prices") {
      const records: any[] = [];
      for (const row of rows) {
        const articleNumber = row.article_number || row.articlenumber || row.article || "";
        if (!articleNumber) continue;
        records.push({
          article_number: articleNumber,
          description: row.description || row.desc || "",
          price: Number(row.price || row.mrp || 0),
          unit: row.unit || "pc",
          stock_unit: row.stock_unit || row.stockunit || "meter",
        });
      }
      // Deduplicate: keep last occurrence per article_number
      const deduped = new Map<string, any>();
      for (const r of records) deduped.set(r.article_number, r);
      const unique = Array.from(deduped.values());

      for (let i = 0; i < unique.length; i += BATCH_SIZE) {
        const batch = unique.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from("articles").upsert(batch, { onConflict: "article_number" });
        if (!error) count += batch.length;
      }
    } else if (type === "stock") {
      await supabase.from("stock").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      // First, fetch all articles to build a lookup map
      const allArticles: { id: string; article_number: string }[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("articles")
          .select("id, article_number")
          .range(from, from + 999);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allArticles.push(...data);
        if (data.length < 1000) break;
        from += 1000;
      }
      const articleMap = new Map<string, string>();
      for (const a of allArticles) articleMap.set(a.article_number, a.id);

      const stockRecords: any[] = [];
      for (const row of rows) {
        const articleNumber = row.article_number || row.articlenumber || row.article || "";
        if (!articleNumber) continue;
        const articleId = articleMap.get(articleNumber);
        if (!articleId) continue;
        const qty = Number(row.quantity || row.stock || row.qty || 0);
        if (qty <= 0) continue;
        stockRecords.push({ article_id: articleId, quantity: qty });
      }

      for (let i = 0; i < stockRecords.length; i += BATCH_SIZE) {
        const batch = stockRecords.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from("stock").insert(batch);
        if (!error) count += batch.length;
      }
    } else {
      throw new Error("Invalid type. Use 'prices' or 'stock'");
    }

    return new Response(
      JSON.stringify({ success: true, message: `${count} records synced`, count }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
