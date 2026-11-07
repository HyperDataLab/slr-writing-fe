import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";

export function H2DecisionDialog({
  isOpen,
  onClose,
  action,
  sectionKey,
  version,
  contentHash,
  onConfirm,
  submitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  action: "approve" | "reject";
  sectionKey: string;
  version: number;
  contentHash: string;
  onConfirm: (note?: string) => Promise<void>;
  submitting: boolean;
}) {
  const { t } = useTranslation();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const sectionLabel = t(`plans.sectionName.${sectionKey}`, { defaultValue: sectionKey });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (action === "reject" && (!note.trim() || note.trim().length < 5)) {
      setError(t("draft.decision.noteRequired"));
      return;
    }
    setError(null);
    try {
      await onConfirm(note.trim() || undefined);
      setNote("");
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("draft.decision.submitError"));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {action === "approve" ? (
              <CheckCircleIcon className="size-6 text-success" />
            ) : (
              <XCircleIcon className="size-6 text-destructive" />
            )}
            <DialogTitle>
              {t(action === "approve" ? "draft.decision.approveTitle" : "draft.decision.rejectTitle", { section: sectionLabel, version })}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs pt-1">
            {action === "approve"
              ? t("draft.decision.approveDescription")
              : t("draft.decision.rejectDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-sm">
          <div className="bg-muted/50 p-2.5 rounded-md border border-border/60 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("draft.decision.section")}:</span>
              <span className="font-semibold text-foreground">{sectionLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("draft.decision.revision")}:</span>
              <span className="font-mono text-foreground">v{version}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("draft.decision.contentHash")}:</span>
              <span className="font-mono text-muted-foreground text-[11px] truncate max-w-[200px]" title={contentHash}>
                {contentHash.slice(0, 20)}...
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">
              {t("draft.decision.note")} {action === "reject" && <span className="text-destructive">*</span>}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                action === "approve"
                  ? t("draft.decision.notePlaceholderApprove")
                  : t("draft.decision.notePlaceholderReject")
              }
              rows={3}
              className="w-full bg-background border border-border rounded-md p-2.5 text-xs focus:outline-hidden focus:ring-2 focus:ring-primary"
            />
          </div>

          {error && (
            <p className="text-xs text-destructive font-medium bg-destructive/10 p-2 rounded">
              {error}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
              {t("draft.decision.cancel")}
            </Button>
            <Button
              type="submit"
              variant={action === "approve" ? "default" : "destructive"}
              size="sm"
              disabled={submitting}
            >
              {submitting ? t("draft.decision.submitting") : action === "approve" ? t("draft.decision.confirmApprove") : t("draft.decision.confirmReject")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

