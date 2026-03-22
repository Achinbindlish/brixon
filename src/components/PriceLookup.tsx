import { useState, useRef, useEffect } from "react";
import { Search, ShoppingCart } from "lucide-react";
import { articles, type Article } from "@/data/priceData";

const WHATSAPP_NUMBER = "918076173815";

const PriceLookup = () => {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Article | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [orderQty, setOrderQty] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = () => {
    const trimmed = query.trim().toUpperCase();
    if (!trimmed) return;

    const found = articles.find(
      (a) => a.articleNumber.toUpperCase() === trimmed
    );

    if (found) {
      setResult(found);
      setNotFound(false);
    } else {
      setResult(null);
      setNotFound(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleClear = () => {
    setQuery("");
    setResult(null);
    setNotFound(false);
    setOrderQty("");
    inputRef.current?.focus();
  };

  const handlePlaceOrder = () => {
    if (!result || !orderQty || Number(orderQty) <= 0) return;
    const qty = Number(orderQty);
    const total = result.price * qty;
    const message = `🛒 *New Order*%0A%0AArticle: *${result.articleNumber}*%0A${result.description ? `Description: ${result.description}%0A` : ""}Price: ₹${result.price.toLocaleString("en-IN")}/${result.stockUnit}%0AQuantity: *${qty} ${result.stockUnit}*%0ATotal: *₹${total.toLocaleString("en-IN")}*`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Price Lookup
          </h1>
          <p className="text-muted-foreground text-sm">
            Enter an article number to get the price
          </p>
        </div>

        {/* Search */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. ART-1001"
              className="w-full h-14 pl-12 pr-4 rounded-xl border border-input bg-card text-foreground text-lg placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <button
            onClick={handleSearch}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-medium text-base hover:opacity-90 active:scale-[0.98] transition-all duration-150"
          >
            Look up price
          </button>
        </div>

        {/* Result */}
        {result && (
          <div className="bg-card rounded-xl border border-border p-6 space-y-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                {result.articleNumber}
              </span>
            </div>
            {result.description && <p className="text-foreground font-medium">{result.description}</p>}
            <p className="text-4xl font-bold tracking-tight text-foreground">
              ₹{result.price.toLocaleString("en-IN")}
            </p>
            <p className="text-sm text-muted-foreground">MRP with GST</p>
            <div className="pt-3 border-t border-border flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Available Stock</span>
              <span className={`text-lg font-semibold ${result.stock > 0 ? 'text-green-600' : 'text-destructive'}`}>
                {result.stock > 0 ? `${result.stock} ${result.stockUnit}` : 'Out of stock'}
              </span>
            </div>
            <button
              onClick={handleClear}
              className="w-full h-10 rounded-lg border border-border text-muted-foreground text-sm hover:bg-secondary active:scale-[0.98] transition-all duration-150"
            >
              New search
            </button>
          </div>
        )}

        {/* Not found */}
        {notFound && (
          <div className="bg-card rounded-xl border border-border p-6 text-center space-y-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            <p className="text-foreground font-medium">Article not found</p>
            <p className="text-sm text-muted-foreground">
              Check the article number and try again
            </p>
            <button
              onClick={handleClear}
              className="h-10 px-6 rounded-lg border border-border text-muted-foreground text-sm hover:bg-secondary active:scale-[0.98] transition-all duration-150"
            >
              Clear
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceLookup;
