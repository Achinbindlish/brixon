import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Trash2, Send, Check, RefreshCw, MessageCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const MAX_CONTACTS = 20;

type Contact = { id: string; name: string; phone: string; active: boolean };
type Alert = { id: string; article_no: string; stock: number; threshold: number; source: string; status: string; created_at: string };

const sanitizePhone = (p: string) => p.replace(/[^\d]/g, "");

const AdminLowStock = () => {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [scanning, setScanning] = useState(false);

  const contactsQuery = useQuery({
    queryKey: ["admin-whatsapp-contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_whatsapp_contacts")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as Contact[];
    },
  });

  const alertsQuery = useQuery({
    queryKey: ["low-stock-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("low_stock_alerts")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as Alert[];
    },
    refetchInterval: 15000,
  });

  const addContact = useMutation({
    mutationFn: async () => {
      const cleaned = sanitizePhone(phone);
      if (!cleaned) throw new Error("Phone is required");
      if ((contactsQuery.data?.length || 0) >= MAX_CONTACTS) throw new Error(`Max ${MAX_CONTACTS} contacts`);
      const { error } = await supabase.from("admin_whatsapp_contacts").insert({ name: name.trim(), phone: cleaned, active: true });
      if (error) throw error;
    },
    onSuccess: () => {
      setName(""); setPhone("");
      qc.invalidateQueries({ queryKey: ["admin-whatsapp-contacts"] });
    },
    onError: (e: any) => toast({ title: "Add failed", description: e.message, variant: "destructive" }),
  });

  const toggleContact = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("admin_whatsapp_contacts").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-whatsapp-contacts"] }),
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("admin_whatsapp_contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-whatsapp-contacts"] }),
  });

  const dismissAlert = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("low_stock_alerts").update({ status: "dismissed", sent_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["low-stock-alerts"] }),
  });

  const markSent = async (id: string) => {
    await supabase.from("low_stock_alerts").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["low-stock-alerts"] });
  };

  const sendAlertToContact = (alert: Alert, contact: Contact) => {
    const msg = `⚠️ *Low Stock Alert*\n\nArticle: *${alert.article_no}*\nCurrent stock: *${alert.stock} m*\nThreshold: ${alert.threshold} m\nSource: ${alert.source === "daily" ? "Daily scan" : "Order"}`;
    window.open(`https://wa.me/${contact.phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const sendAlertToAll = (alert: Alert) => {
    const active = (contactsQuery.data || []).filter((c) => c.active);
    if (active.length === 0) {
      toast({ title: "No active contacts", variant: "destructive" });
      return;
    }
    active.forEach((c, i) => setTimeout(() => sendAlertToContact(alert, c), i * 300));
    markSent(alert.id);
  };

  const runScan = async () => {
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-inventory", { body: { action: "scan-low-stock" } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Scan complete", description: `${data.count} alert(s) queued.` });
      qc.invalidateQueries({ queryKey: ["low-stock-alerts"] });
    } catch (e: any) {
      toast({ title: "Scan failed", description: e.message, variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  const contacts = contactsQuery.data || [];
  const alerts = alertsQuery.data || [];

  return (
    <div className="space-y-5">
      {/* Contacts */}
      <div className="bg-card rounded-lg border border-border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">WhatsApp Contacts ({contacts.length}/{MAX_CONTACTS})</h3>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional)"
            className="flex-1 h-9 px-3 rounded-md border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone with country code e.g. 919876543210"
            className="flex-1 h-9 px-3 rounded-md border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
          <button onClick={() => addContact.mutate()} disabled={addContact.isPending || contacts.length >= MAX_CONTACTS}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50">
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
        <div className="divide-y divide-border">
          {contacts.length === 0 && <p className="text-xs text-muted-foreground py-3">No contacts yet.</p>}
          {contacts.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-2 gap-2">
              <div className="min-w-0">
                <p className="text-sm text-foreground truncate">{c.name || "—"}</p>
                <p className="text-xs text-muted-foreground">+{c.phone}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <input type="checkbox" checked={c.active} onChange={(e) => toggleContact.mutate({ id: c.id, active: e.target.checked })} />
                  Active
                </label>
                <button onClick={() => deleteContact.mutate(c.id)} className="h-8 w-8 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-card rounded-lg border border-border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Pending Low-Stock Alerts ({alerts.length})</h3>
          <button onClick={runScan} disabled={scanning}
            className="h-8 px-3 rounded-md border border-border text-xs font-medium flex items-center gap-1.5 hover:bg-secondary disabled:opacity-50">
            {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Run scan now
          </button>
        </div>
        {alertsQuery.isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : alerts.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3">No pending alerts. ✅</p>
        ) : (
          <div className="space-y-3">
            {alerts.map((a) => (
              <div key={a.id} className="border border-border rounded-md p-3 space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{a.article_no}</p>
                    <p className="text-xs text-muted-foreground">
                      Stock: <span className="text-destructive font-medium">{a.stock} m</span> · {a.source === "daily" ? "Daily scan" : "After order"} · {new Date(a.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => sendAlertToAll(a)} disabled={contacts.filter(c => c.active).length === 0}
                    className="h-8 px-3 rounded-md bg-green-700 text-white text-xs font-medium flex items-center gap-1.5 hover:bg-green-800 disabled:opacity-50">
                    <Send className="h-3 w-3" /> Send to all active
                  </button>
                  {contacts.filter(c => c.active).map((c) => (
                    <button key={c.id} onClick={() => sendAlertToContact(a, c)}
                      className="h-8 px-2 rounded-md border border-border text-xs flex items-center gap-1 hover:bg-secondary">
                      <MessageCircle className="h-3 w-3" /> {c.name || `+${c.phone}`}
                    </button>
                  ))}
                  <button onClick={() => dismissAlert.mutate(a.id)} className="h-8 px-3 rounded-md border border-border text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground hover:bg-secondary ml-auto">
                    <Check className="h-3 w-3" /> Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLowStock;
