import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// --- Google Sheets API Auth via Service Account JWT ---

function base64url(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function getAccessToken(saJson: string): Promise<string> {
  const sa = JSON.parse(saJson);
  if (!sa.client_email || !sa.private_key) {
    throw new Error("Invalid credentials");
  }

  const now = Math.floor(Date.now() / 1000);
  const encoder = new TextEncoder();

  const header = base64url(
    encoder.encode(JSON.stringify({ alg: "RS256", typ: "JWT" }))
  );
  const payload = base64url(
    encoder.encode(
      JSON.stringify({
        iss: sa.client_email,
        scope: "https://www.googleapis.com/auth/spreadsheets",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      })
    )
  );

  const signingInput = `${header}.${payload}`;

  const pemBody = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const keyData = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    encoder.encode(signingInput)
  );

  const jwt = `${signingInput}.${base64url(new Uint8Array(signature))}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    throw new Error(
      `Invalid credentials: ${tokenData.error_description || tokenData.error}`
    );
  }

  return tokenData.access_token;
}

// --- Google Sheets Helpers ---

async function getSheetData(
  accessToken: string,
  sheetId: string,
  sheetName: string
): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 404 || res.status === 403)
      throw new Error("Sheet not accessible");
    throw new Error(`Sheet error: ${err.error?.message || res.status}`);
  }
  const data = await res.json();
  return data.values || [];
}

async function updateSheetCell(
  accessToken: string,
  sheetId: string,
  range: string,
  value: string
): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: [[value]] }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Update failed: ${err.error?.message || res.status}`);
  }
}

async function appendSheetRow(
  accessToken: string,
  sheetId: string,
  sheetName: string,
  values: string[]
): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: [values] }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Append failed: ${err.error?.message || res.status}`);
  }
}

// --- Config ---

async function getConfig(supabase: any) {
  const { data } = await supabase
    .from("sync_settings")
    .select("setting_key, setting_value");
  const map: Record<string, string> = {};
  for (const s of data || []) map[s.setting_key] = s.setting_value;
  return {
    sheetId: map["google_sheet_id"] || "",
    sheetName: map["google_sheet_name"] || "Sheet1",
    serviceAccountJson: map["service_account_json"] || "",
    priceSheetId: map["price_sheet_id"] || "",
    priceSheetName: map["price_sheet_name"] || "Sheet1",
  };
}

// Fetch price map { ARTICLE_NO_UPPER: price } from the prices spreadsheet.
// Schema: column A = Article_No, column B = Price
async function getPriceMap(
  accessToken: string,
  priceSheetId: string,
  priceSheetName: string
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!priceSheetId) return map;
  try {
    const values = await getSheetData(accessToken, priceSheetId, priceSheetName);
    for (let i = 1; i < values.length; i++) {
      const article = (values[i][0] || "").trim().toUpperCase();
      const price = Number(values[i][1] || 0);
      if (article) map.set(article, isNaN(price) ? 0 : price);
    }
  } catch (e) {
    console.error("Price sheet fetch failed:", e);
  }
  return map;
}

// Column layout: Article_No=A(0), Bundle_No=B(1), Stock=C(2), Price Per Meter=D(3)

type SheetRow = {
  rowIndex: number;
  articleNo: string;
  bundleNo: string;
  stock: number;
  pricePerMeter: number;
};

function parseRows(values: string[][]): SheetRow[] {
  if (values.length < 2) return [];
  return values.slice(1).map((row, i) => ({
    rowIndex: i + 2, // 1-indexed, +1 for header
    articleNo: (row[0] || "").trim(),
    bundleNo: (row[1] || "").trim(),
    stock: Number(row[2] || 0),
    pricePerMeter: Number(row[3] || 0),
  }));
}

function groupByArticle(rows: SheetRow[]) {
  const grouped = new Map<string, SheetRow[]>();
  for (const row of rows) {
    if (!row.articleNo) continue;
    const existing = grouped.get(row.articleNo) || [];
    existing.push(row);
    grouped.set(row.articleNo, existing);
  }
  return Array.from(grouped.entries()).map(([articleNo, bundles]) => ({
    id: articleNo,
    articleNumber: articleNo,
    description: "",
    price: bundles[0]?.pricePerMeter || 0,
    unit: "pc",
    stockUnit: "meter",
    stock: bundles.reduce((sum, b) => sum + b.stock, 0),
    stockBreakdown: bundles.map((b) => b.stock),
    bundles: bundles.map((b) => ({
      bundleNo: b.bundleNo,
      stock: b.stock,
      rowIndex: b.rowIndex,
    })),
  }));
}

// --- Main Handler ---

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { action } = body ?? {};
    if (!action || typeof action !== "string") {
      throw new Error("Invalid input: action is required");
    }

    const adminActions = [
      "save-config",
      "test-connection",
      "update-row",
      "add-row",
    ];
    const publicActions = ["get-all", "search", "process-order"];
    if (!adminActions.includes(action) && !publicActions.includes(action)) {
      throw new Error("Invalid input: unknown action");
    }

    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claimsData, error: authError } = await userClient.auth.getClaims(token);

      if (!authError) {
        userId = claimsData?.claims?.sub ?? null;
      }
    }

    if (adminActions.includes(action)) {
      if (!userId) throw new Error("Not authenticated");
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (!isAdmin) throw new Error("Admin access required");
    }

    // === SAVE CONFIG ===
    if (action === "save-config") {
      const { sheet_id, sheet_name, service_account_json } = body;
      if (!sheet_id) throw new Error("Invalid input: Sheet ID is required");

      const settings: { setting_key: string; setting_value: string }[] = [
        { setting_key: "google_sheet_id", setting_value: sheet_id },
        {
          setting_key: "google_sheet_name",
          setting_value: sheet_name || "Sheet1",
        },
      ];

      if (service_account_json) {
        try {
          const parsed = JSON.parse(service_account_json);
          if (!parsed.client_email || !parsed.private_key) {
            throw new Error(
              "Invalid credentials: missing client_email or private_key"
            );
          }
        } catch (e) {
          if (e.message.includes("Invalid credentials")) throw e;
          throw new Error("Invalid credentials: malformed JSON");
        }
        settings.push({
          setting_key: "service_account_json",
          setting_value: service_account_json,
        });
      }

      for (const s of settings) {
        const { data: existing } = await supabase
          .from("sync_settings")
          .select("id")
          .eq("setting_key", s.setting_key)
          .maybeSingle();
        if (existing) {
          await supabase
            .from("sync_settings")
            .update({
              setting_value: s.setting_value,
              updated_at: new Date().toISOString(),
            })
            .eq("setting_key", s.setting_key);
        } else {
          await supabase.from("sync_settings").insert(s);
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: "Configuration saved" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === TEST CONNECTION ===
    if (action === "test-connection") {
      const config = await getConfig(supabase);
      if (!config.sheetId || !config.serviceAccountJson) {
        throw new Error(
          "Invalid input: Configure Sheet ID and credentials first"
        );
      }
      const token = await getAccessToken(config.serviceAccountJson);
      const values = await getSheetData(token, config.sheetId, config.sheetName);
      const rows = parseRows(values);
      return new Response(
        JSON.stringify({
          success: true,
          message: `Connected! Found ${rows.length} data rows`,
          rowCount: rows.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === GET ALL ===
    if (action === "get-all") {
      const config = await getConfig(supabase);
      if (!config.sheetId || !config.serviceAccountJson) {
        return new Response(
          JSON.stringify({ success: true, data: [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const token = await getAccessToken(config.serviceAccountJson);
      const values = await getSheetData(token, config.sheetId, config.sheetName);
      const articles = groupByArticle(parseRows(values));

      return new Response(
        JSON.stringify({ success: true, data: articles }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === SEARCH ===
    if (action === "search") {
      const { article_no } = body;
      if (!article_no) throw new Error("Invalid input: article_no is required");

      const config = await getConfig(supabase);
      if (!config.sheetId || !config.serviceAccountJson) {
        return new Response(
          JSON.stringify({
            success: true,
            data: null,
            message: "Bundle not found",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const token = await getAccessToken(config.serviceAccountJson);
      const values = await getSheetData(token, config.sheetId, config.sheetName);
      const rows = parseRows(values);
      const matching = rows.filter(
        (r) => r.articleNo.toUpperCase() === article_no.toUpperCase()
      );

      if (matching.length === 0) {
        return new Response(
          JSON.stringify({
            success: true,
            data: null,
            message: "Bundle not found",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = {
        id: matching[0].articleNo,
        articleNumber: matching[0].articleNo,
        description: "",
        price: matching[0].pricePerMeter || 0,
        unit: "pc",
        stockUnit: "meter",
        stock: matching.reduce((sum, b) => sum + b.stock, 0),
        stockBreakdown: matching.map((b) => b.stock),
        bundles: matching.map((b) => ({
          bundleNo: b.bundleNo,
          stock: b.stock,
          rowIndex: b.rowIndex,
        })),
      };

      return new Response(
        JSON.stringify({ success: true, data: result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === PROCESS ORDER ===
    if (action === "process-order") {
      const { items } = body;
      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new Error("Invalid input: items array is required");
      }

      const config = await getConfig(supabase);
      if (!config.sheetId || !config.serviceAccountJson) {
        throw new Error("Invalid input: Google Sheets not configured");
      }

      const token = await getAccessToken(config.serviceAccountJson);
      const values = await getSheetData(token, config.sheetId, config.sheetName);
      const allRows = parseRows(values);

      let grandTotal = 0;
      const orderItemsData: any[] = [];
      const stockUpdates: { rowIndex: number; newStock: number }[] = [];

      for (const item of items) {
        const { article_no, quantity } = item;
        if (!article_no || !quantity || quantity <= 0) {
          throw new Error(
            "Invalid input: each item needs article_no and positive quantity"
          );
        }

        const bundles = allRows.filter(
          (r) => r.articleNo.toUpperCase() === article_no.toUpperCase()
        );
        if (bundles.length === 0) {
          throw new Error(`Bundle not found: ${article_no}`);
        }

        const totalStock = bundles.reduce((sum, b) => sum + b.stock, 0);
        if (quantity > totalStock) {
          throw new Error(
            `Insufficient stock for ${article_no}: available ${totalStock}, requested ${quantity}`
          );
        }

        // FIFO deduction across bundles
        let remaining = quantity;
        for (const bundle of bundles) {
          if (remaining <= 0) break;
          const deduct = Math.min(remaining, bundle.stock);
          stockUpdates.push({
            rowIndex: bundle.rowIndex,
            newStock: bundle.stock - deduct,
          });
          remaining -= deduct;
        }

        const total = 0; // No price in sheet
        grandTotal += total;

        orderItemsData.push({
          article_number: bundles[0].articleNo,
          description: "",
          price: 0,
          quantity,
          total,
          stock_unit: "meter",
        });
      }

      // Update Google Sheet stock values (column C)
      for (const update of stockUpdates) {
        await updateSheetCell(
          token,
          config.sheetId,
          `${config.sheetName}!C${update.rowIndex}`,
          String(update.newStock)
        );
      }

      // Create order in Supabase for history
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({ user_id: userId, grand_total: grandTotal })
        .select("id")
        .single();
      if (orderError) throw orderError;

      const orderId = orderData.id;
      const orderItems = orderItemsData.map((item) => ({
        ...item,
        order_id: orderId,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);
      if (itemsError) throw itemsError;

      return new Response(
        JSON.stringify({
          success: true,
          order_id: orderId,
          message: "Order placed successfully",
          grand_total: grandTotal,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === UPDATE ROW (Admin) ===
    if (action === "update-row") {
      const { article_no, bundle_no, data: updateData } = body;
      if (!article_no) throw new Error("Invalid input: article_no required");

      const config = await getConfig(supabase);
      if (!config.sheetId || !config.serviceAccountJson) {
        throw new Error("Invalid input: Google Sheets not configured");
      }

      const token = await getAccessToken(config.serviceAccountJson);
      const values = await getSheetData(token, config.sheetId, config.sheetName);
      const rows = parseRows(values);

      const target = rows.find(
        (r) =>
          r.articleNo.toUpperCase() === article_no.toUpperCase() &&
          (!bundle_no ||
            r.bundleNo.toUpperCase() === bundle_no.toUpperCase())
      );
      if (!target) throw new Error("Bundle not found");

      if (updateData.stock !== undefined) {
        await updateSheetCell(
          token,
          config.sheetId,
          `${config.sheetName}!C${target.rowIndex}`,
          String(updateData.stock)
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "Row updated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === ADD ROW (Admin) ===
    if (action === "add-row") {
      const { article_no, bundle_no, stock } = body;
      if (!article_no || !bundle_no)
        throw new Error("Invalid input: article_no and bundle_no required");

      const config = await getConfig(supabase);
      if (!config.sheetId || !config.serviceAccountJson) {
        throw new Error("Invalid input: Google Sheets not configured");
      }

      const token = await getAccessToken(config.serviceAccountJson);
      const values = await getSheetData(token, config.sheetId, config.sheetName);
      const rows = parseRows(values);

      const exists = rows.find(
        (r) =>
          r.articleNo.toUpperCase() === article_no.toUpperCase() &&
          r.bundleNo.toUpperCase() === bundle_no.toUpperCase()
      );
      if (exists) throw new Error("Bundle already exists");

      await appendSheetRow(token, config.sheetId, config.sheetName, [
        article_no,
        bundle_no,
        String(stock || 0),
      ]);

      return new Response(
        JSON.stringify({ success: true, message: "Row added" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid input: unknown action");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("Not authenticated")
      ? 401
      : message.includes("Admin access required")
        ? 403
        : 400;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
