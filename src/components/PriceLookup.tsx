import { useState, useRef, useEffect } from "react";
import { Search, ShoppingCart, Plus, Trash2, List, LogOut, Loader2, Settings } from "lucide-react";
import brixonLogo from "@/assets/brixon-logo-white.png";
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
  const isLoggedIn = !!user;

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
    if (isLoggedIn) {
      try {
        await placeOrder.mutateAsync([{ article: result, quantity: qty }]);
        toast({ title: "Order placed!", description: "Your order has been saved." });
      } catch {
        toast({ title: "Error", description: "Failed to save order", variant: "destructive" });
      }
    }
    const total = result.price * qty;
    const message = `🛒 *New Order*\n\nArticle: *${result.articleNumber}*\n${result.description ? `Description: ${result.description}\n` : ""}Price: ₹${result.price.toLocaleString("en-IN")}/${result.stockUnit}\nQuantity: *${qty} ${result.stockUnit}*\nTotal: *₹${total.toLocaleString("en-IN")}*`;
    window.location.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
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
    if (isLoggedIn) {
      try {
        await placeOrder.mutateAsync(orderItems.map((e) => ({ article: e.result!, quantity: Number(e.orderQty) })));
        toast({ title: "Bulk order placed!", description: `${orderItems.length} items saved.` });
      } catch {
        toast({ title: "Error", description: "Failed to save order", variant: "destructive" });
      }
    }
    let grandTotal = 0;
    const lines = orderItems.map((e, i) => {
      const qty = Number(e.orderQty);
      const total = e.result!.price * qty;
      grandTotal += total;
      return `${i + 1}. *${e.result!.articleNumber}* - ${e.result!.description || ""}\n   Price: ₹${e.result!.price.toLocaleString("en-IN")}/${e.result!.stockUnit} × ${qty} = *₹${total.toLocaleString("en-IN")}*`;
    });
    const message = `🛒 *Bulk Order (${orderItems.length} items)*\n\n${lines.join("\n\n")}\n\n----\n*Grand Total: ₹${grandTotal.toLocaleString("en-IN")}*`;
    window.location.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
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
    <div className="min-h-screen bg-background border-l-[24px]" style={{ borderLeftColor: 'hsl(25, 95%, 53%)' }}>
      {/* Header */}
      <header className="border-b border-border bg-primary sticky top-0 z-50">
        <div className="w-full px-4 sm:px-6 h-14 flex items-center justify-between">
          <img src={brixonLogo} alt="Brixon" className="h-9 sm:h-10 md:h-11 w-auto object-contain" />
          <div className="flex items-center gap-1">
            {isAdmin && (
              <button onClick={() => navigate("/admin")} className="p-2 rounded-md text-primary-foreground/60 hover:text-primary-foreground transition-colors">
                <Settings className="h-4 w-4" />
              </button>
            )}
            {isLoggedIn && (
              <button onClick={signOut} className="p-2 rounded-md text-primary-foreground/60 hover:text-primary-foreground transition-colors">
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="w-full max-w-lg mx-auto px-4 sm:px-6 space-y-5 flex flex-col" style={{ minHeight: 'calc(100vh - 3.5rem)' }}>
        <div className="flex-1 min-h-[50%]" />
        {/* Mode toggle */}
        <div className="flex border border-border rounded-md overflow-hidden">
          <button
            onClick={() => setMode("single")}
            className={`flex-1 h-9 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
              mode === "single" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <Search className="h-3.5 w-3.5" /> Single
          </button>
          <button
            onClick={() => setMode("bulk")}
            className={`flex-1 h-9 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
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
              <div className="bg-card rounded-md border border-border p-5 space-y-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{result.articleNumber}</span>
                </div>
                {result.description && <p className="text-sm text-foreground">{result.description}</p>}
                <p className="text-3xl font-bold tracking-tight text-foreground">₹{result.price.toLocaleString("en-IN")}</p>
                <p className="text-xs text-muted-foreground">MRP with GST</p>
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
                </div>
                <div className="pt-3 border-t border-border space-y-3">
                  <label className="text-xs font-medium text-foreground">Quantity ({result.stockUnit})</label>
                  <input type="number" min="1" value={orderQty} onChange={(e) => setOrderQty(e.target.value)}
                    placeholder={`Enter ${result.stockUnit}s`}
                    className="w-full h-10 px-3 rounded-md border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-shadow" />
                  {orderQty && Number(orderQty) > 0 && (
                    <p className="text-xs text-muted-foreground">Total: <span className="font-semibold text-foreground">₹{(result.price * Number(orderQty)).toLocaleString("en-IN")}</span></p>
                  )}
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
              <div className="bg-card rounded-md border border-border p-5 text-center space-y-2">
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
                  <span className="text-xs text-muted-foreground w-4 text-right shrink-0">{i + 1}.</span>
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
                      <div key={i} className="bg-card rounded-md border border-border p-3 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">#{entry.articleNumber}</span>
                        <span className="text-xs text-destructive font-medium">Not found</span>
                      </div>
                    );
                  }
                  if (!entry.result) return null;
                  return (
                    <div key={i} className="bg-card rounded-md border border-border p-3 space-y-2">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{entry.result.articleNumber}</span>
                          {entry.result.description && <p className="text-sm text-foreground">{entry.result.description}</p>}
                        </div>
                        <p className="text-xl font-bold tracking-tight text-foreground">₹{entry.result.price.toLocaleString("en-IN")}</p>
                      </div>
                      <div className="space-y-0.5">
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
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="number" min="1" value={entry.orderQty} onChange={(e) => updateBulkQty(i, e.target.value)}
                          placeholder={`Qty (${entry.result.stockUnit})`}
                          className="flex-1 h-8 px-2 rounded-md border border-input bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-shadow" />
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
                  <div className="bg-card rounded-md border border-border overflow-hidden">
                    <div className="px-3 py-2 border-b border-border">
                      <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">Order Summary</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">#</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Article</th>
                            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Price</th>
                            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Qty</th>
                            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {foundEntries.map((entry, i) => {
                            const qty = Number(entry.orderQty) || 0;
                            const lineTotal = entry.result!.price * qty;
                            return (
                              <tr key={i} className="border-b border-border last:border-0">
                                <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                                <td className="px-3 py-2 text-foreground font-medium">{entry.result!.articleNumber}</td>
                                <td className="px-3 py-2 text-right text-foreground">₹{entry.result!.price.toLocaleString("en-IN")}</td>
                                <td className="px-3 py-2 text-right text-foreground">{qty > 0 ? qty : "—"}</td>
                                <td className="px-3 py-2 text-right text-foreground font-medium">{qty > 0 ? `₹${lineTotal.toLocaleString("en-IN")}` : "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {bulkGrandTotal > 0 && (
                          <tfoot>
                            <tr>
                              <td colSpan={4} className="px-3 py-2 text-right font-semibold text-foreground">Grand Total</td>
                              <td className="px-3 py-2 text-right font-bold text-foreground">₹{bulkGrandTotal.toLocaleString("en-IN")}</td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                    <div className="p-3 border-t border-border">
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
