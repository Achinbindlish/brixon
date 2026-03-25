import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Navigate, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, Package, ClipboardList, RefreshCw, Users } from "lucide-react";
import AdminOrders from "@/components/admin/AdminOrders";
import AdminArticles from "@/components/admin/AdminArticles";
import SheetsSync from "@/components/admin/SheetsSync";
import AdminUsers from "@/components/admin/AdminUsers";

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: roleLoading } = useIsAdmin();
  const [tab, setTab] = useState<"orders" | "articles" | "sync" | "users">("orders");
  const navigate = useNavigate();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const tabs = [
    { id: "orders" as const, label: "Orders", icon: ClipboardList },
    { id: "articles" as const, label: "Articles", icon: Package },
    { id: "sync" as const, label: "Sync", icon: RefreshCw },
    { id: "users" as const, label: "Users", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate("/")} className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">Brixon Admin</h1>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* Tabs */}
        <div className="flex border border-border rounded-md overflow-hidden">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 h-9 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
                tab === t.id ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {tab === "orders" && <AdminOrders />}
        {tab === "articles" && <AdminArticles />}
        {tab === "sync" && <SheetsSync />}
        {tab === "users" && <AdminUsers />}
      </div>
    </div>
  );
};

export default Admin;
