import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get("SHEETS_WEBHOOK_SECRET");
    if (webhookSecret) {
      const provided = req.headers.get("x-webhook-secret");
      if (provided !== webhookSecret) {
        return new Response(JSON.stringify({ error: "Invalid webhook secret" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { type, rows } = await req.json();
    // type: "prices" or "stock"
    // rows: array of objects with the sheet data

    if (!type || !rows || !Array.isArray(rows)) {
      throw new Error("Missing 'type' or 'rows' in payload");
    }

    let count = 0;

    if (type === "prices") {
      for (const row of rows) {
        const articleNumber = row.article_number || "";
        if (!articleNumber) continue;

        const { error } = await supabase.from("articles").upsert(
          {
            article_number: articleNumber,
            description: row.description || "",
            price: Number(row.price || 0),
            unit: row.unit || "pc",
            stock_unit: row.stock_unit || "meter",
          },
          { onConflict: "article_number" }
        );
        if (!error) count++;
      }
    } else if (type === "stock") {
      // Clear existing stock and re-insert
      await supabase.from("stock").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      for (const row of rows) {
        const articleNumber = row.article_number || "";
        if (!articleNumber) continue;

        const { data: article } = await supabase
          .from("articles")
          .select("id")
          .eq("article_number", articleNumber)
          .maybeSingle();

        if (!article) continue;

        const qty = Number(row.quantity || 0);
        if (qty <= 0) continue;

        const { error } = await supabase.from("stock").insert({
          article_id: article.id,
          quantity: qty,
        });
        if (!error) count++;
      }
    } else {
      throw new Error("Invalid type. Use 'prices' or 'stock'");
    }

    return new Response(
      JSON.stringify({ success: true, count }),
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
