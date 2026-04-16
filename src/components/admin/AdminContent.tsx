import { useState } from "react";
import { useAllAppContent, useUpdateAppContent } from "@/hooks/useAppContent";
import { Loader2, Save, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const AdminContent = () => {
  const { data: contents, isLoading } = useAllAppContent();
  const updateContent = useUpdateAppContent();
  const [editing, setEditing] = useState<Record<string, { title: string; body: string }>>({});

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  const labelMap: Record<string, string> = {
    privacy_policy: "Privacy Policy",
    terms_conditions: "Terms & Conditions",
    contacts: "Contact Information",
  };

  const handleSave = async (item: any) => {
    const edit = editing[item.id];
    if (!edit) return;
    try {
      await updateContent.mutateAsync({ id: item.id, title: edit.title, body: edit.body });
      setEditing((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      toast({ title: "Saved", description: `${labelMap[item.content_key] || item.content_key} updated.` });
    } catch {
      toast({ title: "Error", description: "Failed to save.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold text-foreground">Manage Content</h2>
      {(contents || []).map((item) => {
        const edit = editing[item.id] || { title: item.title, body: item.body };
        const isDirty = edit.title !== item.title || edit.body !== item.body;

        return (
          <div key={item.id} className="border border-border rounded-lg p-4 space-y-3 bg-card">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {labelMap[item.content_key] || item.content_key}
            </p>
            <input
              value={edit.title}
              onChange={(e) => setEditing((prev) => ({ ...prev, [item.id]: { ...edit, title: e.target.value } }))}
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Title"
            />
            <textarea
              value={edit.body}
              onChange={(e) => setEditing((prev) => ({ ...prev, [item.id]: { ...edit, body: e.target.value } }))}
              rows={6}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-y"
              placeholder="Content"
            />
            <div className="flex justify-end">
              <button
                onClick={() => handleSave(item)}
                disabled={!isDirty || updateContent.isPending}
                className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1.5 hover:opacity-90 disabled:opacity-40 transition-all"
              >
                {updateContent.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AdminContent;
