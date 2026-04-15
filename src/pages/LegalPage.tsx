import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Loader as Loader2 } from "lucide-react";
import { useLegalPage } from "@/hooks/useLegalPages";

const VALID_SLUGS = ["privacy-policy", "terms", "contact"];

const LegalPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: page, isLoading, isError } = useLegalPage(slug ?? "");

  if (!VALID_SLUGS.includes(slug ?? "")) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <p className="text-sm text-muted-foreground mb-4">Page not found.</p>
        <Link to="/" className="text-xs underline text-muted-foreground hover:text-foreground transition-colors">
          Go back
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !page) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <p className="text-sm text-muted-foreground mb-4">Could not load this page.</p>
        <button onClick={() => navigate(-1)} className="text-xs underline text-muted-foreground hover:text-foreground transition-colors">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background border-l-[24px] border-l-accent-orange">
      <div className="w-full max-w-lg mx-auto px-4 sm:px-6 py-6">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <h1 className="text-xl font-semibold text-foreground mb-4">{page.title}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{page.content}</p>
        <p className="mt-8 text-xs text-muted-foreground/60">
          Last updated: {new Date(page.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>
    </div>
  );
};

export default LegalPage;
