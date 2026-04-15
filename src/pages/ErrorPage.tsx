import { useNavigate, useRouteError } from "react-router-dom";
import { TriangleAlert as AlertTriangle } from "lucide-react";

const ErrorPage = () => {
  const error = useRouteError() as { statusText?: string; message?: string } | null;
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background border-l-[24px] border-l-accent-orange flex flex-col items-center justify-center px-4">
      <AlertTriangle className="h-10 w-10 text-muted-foreground mb-5" strokeWidth={1.5} />
      <h1 className="text-lg font-semibold text-foreground mb-1">Something went wrong</h1>
      <p className="text-sm text-muted-foreground text-center max-w-xs">
        {error?.statusText || error?.message || "An unexpected error occurred."}
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={() => window.location.reload()}
          className="h-9 px-5 rounded-md border border-border text-muted-foreground text-sm hover:text-foreground hover:bg-secondary transition-colors"
        >
          Reload
        </button>
        <button
          onClick={() => navigate("/")}
          className="h-9 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.99] transition-all"
        >
          Go home
        </button>
      </div>
    </div>
  );
};

export default ErrorPage;
