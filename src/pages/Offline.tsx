import { WifiOff } from "lucide-react";

const Offline = () => {
  return (
    <div className="min-h-screen bg-background border-l-[24px] border-l-accent-orange flex flex-col items-center justify-center px-4">
      <WifiOff className="h-10 w-10 text-muted-foreground mb-5" strokeWidth={1.5} />
      <h1 className="text-lg font-semibold text-foreground mb-1">You're offline</h1>
      <p className="text-sm text-muted-foreground text-center max-w-xs">
        Check your internet connection and try again.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-6 h-9 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.99] transition-all"
      >
        Retry
      </button>
    </div>
  );
};

export default Offline;
