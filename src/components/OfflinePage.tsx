import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";

const OfflinePage = () => {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = () => {
    setRetrying(true);
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
        <WifiOff className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-semibold text-foreground mb-2">You're Offline</h1>
      <p className="text-sm text-muted-foreground max-w-xs mb-8">
        It looks like you've lost your internet connection. Please check your network and try again.
      </p>
      <button
        onClick={handleRetry}
        disabled={retrying}
        className="h-11 px-6 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2"
      >
        <RefreshCw className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} />
        {retrying ? "Reconnecting..." : "Try Again"}
      </button>
    </div>
  );
};

export default OfflinePage;
