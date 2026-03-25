import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Loader2, ExternalLink, Clock, Radio, Wifi, WifiOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const useLastSynced = () => {
  return useQuery({
    queryKey: ["last-synced"],
    queryFn: async () => {
      const [{ data: artData }, { data: stockData }] = await Promise.all([
        supabase.from("articles").select("updated_at").order("updated_at", { ascending: false }).limit(1),
        supabase.from("stock").select("updated_at").order("updated_at", { ascending: false }).limit(1),
      ]);
      return {
        prices: artData?.[0]?.updated_at || null,
        stock: stockData?.[0]?.updated_at || null,
      };
    },
    refetchInterval: 30000,
  });
};

const formatTimestamp = (ts: string | null) => {
  if (!ts) return "Never";
  const d = new Date(ts);
  return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};

const SheetsSync = () => {
  const [priceSheetUrl, setPriceSheetUrl] = useState("");
  const [stockSheetUrl, setStockSheetUrl] = useState("");
  const [syncing, setSyncing] = useState<"" | "prices" | "stock">("");
  const { data: lastSynced, refetch: refetchSynced } = useLastSynced();

  const handleSync = async (type: "prices" | "stock") => {
    const url = type === "prices" ? priceSheetUrl : stockSheetUrl;
    if (!url) {
      toast({ title: "Enter a Google Sheets published CSV URL", variant: "destructive" });
      return;
    }

    setSyncing(type);
    try {
      const { data, error } = await supabase.functions.invoke("sync-google-sheet", {
        body: { type, csvUrl: url },
      });
      if (error) throw error;
      toast({
        title: `${type === "prices" ? "Price list" : "Stock"} synced!`,
        description: data?.message || `${data?.count || 0} records updated`,
      });
      refetchSynced();
    } catch (err: any) {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    } finally {
      setSyncing("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-start gap-3">
          <ExternalLink className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">How to get the CSV URL</p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Open your Google Sheet</li>
              <li>Go to <strong>File → Share → Publish to web</strong></li>
              <li>Select the sheet tab and choose <strong>CSV</strong> format</li>
              <li>Click <strong>Publish</strong> and copy the URL</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Last Synced */}
      <div className="bg-card rounded-xl border border-border p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4 shrink-0" />
          <span className="text-xs font-medium">Last synced</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 text-xs">
          <span className="text-foreground">
            <span className="text-muted-foreground">Prices:</span>{" "}
            {formatTimestamp(lastSynced?.prices ?? null)}
          </span>
          <span className="text-foreground">
            <span className="text-muted-foreground">Stock:</span>{" "}
            {formatTimestamp(lastSynced?.stock ?? null)}
          </span>
        </div>
      </div>

      {/* Price List Sync */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Price List Sheet</h3>
        <p className="text-xs text-muted-foreground">
          Expected columns: <code className="bg-muted px-1 rounded">article_number</code>, <code className="bg-muted px-1 rounded">description</code>, <code className="bg-muted px-1 rounded">price</code>, <code className="bg-muted px-1 rounded">unit</code>, <code className="bg-muted px-1 rounded">stock_unit</code>
        </p>
        <input
          value={priceSheetUrl}
          onChange={(e) => setPriceSheetUrl(e.target.value)}
          placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
          className="w-full h-10 px-3 rounded-lg border border-input bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={() => handleSync("prices")}
          disabled={syncing === "prices" || !priceSheetUrl}
          className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
        >
          {syncing === "prices" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {syncing === "prices" ? "Syncing..." : "Sync Price List"}
        </button>
      </div>

      {/* Stock Sync */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Stock Position Sheet</h3>
        <p className="text-xs text-muted-foreground">
          Expected columns: <code className="bg-muted px-1 rounded">article_number</code>, <code className="bg-muted px-1 rounded">quantity</code>
        </p>
        <input
          value={stockSheetUrl}
          onChange={(e) => setStockSheetUrl(e.target.value)}
          placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
          className="w-full h-10 px-3 rounded-lg border border-input bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={() => handleSync("stock")}
          disabled={syncing === "stock" || !stockSheetUrl}
          className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
        >
          {syncing === "stock" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {syncing === "stock" ? "Syncing..." : "Sync Stock Positions"}
        </button>
      </div>
    </div>
  );
};

export default SheetsSync;
