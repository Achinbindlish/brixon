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
  const [tab, setTab] = useState<"orders" | "articles" | "sync">("orders");
  const navigate = useNavigate();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const tabs = [
    { id: "orders" as const, label: "Orders", icon: ClipboardList },
    { id: "articles" as const, label: "Articles & Stock", icon: Package },
    { id: "sync" as const, label: "Sheets Sync", icon: RefreshCw },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="h-10 w-10 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Manage orders, articles, and stock</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl border border-border overflow-hidden">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 h-11 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                tab === t.id ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary"
              }`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "orders" && <AdminOrders />}
        {tab === "articles" && <AdminArticles />}
        {tab === "sync" && <SheetsSync />}
      </div>
    </div>
  );
};

export default Admin;
