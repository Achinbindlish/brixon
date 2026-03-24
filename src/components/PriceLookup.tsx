import { useState, useRef, useEffect } from "react";
import { Search, ShoppingCart, Plus, Trash2, List, LogOut, Loader2, Settings } from "lucide-react";
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
  const { data: articles = [], isLoading: articlesLoading } = useArticles();
  const placeOrder = usePlaceOrder();

  const [mode, setMode] = useState<"single" | "bulk">("single");

  // Single mode state
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<ArticleWithStock | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [orderQty, setOrderQty] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Bulk mode state
  const [bulkEntries, setBulkEntries] = useState<BulkEntry[]>([
    { articleNumber: "", result: null, notFound: false, orderQty: "" },
  ]);
  const [bulkSearched, setBulkSearched] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const findArticle = (num: string) =>
    articles.find((a) => a.articleNumber.toUpperCase() === num.toUpperCase());

  // Single mode handlers
  const handleSearch = () => {
    const trimmed = query.trim().toUpperCase();
    if (!trimmed) return;
    const found = findArticle(trimmed);
    if (found) { setResult(found); setNotFound(false); }
    else { setResult(null); setNotFound(true); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleClear = () => {
    setQuery(""); setResult(null); setNotFound(false); setOrderQty("");
    inputRef.current?.focus();
  };

  const handlePlaceOrder = async () => {
    if (!result || !orderQty || Number(orderQty) <= 0) return;
    const qty = Number(orderQty);

    // Save to DB
    try {
      await placeOrder.mutateAsync([{ article: result, quantity: qty }]);
      toast({ title: "Order placed!", description: "Your order has been saved." });
    } catch {
      toast({ title: "Error", description: "Failed to save order", variant: "destructive" });
    }

    // Also send via WhatsApp
    const total = result.price * qty;
    const message = `🛒 *New Order*%0A%0AArticle: *${result.articleNumber}*%0A${result.description ? `Description: ${result.description}%0A` : ""}Price: ₹${result.price.toLocaleString("en-IN")}/${result.stockUnit}%0AQuantity: *${qty} ${result.stockUnit}*%0ATotal: *₹${total.toLocaleString("en-IN")}*`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, "_blank");
  };

  // Bulk mode handlers
  const addBulkEntry = () => {
    if (bulkEntries.length >= 10) return;
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

    // Save to DB
    try {
      await placeOrder.mutateAsync(
        orderItems.map((e) => ({ article: e.result!, quantity: Number(e.orderQty) }))
      );
      toast({ title: "Bulk order placed!", description: `${orderItems.length} items saved.` });
    } catch {
      toast({ title: "Error", description: "Failed to save order", variant: "destructive" });
    }

    // Also send via WhatsApp
    let grandTotal = 0;
    const lines = orderItems.map((e, i) => {
      const qty = Number(e.orderQty);
      const total = e.result!.price * qty;
      grandTotal += total;
      return `${i + 1}. *${e.result!.articleNumber}* - ${e.result!.description || ""}%0A   Price: ₹${e.result!.price.toLocaleString("en-IN")}/${e.result!.stockUnit} × ${qty} = *₹${total.toLocaleString("en-IN")}*`;
    });

    const message = `🛒 *Bulk Order (${orderItems.length} items)*%0A%0A${lines.join("%0A%0A")}%0A%0A----%0A*Grand Total: ₹${grandTotal.toLocaleString("en-IN")}*`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, "_blank");
  };

  const handleBulkClear = () => {
    setBulkEntries([{ articleNumber: "", result: null, notFound: false, orderQty: "" }]);
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-between">
            <div className="w-10" />
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Price Lookup</h1>
            <button onClick={signOut} className="w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors" title="Sign out">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
          <p className="text-muted-foreground text-sm">Enter article numbers to get prices</p>
        </div>

        {/* Mode toggle */}
        <div className="flex rounded-xl border border-border overflow-hidden">
          <button
            onClick={() => setMode("single")}
            className={`flex-1 h-11 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${mode === "single" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary"}`}
          >
            <Search className="h-4 w-4" /> Single
          </button>
          <button
            onClick={() => setMode("bulk")}
            className={`flex-1 h-11 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${mode === "bulk" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary"}`}
          >
            <List className="h-4 w-4" /> Bulk (up to 10)
          </button>
        </div>

        {/* Single Mode */}
        {mode === "single" && (
          <>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. 1"
                  className="w-full h-14 pl-12 pr-4 rounded-xl border border-input bg-card text-foreground text-lg placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
                  autoComplete="off" autoCorrect="off" spellCheck={false}
                />
              </div>
              <button onClick={handleSearch} className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-medium text-base hover:opacity-90 active:scale-[0.98] transition-all duration-150">
                Look up price
              </button>
            </div>

            {result && (
              <div className="bg-card rounded-xl border border-border p-6 space-y-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium text-muted-foreground">{result.articleNumber}</span>
                </div>
                {result.description && <p className="text-foreground font-medium">{result.description}</p>}
                <p className="text-4xl font-bold tracking-tight text-foreground">₹{result.price.toLocaleString("en-IN")}</p>
                <p className="text-sm text-muted-foreground">MRP with GST</p>
                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Available Stock</span>
                  <span className={`text-lg font-semibold ${result.stock > 0 ? "text-green-600" : "text-destructive"}`}>
                    {result.stock > 0 ? `${result.stock} ${result.stockUnit}` : "Out of stock"}
                  </span>
                </div>
                <div className="pt-3 border-t border-border space-y-3">
                  <label className="text-sm font-medium text-foreground">Order Quantity ({result.stockUnit})</label>
                  <input type="number" min="1" value={orderQty} onChange={(e) => setOrderQty(e.target.value)} placeholder={`Enter ${result.stockUnit}s`}
                    className="w-full h-12 px-4 rounded-xl border border-input bg-card text-foreground text-lg placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow" />
                  {orderQty && Number(orderQty) > 0 && (
                    <p className="text-sm text-muted-foreground">Total: <span className="font-semibold text-foreground">₹{(result.price * Number(orderQty)).toLocaleString("en-IN")}</span></p>
                  )}
                  <button onClick={handlePlaceOrder} disabled={!orderQty || Number(orderQty) <= 0 || placeOrder.isPending}
                    className="w-full h-12 rounded-xl bg-green-600 text-white font-medium text-base flex items-center justify-center gap-2 hover:bg-green-700 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
                    <ShoppingCart className="h-5 w-5" /> {placeOrder.isPending ? "Placing..." : "Place Order via WhatsApp"}
                  </button>
                </div>
                <button onClick={handleClear} className="w-full h-10 rounded-lg border border-border text-muted-foreground text-sm hover:bg-secondary active:scale-[0.98] transition-all duration-150">New search</button>
              </div>
            )}

            {notFound && (
              <div className="bg-card rounded-xl border border-border p-6 text-center space-y-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                <p className="text-foreground font-medium">Article not found</p>
                <p className="text-sm text-muted-foreground">Check the article number and try again</p>
                <button onClick={handleClear} className="h-10 px-6 rounded-lg border border-border text-muted-foreground text-sm hover:bg-secondary active:scale-[0.98] transition-all duration-150">Clear</button>
              </div>
            )}
          </>
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
                    className="flex-1 h-11 px-3 rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
                    autoComplete="off" autoCorrect="off" spellCheck={false}
                  />
                  {bulkEntries.length > 1 && (
                    <button onClick={() => removeBulkEntry(i)} className="h-11 w-11 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {bulkEntries.length < 10 && (
              <button onClick={addBulkEntry} className="w-full h-10 rounded-lg border border-dashed border-border text-muted-foreground text-sm flex items-center justify-center gap-2 hover:bg-secondary transition-colors">
                <Plus className="h-4 w-4" /> Add another article
              </button>
            )}

            <button onClick={handleBulkSearch} className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-medium text-base hover:opacity-90 active:scale-[0.98] transition-all duration-150">
              Look up all prices
            </button>

            {bulkSearched && (
              <div className="space-y-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                {bulkEntries.map((entry, i) => {
                  if (!entry.articleNumber.trim()) return null;
                  if (entry.notFound) {
                    return (
                      <div key={i} className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">#{entry.articleNumber}</span>
                        <span className="text-sm text-destructive font-medium">Not found</span>
                      </div>
                    );
                  }
                  if (!entry.result) return null;
                  return (
                    <div key={i} className="bg-card rounded-xl border border-border p-4 space-y-3">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">{entry.result.articleNumber}</span>
                          {entry.result.description && <p className="text-foreground font-medium text-sm">{entry.result.description}</p>}
                        </div>
                        <p className="text-2xl font-bold tracking-tight text-foreground">₹{entry.result.price.toLocaleString("en-IN")}</p>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Stock</span>
                        <span className={entry.result.stock > 0 ? "text-green-600 font-semibold" : "text-destructive font-semibold"}>
                          {entry.result.stock > 0 ? `${entry.result.stock} ${entry.result.stockUnit}` : "Out of stock"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="number" min="1" value={entry.orderQty} onChange={(e) => updateBulkQty(i, e.target.value)}
                          placeholder={`Qty (${entry.result.stockUnit})`}
                          className="flex-1 h-10 px-3 rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow" />
                        {entry.orderQty && Number(entry.orderQty) > 0 && (
                          <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                            ₹{(entry.result.price * Number(entry.orderQty)).toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {foundEntries.length > 0 && (
                  <div className="bg-card rounded-xl border border-border overflow-hidden">
                    <div className="px-4 py-3 border-b border-border">
                      <h3 className="text-sm font-semibold text-foreground">Order Summary</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/30">
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
                            <tr className="bg-muted/30">
                              <td colSpan={4} className="px-3 py-2 text-right font-semibold text-foreground">Grand Total</td>
                              <td className="px-3 py-2 text-right font-bold text-foreground text-base">₹{bulkGrandTotal.toLocaleString("en-IN")}</td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                    <div className="p-4 border-t border-border">
                      <button onClick={handleBulkOrder} disabled={!hasValidBulkOrder || placeOrder.isPending}
                        className="w-full h-12 rounded-xl bg-green-600 text-white font-medium text-base flex items-center justify-center gap-2 hover:bg-green-700 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
                        <ShoppingCart className="h-5 w-5" /> {placeOrder.isPending ? "Placing..." : "Place Bulk Order via WhatsApp"}
                      </button>
                    </div>
                  </div>
                )}

                <button onClick={handleBulkClear} className="w-full h-10 rounded-lg border border-border text-muted-foreground text-sm hover:bg-secondary active:scale-[0.98] transition-all duration-150">
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceLookup;
