import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "@/shared/lib/api-client";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";

const MAX_MARKDOWN_LENGTH = 100_000;

export function DraftEditor({
  initialMarkdown,
  onSave,
  onCancel,
}: {
  initialMarkdown: string;
  /** Resolves when the new revision is stored; rejects with the backend error otherwise. */
  onSave: (markdown: string) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [text, setText] = useState(initialMarkdown);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = text !== initialMarkdown;
  // Zero-width characters count as empty: the backend rejects text that shows nothing.
  const empty = text.replace(/[\u200B-\u200D\u2060\uFEFF]/g, "").trim() === "";
  const tooLong = text.length > MAX_MARKDOWN_LENGTH;

  const handleSave = async () => {
    if (empty) {
      setError(t("draftEdit.emptyError"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(text);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) setError(t("draftEdit.conflictError"));
      else if (err instanceof ApiError) setError(err.message);
      else setError(t("draftEdit.saveError"));
      setSaving(false);
    }
  };

  return (
    <Card className="border border-primary/40">
      <CardHeader className="py-3 px-4 border-b border-border/40 bg-muted/30 flex flex-row items-center justify-between">
        <label htmlFor="draft-editor" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("draftEdit.editorLabel")}
        </label>
        <span className={`text-xs font-mono ${tooLong ? "text-destructive" : "text-muted-foreground"}`}>
          {text.length}/{MAX_MARKDOWN_LENGTH}
          {dirty ? ` · ${t("draftEdit.unsavedHint")}` : ""}
        </span>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <p className="text-xs text-warning bg-warning-soft border border-warning-border rounded-md p-2.5">
          {t("draftEdit.warning")}
        </p>
        <textarea
          id="draft-editor"
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={saving}
          rows={18}
          spellCheck
          className="w-full rounded-md border border-border bg-background p-3 font-mono text-sm leading-6 focus:outline-hidden focus:ring-2 focus:ring-primary"
        />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
            {t("draftEdit.cancel")}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || empty || tooLong || !dirty}>
            {saving ? t("draftEdit.saving") : t("draftEdit.save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
