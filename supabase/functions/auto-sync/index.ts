import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

const BATCH_SIZE = 500;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: settings } = await supabase
      .from("sync_settings")
      .select("setting_key, setting_value");

    const settingsMap: Record<string, string> = {};
    for (const s of settings || []) {
      settingsMap[s.setting_key] = s.setting_value;
    }

    if (settingsMap["auto_sync_enabled"] !== "true") {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Auto-sync is disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Record<string, any> = {};

    // Sync prices
    const pricesUrl = settingsMap["prices_csv_url"];
    if (pricesUrl) {
      try {
        const csvResponse = await fetch(pricesUrl);
        if (!csvResponse.ok) throw new Error(`HTTP ${csvResponse.status}`);
        const rows = parseCSV(await csvResponse.text());
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
        const deduped = new Map<string, any>();
        for (const r of records) deduped.set(r.article_number, r);
        const unique = Array.from(deduped.values());
        let count = 0;
        for (let i = 0; i < unique.length; i += BATCH_SIZE) {
          const batch = unique.slice(i, i + BATCH_SIZE);
          const { error } = await supabase.from("articles").upsert(batch, { onConflict: "article_number" });
          if (!error) count += batch.length;
        }
        results.prices = { success: true, count };
      } catch (e) {
        results.prices = { success: false, error: e.message };
      }
    }

    // Sync stock
    const stockUrl = settingsMap["stock_csv_url"];
    if (stockUrl) {
      try {
        const csvResponse = await fetch(stockUrl);
        if (!csvResponse.ok) throw new Error(`HTTP ${csvResponse.status}`);
        const rows = parseCSV(await csvResponse.text());

        await supabase.from("stock").delete().neq("id", "00000000-0000-0000-0000-000000000000");

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

        let count = 0;
        for (let i = 0; i < stockRecords.length; i += BATCH_SIZE) {
          const batch = stockRecords.slice(i, i + BATCH_SIZE);
          const { error } = await supabase.from("stock").insert(batch);
          if (!error) count += batch.length;
        }
        results.stock = { success: true, count };
      } catch (e) {
        results.stock = { success: false, error: e.message };
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
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
