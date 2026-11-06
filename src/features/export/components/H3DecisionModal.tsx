import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ShieldCheckIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";

export function H3DecisionModal({
  isOpen,
  onClose,
  action,
  compositeHash,
  onConfirm,
  submitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  action: "approve" | "reject";
  compositeHash: string;
  onConfirm: (note?: string) => Promise<void>;
  submitting: boolean;
}) {
  const { t } = useTranslation();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

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
      setError(err instanceof Error ? err.message : t("exportPkg.decision.submitError"));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {action === "approve" ? (
              <ShieldCheckIcon className="size-6 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <XCircleIcon className="size-6 text-rose-600 dark:text-rose-400" />
            )}
            <DialogTitle>
              {action === "approve" ? t("exportPkg.decision.approveTitle") : t("exportPkg.decision.rejectTitle")}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs pt-1">
            {action === "approve"
              ? t("exportPkg.decision.approveDescription")
              : t("exportPkg.decision.rejectDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-sm">
          <div className="bg-muted/50 p-2.5 rounded-md border border-border/60 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("exportPkg.decision.targetHash")}:</span>
              <span className="font-mono text-muted-foreground text-[11px] truncate max-w-[200px]" title={compositeHash}>
                {compositeHash ? `${compositeHash.slice(0, 20)}...` : "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("exportPkg.decision.authority")}:</span>
              <span className="font-semibold text-foreground">{t("exportPkg.decision.owner")}</span>
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
                  ? t("exportPkg.decision.notePlaceholderApprove")
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
              {submitting ? t("exportPkg.decision.recording") : action === "approve" ? t("exportPkg.decision.confirmApprove") : t("exportPkg.decision.confirmReject")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
