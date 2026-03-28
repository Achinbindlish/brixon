import { useState, useRef, useEffect } from "react";
import { Search, ShoppingCart, Plus, Trash2, List, LogOut, Loader2, Settings } from "lucide-react";
import brixonLogo from "@/assets/brixon-logo.png";
import { useArticles, type ArticleWithStock } from "@/hooks/useArticles";
import { usePlaceOrder } from "@/hooks/useOrders";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

const WHATSAPP_NUMBER = "918076173815";

type BulkEntry = {
  articleNumber: string;
  result: ArticleWithStock | null;
  notFound: boolean;
  orderQty: string;
};

const PriceLookup = () => {
  const { signOut, user } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const { data: articles = [], isLoading: articlesLoading } = useArticles();
  const placeOrder = usePlaceOrder();
  

  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<ArticleWithStock | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [orderQty, setOrderQty] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const [bulkEntries, setBulkEntries] = useState<BulkEntry[]>(
    Array.from({ length: 10 }, () => ({ articleNumber: "", result: null, notFound: false, orderQty: "" }))
  );
  const [bulkSearched, setBulkSearched] = useState(false);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const findArticle = (num: string) =>
    articles.find((a) => a.articleNumber.toUpperCase() === num.toUpperCase());

  const handleSearch = () => {
    const trimmed = query.trim().toUpperCase();
    if (!trimmed) return;
    const found = findArticle(trimmed);
    if (found) { setResult(found); setNotFound(false); }
    else { setResult(null); setNotFound(true); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter") handleSearch(); };

  const handleClear = () => {
    setQuery(""); setResult(null); setNotFound(false); setOrderQty("");
    inputRef.current?.focus();
  };

  const handlePlaceOrder = async () => {
    if (!result || !orderQty || Number(orderQty) <= 0) return;
    const qty = Number(orderQty);
    try {
      await placeOrder.mutateAsync([{ article: result, quantity: qty }]);
      toast({ title: "Order placed!", description: "Your order has been saved." });
      const total = result.price * qty;
      const message = `🛒 *New Order*\n\nArticle: *${result.articleNumber}*\n${result.description ? `Description: ${result.description}\n` : ""}Price: ₹${result.price.toLocaleString("en-IN")}/${result.stockUnit}\nQuantity: *${qty} ${result.stockUnit}*\nTotal: *₹${total.toLocaleString("en-IN")}*`;
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank");
    } catch (err: any) {
      const msg = err?.message || "Failed to place order";
      const isStock = msg.toLowerCase().includes("insufficient stock");
      toast({ title: isStock ? "Insufficient Stock" : "Order Failed", description: msg, variant: "destructive" });
    }
  };

  const addBulkEntry = () => {
    setBulkEntries([...bulkEntries, { articleNumber: "", result: null, notFound: false, orderQty: "" }]);
  };

  const removeBulkEntry = (index: number) => {
    if (bulkEntries.length <= 1) return;
    setBulkEntries(bulkEntries.filter((_, i) => i !== index));
    setBulkSearched(false);
  };

  const updateBulkArticle = (index: number, value: string) => {
    const updated = [...bulkEntries];
    updated[index] = { ...updated[index], articleNumber: value, result: null, notFound: false };
    setBulkEntries(updated);
    setBulkSearched(false);
  };

  const updateBulkQty = (index: number, value: string) => {
    const updated = [...bulkEntries];
    updated[index] = { ...updated[index], orderQty: value };
    setBulkEntries(updated);
  };

  const handleBulkSearch = () => {
    const updated = bulkEntries.map((entry) => {
      const trimmed = entry.articleNumber.trim().toUpperCase();
      if (!trimmed) return { ...entry, result: null, notFound: false };
      const found = findArticle(trimmed);
      return { ...entry, result: found || null, notFound: !found };
    });
    setBulkEntries(updated);
    setBulkSearched(true);
  };

  const handleBulkOrder = async () => {
    const orderItems = bulkEntries.filter((e) => e.result && e.orderQty && Number(e.orderQty) > 0);
    if (orderItems.length === 0) return;
    try {
      await placeOrder.mutateAsync(orderItems.map((e) => ({ article: e.result!, quantity: Number(e.orderQty) })));
      toast({ title: "Bulk order placed!", description: `${orderItems.length} items saved.` });
      let grandTotal = 0;
      const lines = orderItems.map((e, i) => {
        const qty = Number(e.orderQty);
        const total = e.result!.price * qty;
        grandTotal += total;
        return `${i + 1}. *${e.result!.articleNumber}* - ${e.result!.description || ""}\n   Price: ₹${e.result!.price.toLocaleString("en-IN")}/${e.result!.stockUnit} × ${qty} = *₹${total.toLocaleString("en-IN")}*`;
      });
      const message = `🛒 *Bulk Order (${orderItems.length} items)*\n\n${lines.join("\n\n")}\n\n----\n*Grand Total: ₹${grandTotal.toLocaleString("en-IN")}*`;
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank");
    } catch (err: any) {
      const msg = err?.message || "Failed to place order";
      const isStock = msg.toLowerCase().includes("insufficient stock");
      toast({ title: isStock ? "Insufficient Stock" : "Order Failed", description: msg, variant: "destructive" });
    }
  };

  const handleBulkClear = () => {
    setBulkEntries(Array.from({ length: 10 }, () => ({ articleNumber: "", result: null, notFound: false, orderQty: "" })));
    setBulkSearched(false);
  };

  const foundEntries = bulkEntries.filter((e) => e.result);
  const bulkGrandTotal = foundEntries.reduce((sum, e) => {
    const qty = Number(e.orderQty) || 0;
    return sum + e.result!.price * qty;
  }, 0);
  const hasValidBulkOrder = foundEntries.some((e) => e.orderQty && Number(e.orderQty) > 0);

  if (articlesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background border-l-[24px] border-l-accent-orange">
      <main className="w-full max-w-lg mx-auto px-4 sm:px-6 py-6 flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="flex items-center justify-between pt-4 pb-2">
          {isAdmin && (
            <button onClick={() => navigate("/admin")} className="h-9 w-9 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <Settings className="h-4.5 w-4.5" />
            </button>
          )}
          {!isAdmin && <div />}
          <button onClick={signOut} className="h-9 w-9 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Logout">
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Hero / Branding */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center pt-4 pb-6">
          <img src={brixonLogo} alt="Brixon" className="h-20 w-auto object-contain mb-5" />
          <h1 className="text-2xl font-bold text-foreground leading-tight text-center" style={{ fontFamily: "'ED Lavonia', cursive" }}>
            Good to see you partner,
          </h1>
          <p className="text-lg text-muted-foreground mt-1 text-center" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            What are you looking for today?
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex border border-border rounded-md overflow-hidden mb-5">
          <button
            onClick={() => setMode("single")}
            className={`flex-1 h-10 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
              mode === "single" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <Search className="h-3.5 w-3.5" /> Single
          </button>
          <button
            onClick={() => setMode("bulk")}
            className={`flex-1 h-10 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
              mode === "bulk" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="h-3.5 w-3.5" /> Bulk
          </button>
        </div>

        {/* Single Mode */}
        {mode === "single" && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter article number"
                className="w-full h-11 pl-10 pr-3 rounded-md border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-shadow"
                autoComplete="off" autoCorrect="off" spellCheck={false}
              />
            </div>
            <button onClick={handleSearch} className="w-full h-10 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 active:scale-[0.99] transition-all">
              Search
            </button>

            {result && (
              <div className="bg-card rounded-lg border border-border p-5 space-y-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{result.articleNumber}</span>
                </div>
                {result.description && <p className="text-sm text-foreground">{result.description}</p>}
                <div className="pt-3 border-t border-border space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Available Stock</span>
                    <span className={`text-sm font-semibold ${result.stock > 0 ? "text-green-700" : "text-destructive"}`}>
                      {result.stock > 0 ? `${result.stock} ${result.stockUnit}` : "Out of stock"}
                    </span>
                  </div>
                  {result.stockBreakdown.length > 1 && (
                    <p className="text-xs text-muted-foreground text-right">
                      {result.stockBreakdown.join(" + ")}
                    </p>
                  )}
                  {result.stock > 0 && result.stock < 3.5 && (
                    <div className="mt-2 px-3 py-2 rounded-md bg-destructive/10 border border-destructive/20">
                      <p className="text-xs font-medium text-destructive">
                        ⚠️ Low Stock, Please contact on{" "}
                        <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" className="underline font-semibold">
                          WhatsApp
                        </a>
                      </p>
                    </div>
                  )}
                </div>
                <div className="pt-3 border-t border-border space-y-3">
                  <label className="text-xs font-medium text-foreground">Quantity ({result.stockUnit})</label>
                  <input type="number" min="1" value={orderQty} onChange={(e) => setOrderQty(e.target.value)}
                    placeholder={`Enter ${result.stockUnit}s`}
                    className="w-full h-10 px-3 rounded-md border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-shadow" />
                  <button onClick={handlePlaceOrder} disabled={!orderQty || Number(orderQty) <= 0 || placeOrder.isPending}
                    className="w-full h-10 rounded-md bg-green-700 text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-green-800 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    <ShoppingCart className="h-4 w-4" /> {placeOrder.isPending ? "Placing..." : "Order via WhatsApp"}
                  </button>
                </div>
                <button onClick={handleClear} className="w-full h-9 rounded-md border border-border text-muted-foreground text-xs hover:text-foreground hover:bg-secondary transition-colors">
                  New search
                </button>
              </div>
            )}

            {notFound && (
              <div className="bg-card rounded-lg border border-border p-5 text-center space-y-2">
                <p className="text-sm text-foreground font-medium">Article not found</p>
                <p className="text-xs text-muted-foreground">Check the article number and try again</p>
                <button onClick={handleClear} className="mt-2 h-8 px-4 rounded-md border border-border text-muted-foreground text-xs hover:text-foreground hover:bg-secondary transition-colors">
                  Clear
                </button>
              </div>
            )}
          </div>
        )}

        {/* Bulk Mode */}
        {mode === "bulk" && (
          <div className="space-y-4">
            <div className="space-y-2">
              {bulkEntries.map((entry, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{i + 1}.</span>
                  <input
                    type="text"
                    value={entry.articleNumber}
                    onChange={(e) => updateBulkArticle(i, e.target.value)}
                    placeholder="Article #"
                    className="flex-1 h-9 px-3 rounded-md border border-input bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-shadow"
                    autoComplete="off" autoCorrect="off" spellCheck={false}
                  />
                  {bulkEntries.length > 1 && (
                    <button onClick={() => removeBulkEntry(i)} className="h-9 w-9 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button onClick={addBulkEntry} className="w-full h-9 rounded-md border border-dashed border-border text-muted-foreground text-xs flex items-center justify-center gap-1.5 hover:text-foreground hover:bg-secondary transition-colors">
              <Plus className="h-3.5 w-3.5" /> Add more
            </button>

            <button onClick={handleBulkSearch} className="w-full h-10 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 active:scale-[0.99] transition-all">
              Search all
            </button>

            {bulkSearched && (
              <div className="space-y-3">
                {bulkEntries.map((entry, i) => {
                  if (!entry.articleNumber.trim()) return null;
                  if (entry.notFound) {
                    return (
                      <div key={i} className="bg-card rounded-lg border border-border p-3 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">#{entry.articleNumber}</span>
                        <span className="text-xs text-destructive font-medium">Not found</span>
                      </div>
                    );
                  }
                  if (!entry.result) return null;
                  return (
                    <div key={i} className="bg-card rounded-lg border border-border p-4 space-y-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="min-w-0">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{entry.result.articleNumber}</span>
                          {entry.result.description && <p className="text-sm text-foreground truncate">{entry.result.description}</p>}
                        </div>
                        <p className="text-xl font-bold tracking-tight text-foreground shrink-0">₹{entry.result.price.toLocaleString("en-IN")}</p>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Stock</span>
                        <span className={entry.result.stock > 0 ? "text-green-700 font-semibold" : "text-destructive font-semibold"}>
                          {entry.result.stock > 0 ? `${entry.result.stock} ${entry.result.stockUnit}` : "Out of stock"}
                        </span>
                      </div>
                      {entry.result.stockBreakdown.length > 1 && (
                        <p className="text-xs text-muted-foreground text-right">
                          {entry.result.stockBreakdown.join(" + ")}
                        </p>
                      )}
                      {entry.result.stock > 0 && entry.result.stock < 3.5 && (
                        <div className="mt-2 px-3 py-2 rounded-md bg-destructive/10 border border-destructive/20">
                          <p className="text-xs font-medium text-destructive">
                            ⚠️ Low Stock, Please contact on{" "}
                            <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" className="underline font-semibold">
                              WhatsApp
                            </a>
                          </p>
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <input type="number" min="1" value={entry.orderQty} onChange={(e) => updateBulkQty(i, e.target.value)}
                          placeholder={`Qty (${entry.result.stockUnit})`}
                          className="flex-1 h-9 px-3 rounded-md border border-input bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-shadow" />
                        {entry.orderQty && Number(entry.orderQty) > 0 && (
                          <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                            ₹{(entry.result.price * Number(entry.orderQty)).toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {foundEntries.length > 0 && (
                  <div className="bg-card rounded-lg border border-border overflow-hidden">
                    <div className="px-4 py-3 border-b border-border">
                      <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">Order Summary</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="px-4 py-2 text-left font-medium text-muted-foreground">#</th>
                            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Article</th>
                            <th className="px-4 py-2 text-right font-medium text-muted-foreground">Price</th>
                            <th className="px-4 py-2 text-right font-medium text-muted-foreground">Qty</th>
                            <th className="px-4 py-2 text-right font-medium text-muted-foreground">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {foundEntries.map((entry, i) => {
                            const qty = Number(entry.orderQty) || 0;
                            const lineTotal = entry.result!.price * qty;
                            return (
                              <tr key={i} className="border-b border-border last:border-0">
                                <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                                <td className="px-4 py-2 text-foreground font-medium">{entry.result!.articleNumber}</td>
                                <td className="px-4 py-2 text-right text-foreground">₹{entry.result!.price.toLocaleString("en-IN")}</td>
                                <td className="px-4 py-2 text-right text-foreground">{qty > 0 ? qty : "—"}</td>
                                <td className="px-4 py-2 text-right text-foreground font-medium">{qty > 0 ? `₹${lineTotal.toLocaleString("en-IN")}` : "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {bulkGrandTotal > 0 && (
                          <tfoot>
                            <tr>
                              <td colSpan={4} className="px-4 py-2 text-right font-semibold text-foreground">Grand Total</td>
                              <td className="px-4 py-2 text-right font-bold text-foreground">₹{bulkGrandTotal.toLocaleString("en-IN")}</td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                    <div className="p-4 border-t border-border">
                      <button onClick={handleBulkOrder} disabled={!hasValidBulkOrder || placeOrder.isPending}
                        className="w-full h-10 rounded-md bg-green-700 text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-green-800 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        <ShoppingCart className="h-4 w-4" /> {placeOrder.isPending ? "Placing..." : "Bulk Order via WhatsApp"}
                      </button>
                    </div>
                  </div>
                )}

                <button onClick={handleBulkClear} className="w-full h-9 rounded-md border border-border text-muted-foreground text-xs hover:text-foreground hover:bg-secondary transition-colors">
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}
        <div className="pb-6" />
      </main>
    </div>
  );
};

export default PriceLookup;
