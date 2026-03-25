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
  const [realtimeActive, setRealtimeActive] = useState(false);
  const [lastRealtimeEvent, setLastRealtimeEvent] = useState<string | null>(null);
  const { data: lastSynced, refetch: refetchSynced } = useLastSynced();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!realtimeActive) return;

    const channel = supabase
      .channel("admin-sync-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "articles" }, () => {
        setLastRealtimeEvent(new Date().toISOString());
        refetchSynced();
        queryClient.invalidateQueries({ queryKey: ["articles"] });
        toast({ title: "Price list updated in real-time" });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "stock" }, () => {
        setLastRealtimeEvent(new Date().toISOString());
        refetchSynced();
        queryClient.invalidateQueries({ queryKey: ["stock"] });
        toast({ title: "Stock updated in real-time" });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [realtimeActive, refetchSynced, queryClient]);

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
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* How-to Card */}
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-start gap-3">
          <ExternalLink className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">How to get the CSV URL</p>
            <ol className="text-xs text-muted-foreground space-y-0.5 list-decimal list-inside">
              <li>Open your Google Sheet</li>
              <li>Go to <strong>File → Share → Publish to web</strong></li>
              <li>Select the sheet tab and choose <strong>CSV</strong> format</li>
              <li>Click <strong>Publish</strong> and copy the URL</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Realtime + Last Synced Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Realtime Sync */}
        <div className="bg-card rounded-lg border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary shrink-0" />
            <h3 className="text-sm font-semibold text-foreground">Realtime Sync</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Auto-update when Sheets pushes data via webhook
          </p>
          <button
            onClick={() => setRealtimeActive(!realtimeActive)}
            className={`w-full h-9 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-all ${
              realtimeActive
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {realtimeActive ? (
              <><Wifi className="h-3.5 w-3.5" /> Listening</>
            ) : (
              <><WifiOff className="h-3.5 w-3.5" /> Start Realtime</>
            )}
          </button>
          {realtimeActive && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-border pt-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span>Last event: {lastRealtimeEvent ? formatTimestamp(lastRealtimeEvent) : "Waiting..."}</span>
            </div>
          )}
        </div>

        {/* Last Synced */}
        <div className="bg-card rounded-lg border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary shrink-0" />
            <h3 className="text-sm font-semibold text-foreground">Last Synced</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Prices</span>
              <span className="text-foreground font-medium">{formatTimestamp(lastSynced?.prices ?? null)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Stock</span>
              <span className="text-foreground font-medium">{formatTimestamp(lastSynced?.stock ?? null)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sync Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Price List Sync */}
        <div className="bg-card rounded-lg border border-border p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Price List Sheet</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Columns: <code className="bg-muted px-1 rounded text-[11px]">article_number</code>, <code className="bg-muted px-1 rounded text-[11px]">description</code>, <code className="bg-muted px-1 rounded text-[11px]">price</code>, <code className="bg-muted px-1 rounded text-[11px]">unit</code>, <code className="bg-muted px-1 rounded text-[11px]">stock_unit</code>
          </p>
          <input
            value={priceSheetUrl}
            onChange={(e) => setPriceSheetUrl(e.target.value)}
            placeholder="Paste published CSV URL"
            className="w-full h-9 px-3 rounded-md border border-input bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={() => handleSync("prices")}
            disabled={syncing === "prices" || !priceSheetUrl}
            className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {syncing === "prices" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {syncing === "prices" ? "Syncing..." : "Sync Prices"}
          </button>
        </div>

        {/* Stock Sync */}
        <div className="bg-card rounded-lg border border-border p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Stock Position Sheet</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Columns: <code className="bg-muted px-1 rounded text-[11px]">article_number</code>, <code className="bg-muted px-1 rounded text-[11px]">quantity</code>
          </p>
          <input
            value={stockSheetUrl}
            onChange={(e) => setStockSheetUrl(e.target.value)}
            placeholder="Paste published CSV URL"
            className="w-full h-9 px-3 rounded-md border border-input bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={() => handleSync("stock")}
            disabled={syncing === "stock" || !stockSheetUrl}
            className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {syncing === "stock" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {syncing === "stock" ? "Syncing..." : "Sync Stock"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SheetsSync;
