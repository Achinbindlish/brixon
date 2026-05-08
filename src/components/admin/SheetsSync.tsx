import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, CheckCircle, Upload, FileText, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const useSyncSettings = () => {
  return useQuery({
    queryKey: ["sync-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sync_settings")
        .select("setting_key, setting_value");
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const s of data || []) {
        map[s.setting_key] = s.setting_value;
      }
      return map;
    },
  });
};

const SheetsSync = () => {
  const [sheetId, setSheetId] = useState("");
  const [sheetName, setSheetName] = useState("Sheet1");
  const [priceSheetId, setPriceSheetId] = useState("");
  const [priceSheetName, setPriceSheetName] = useState("Sheet1");
  const [credentialsFile, setCredentialsFile] = useState<File | null>(null);
  const [credentialsLoaded, setCredentialsLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const { data: syncSettings, refetch: refetchSettings } = useSyncSettings();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (syncSettings) {
      setSheetId(syncSettings["google_sheet_id"] || "");
      setSheetName(syncSettings["google_sheet_name"] || "Sheet1");
      setPriceSheetId(syncSettings["price_sheet_id"] || "");
      setPriceSheetName(syncSettings["price_sheet_name"] || "Sheet1");
      setCredentialsLoaded(!!syncSettings["service_account_json"]);
    }
  }, [syncSettings]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".json")) {
        toast({
          title: "Invalid file",
          description: "Please upload a JSON file",
          variant: "destructive",
        });
        return;
      }
      setCredentialsFile(file);
    }
  };

  const handleSave = async () => {
    if (!sheetId.trim()) {
      toast({ title: "Sheet ID required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      let serviceAccountJson: string | undefined;
      if (credentialsFile) {
        serviceAccountJson = await credentialsFile.text();
        try {
          const parsed = JSON.parse(serviceAccountJson);
          if (!parsed.client_email || !parsed.private_key) {
            throw new Error("Missing required fields");
          }
        } catch {
          toast({
            title: "Invalid credentials",
            description:
              "JSON file must contain client_email and private_key",
            variant: "destructive",
          });
          setSaving(false);
          return;
        }
      }

      const { data, error } = await supabase.functions.invoke(
        "google-sheets-inventory",
        {
          body: {
            action: "save-config",
            sheet_id: sheetId.trim(),
            sheet_name: sheetName.trim() || "Sheet1",
            price_sheet_id: priceSheetId.trim(),
            price_sheet_name: priceSheetName.trim() || "Sheet1",
            ...(serviceAccountJson && { service_account_json: serviceAccountJson }),
          },
        }
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Configuration saved" });
      setCredentialsFile(null);
      setCredentialsLoaded(true);
      refetchSettings();
      queryClient.invalidateQueries({ queryKey: ["articles-with-stock"] });
      queryClient.invalidateQueries({ queryKey: ["admin-articles"] });
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "google-sheets-inventory",
        { body: { action: "test-connection" } }
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: "Connection successful!",
        description: data.message,
      });
    } catch (err: any) {
      toast({
        title: "Connection failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Setup Instructions */}
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Setup Instructions
            </p>
            <ol className="text-xs text-muted-foreground space-y-0.5 list-decimal list-inside">
              <li>
                Go to <strong>Google Cloud Console</strong>
              </li>
              <li>
                Enable <strong>Google Sheets API</strong>
              </li>
              <li>
                Create a <strong>Service Account</strong>
              </li>
              <li>
                Download the <strong>JSON credentials</strong> file
              </li>
              <li>Open your Google Sheet</li>
              <li>
                Click <strong>'Share'</strong>
              </li>
              <li>
                Give <strong>Editor access</strong> to the service account email
              </li>
              <li>
                Copy <strong>Sheet ID</strong> from URL and paste below
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* Sheet Structure Info */}
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-start gap-3">
          <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Required Sheet Structure
            </p>
            <p className="text-xs text-muted-foreground">
              Columns must be in this exact order:
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {[
                "Article_No",
                "Bundle_No",
                "Stock",
              ].map((col) => (
                <code
                  key={col}
                  className="bg-muted px-1.5 py-0.5 rounded text-[11px] text-foreground"
                >
                  {col}
                </code>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Configuration */}
      <div className="bg-card rounded-lg border border-border p-4 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">
          Google Sheets Configuration
        </h3>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Google Sheet ID
            </label>
            <input
              value={sheetId}
              onChange={(e) => setSheetId(e.target.value)}
              placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
              className="w-full h-9 px-3 rounded-md border border-input bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <p className="text-[11px] text-muted-foreground">
              Found in the URL: docs.google.com/spreadsheets/d/
              <strong>SHEET_ID</strong>/edit
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Sheet Name
            </label>
            <input
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
              placeholder="Sheet1"
              className="w-full h-9 px-3 rounded-md border border-input bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5 pt-2 border-t border-border">
            <label className="text-xs font-medium text-foreground">
              Price Spreadsheet ID (separate sheet)
            </label>
            <input
              value={priceSheetId}
              onChange={(e) => setPriceSheetId(e.target.value)}
              placeholder="Spreadsheet ID with Article_No + Price"
              className="w-full h-9 px-3 rounded-md border border-input bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <p className="text-[11px] text-muted-foreground">
              Two columns: <code className="bg-muted px-1 rounded">Article_No</code>, <code className="bg-muted px-1 rounded">Price</code>. Share with the same service account.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Price Sheet Tab Name
            </label>
            <input
              value={priceSheetName}
              onChange={(e) => setPriceSheetName(e.target.value)}
              placeholder="Sheet1"
              className="w-full h-9 px-3 rounded-md border border-input bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5 pt-2 border-t border-border">
            <label className="text-xs font-medium text-foreground">
              Service Account JSON Credentials
            </label>
            <div className="flex items-center gap-3">
              <label className="flex-1 h-9 px-3 rounded-md border border-input bg-card text-sm flex items-center gap-2 cursor-pointer hover:bg-secondary/50 transition-colors">
                <Upload className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground truncate">
                  {credentialsFile
                    ? credentialsFile.name
                    : "Choose JSON file..."}
                </span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              {(credentialsLoaded || credentialsFile) && (
                <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
              )}
            </div>
            {credentialsLoaded && !credentialsFile && (
              <p className="text-[11px] text-green-600">
                Credentials already configured. Upload new file to replace.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !sheetId.trim()}
          className="h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "Saving..." : "Save Configuration"}
        </button>
        <button
          onClick={handleTestConnection}
          disabled={testing}
          className="h-10 rounded-md bg-secondary text-secondary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:bg-secondary/80 disabled:opacity-50 transition-all"
        >
          {testing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          {testing ? "Testing..." : "Test Connection"}
        </button>
      </div>
    </div>
  );
};

export default SheetsSync;
