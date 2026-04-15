import { useState } from "react";
import { Loader as Loader2, Save } from "lucide-react";
import { useAllLegalPages, useUpsertLegalPage, type LegalPage } from "@/hooks/useLegalPages";
import { toast } from "@/hooks/use-toast";

const LABELS: Record<string, string> = {
  "privacy-policy": "Privacy Policy",
  terms: "Terms & Conditions",
  contact: "Contact",
};

const LegalEditor = ({ page }: { page: LegalPage }) => {
  const [title, setTitle] = useState(page.title);
  const [content, setContent] = useState(page.content);
  const upsert = useUpsertLegalPage();

  const isDirty = title !== page.title || content !== page.content;

  const handleSave = async () => {
    try {
      await upsert.mutateAsync({ slug: page.slug, title, content });
      toast({ title: "Saved", description: `${LABELS[page.slug] ?? page.slug} updated.` });
    } catch {
      toast({ title: "Save failed", description: "Could not save changes.", variant: "destructive" });
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border p-4 space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {LABELS[page.slug] ?? page.slug}
      </h3>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Page title"
        className="w-full h-9 px-3 rounded-md border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-shadow"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Page content"
        rows={5}
        className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-shadow resize-y"
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Last updated:{" "}
          {new Date(page.updated_at).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
        <button
          onClick={handleSave}
          disabled={!isDirty || upsert.isPending}
          className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1.5 hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {upsert.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Save
        </button>
      </div>
    </div>
  );
};

const AdminLegal = () => {
  const { data: pages, isLoading } = useAllLegalPages();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const ordered = ["privacy-policy", "terms", "contact"];
  const sorted = pages?.sort((a, b) => ordered.indexOf(a.slug) - ordered.indexOf(b.slug)) ?? [];

  return (
    <div className="space-y-3">
      {sorted.map((page) => (
        <LegalEditor key={page.slug} page={page} />
      ))}
    </div>
  );
};

export default AdminLegal;
