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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify user is admin
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { data: roleData } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!roleData) throw new Error("Admin access required");

    const { type, csvUrl } = await req.json();
    if (!type || !csvUrl) throw new Error("Missing type or csvUrl");

    // Fetch CSV
    const csvResponse = await fetch(csvUrl);
    if (!csvResponse.ok) throw new Error(`Failed to fetch CSV: ${csvResponse.status}`);
    const csvText = await csvResponse.text();
    const rows = parseCSV(csvText);

    if (rows.length === 0) throw new Error("No data found in CSV");

    let count = 0;

    if (type === "prices") {
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
    } else if (type === "stock") {
      for (const row of rows) {
        const articleNumber = row.article_number || row.articlenumber || row.article || "";
        if (!articleNumber) continue;

        // Find article ID
        const { data: article } = await supabase
          .from("articles")
          .select("id")
          .eq("article_number", articleNumber)
          .maybeSingle();

        if (!article) continue;

        const { error } = await supabase.from("stock").upsert(
          {
            article_id: article.id,
            quantity: Number(row.quantity || row.stock || row.qty || 0),
          },
          { onConflict: "article_id" }
        );
        if (!error) count++;
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
