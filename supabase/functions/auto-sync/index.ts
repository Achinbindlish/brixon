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
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Read sync settings
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
        let count = 0;
        for (const row of rows) {
          const articleNumber = row.article_number || row.articlenumber || row.article || "";
          if (!articleNumber) continue;
          const { error } = await supabase.from("articles").upsert(
            {
              article_number: articleNumber,
              description: row.description || row.desc || "",
              price: Number(row.price || row.mrp || 0),
              unit: row.unit || "pc",
              stock_unit: row.stock_unit || row.stockunit || "meter",
            },
            { onConflict: "article_number" }
          );
          if (!error) count++;
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

        let count = 0;
        for (const row of rows) {
          const articleNumber = row.article_number || row.articlenumber || row.article || "";
          if (!articleNumber) continue;
          const { data: article } = await supabase
            .from("articles")
            .select("id")
            .eq("article_number", articleNumber)
            .maybeSingle();
          if (!article) continue;
          const qty = Number(row.quantity || row.stock || row.qty || 0);
          if (qty <= 0) continue;
          const { error } = await supabase.from("stock").insert({
            article_id: article.id,
            quantity: qty,
          });
          if (!error) count++;
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
