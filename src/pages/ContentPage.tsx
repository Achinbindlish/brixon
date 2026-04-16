import { useParams, Link } from "react-router-dom";
import { useAppContent } from "@/hooks/useAppContent";
import { Loader2, ArrowLeft } from "lucide-react";
import brixonLogo from "@/assets/brixon-logo.png";

const keyMap: Record<string, string> = {
  "privacy-policy": "privacy_policy",
  "terms": "terms_conditions",
  "contacts": "contacts",
};

const ContentPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const contentKey = keyMap[slug || ""] || slug || "";
  const { data, isLoading, error } = useAppContent(contentKey);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="w-full px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link to="/auth" className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <img src={brixonLogo} alt="Brixon" className="h-7 w-auto object-contain" />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <p className="text-destructive text-sm text-center py-20">Failed to load content.</p>
        ) : data ? (
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold text-foreground">{data.title}</h1>
            <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
              {data.body}
            </div>
            <p className="text-xs text-muted-foreground pt-4">
              Last updated: {new Date(data.updated_at).toLocaleDateString()}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ContentPage;
