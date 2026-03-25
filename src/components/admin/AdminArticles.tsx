import { useState } from "react";
import { useAdminArticles, useUpsertArticle, useUpdateStock } from "@/hooks/useAdmin";
import { Loader2, Plus, Save, Pencil, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const AdminArticles = () => {
  const { data: articles, isLoading } = useAdminArticles();
  const upsertArticle = useUpsertArticle();
  const updateStock = useUpdateStock();

  const [editingStock, setEditingStock] = useState<Record<string, string>>({});
  const [editingArticle, setEditingArticle] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ article_number: "", description: "", price: "", unit: "", stock_unit: "" });
  const [showAdd, setShowAdd] = useState(false);
  const [newArticle, setNewArticle] = useState({
    article_number: "",
    description: "",
    price: "",
    unit: "pc",
    stock_unit: "meter",
  });

  const handleStockUpdate = async (articleId: string) => {
    const qty = Number(editingStock[articleId]);
    if (isNaN(qty) || qty < 0) return;
    try {
      await updateStock.mutateAsync({ articleId, quantity: qty });
      setEditingStock((prev) => { const n = { ...prev }; delete n[articleId]; return n; });
      toast({ title: "Stock updated" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleAddArticle = async () => {
    if (!newArticle.article_number || !newArticle.price) return;
    try {
      await upsertArticle.mutateAsync({
        article_number: newArticle.article_number,
        description: newArticle.description,
        price: Number(newArticle.price),
        unit: newArticle.unit,
        stock_unit: newArticle.stock_unit,
      });
      setNewArticle({ article_number: "", description: "", price: "", unit: "pc", stock_unit: "meter" });
      setShowAdd(false);
      toast({ title: "Article added" });
    } catch {
      toast({ title: "Error adding article", variant: "destructive" });
    }
  };

  const startEdit = (a: any) => {
    setEditingArticle(a.id);
    setEditForm({
      article_number: a.article_number,
      description: a.description,
      price: String(a.price),
      unit: a.unit,
      stock_unit: a.stock_unit,
    });
  };

  const handleSaveEdit = async (id: string) => {
    if (!editForm.article_number || !editForm.price) return;
    try {
      await upsertArticle.mutateAsync({
        id,
        article_number: editForm.article_number,
        description: editForm.description,
        price: Number(editForm.price),
        unit: editForm.unit,
        stock_unit: editForm.stock_unit,
      });
      setEditingArticle(null);
      toast({ title: "Article updated" });
    } catch {
      toast({ title: "Error updating article", variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-all"
        >
          <Plus className="h-4 w-4" /> Add Article
        </button>
      </div>

      {showAdd && (
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">New Article</p>
          <div className="grid grid-cols-2 gap-3">
            <input value={newArticle.article_number} onChange={(e) => setNewArticle({ ...newArticle, article_number: e.target.value })} placeholder="Article #" className="h-10 px-3 rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            <input value={newArticle.description} onChange={(e) => setNewArticle({ ...newArticle, description: e.target.value })} placeholder="Description" className="h-10 px-3 rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            <input type="number" value={newArticle.price} onChange={(e) => setNewArticle({ ...newArticle, price: e.target.value })} placeholder="Price" className="h-10 px-3 rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            <input value={newArticle.stock_unit} onChange={(e) => setNewArticle({ ...newArticle, stock_unit: e.target.value })} placeholder="Stock unit (e.g. meter)" className="h-10 px-3 rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <button onClick={handleAddArticle} disabled={upsertArticle.isPending} className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-all">
            {upsertArticle.isPending ? "Saving..." : "Save Article"}
          </button>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Article #</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Price (₹)</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Unit</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Stock</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Update Stock</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Edit</th>
              </tr>
            </thead>
            <tbody>
              {articles?.map((a) => {
                const stock = (a.stock as any)?.quantity ?? 0;
                const isEditingStock = editingStock[a.id] !== undefined;
                const isEditing = editingArticle === a.id;

                return (
                  <tr key={a.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-foreground font-medium">
                      {isEditing ? (
                        <input value={editForm.article_number} onChange={(e) => setEditForm({ ...editForm, article_number: e.target.value })} className="w-full h-8 px-2 rounded-lg border border-input bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
                      ) : a.article_number}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {isEditing ? (
                        <input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="w-full h-8 px-2 rounded-lg border border-input bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
                      ) : a.description}
                    </td>
                    <td className="px-4 py-3 text-right text-foreground">
                      {isEditing ? (
                        <input type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} className="w-20 h-8 px-2 rounded-lg border border-input bg-card text-foreground text-right text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
                      ) : `₹${a.price?.toLocaleString("en-IN")}`}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {isEditing ? (
                        <input value={editForm.stock_unit} onChange={(e) => setEditForm({ ...editForm, stock_unit: e.target.value })} className="w-20 h-8 px-2 rounded-lg border border-input bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
                      ) : a.stock_unit}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={stock > 0 ? "text-green-600 font-semibold" : "text-destructive font-semibold"}>
                        {stock} {a.stock_unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <input type="number" min="0" value={isEditingStock ? editingStock[a.id] : ""} onChange={(e) => setEditingStock({ ...editingStock, [a.id]: e.target.value })} placeholder={String(stock)} className="w-20 h-8 px-2 rounded-lg border border-input bg-card text-foreground text-right text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
                        {isEditingStock && (
                          <button onClick={() => handleStockUpdate(a.id)} disabled={updateStock.isPending} className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 disabled:opacity-50">
                            <Save className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleSaveEdit(a.id)} disabled={upsertArticle.isPending} className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 disabled:opacity-50">
                            <Save className="h-3 w-3" />
                          </button>
                          <button onClick={() => setEditingArticle(null)} className="h-8 w-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center hover:opacity-90">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(a)} className="h-8 w-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center hover:text-foreground hover:bg-secondary transition-colors mx-auto">
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminArticles;
