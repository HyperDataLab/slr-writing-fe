import { useState } from "react";
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
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (action === "reject" && (!note.trim() || note.trim().length < 5)) {
      setError("Rejection requires an explanatory note (at least 5 characters).");
      return;
    }
    setError(null);
    try {
      await onConfirm(note.trim() || undefined);
      setNote("");
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "H3 decision submission failed");
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
              {action === "approve" ? "Confirm Final Submission Approval (H3)" : "Reject Final Package (H3)"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs pt-1">
            {action === "approve"
              ? "H3 Approval authorizes creation of the immutable submission package. You confirm full responsibility as the SLR Project Owner."
              : "Rejection prevents manuscript export and requires addressing quality gate or drafting issues."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-sm">
          <div className="bg-muted/50 p-2.5 rounded-md border border-border/60 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Target Hash:</span>
              <span className="font-mono text-muted-foreground text-[11px] truncate max-w-[200px]" title={compositeHash}>
                {compositeHash ? `${compositeHash.slice(0, 20)}...` : "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Human Authority:</span>
              <span className="font-semibold text-foreground">SLR Project Owner</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">
              Review Note {action === "reject" && <span className="text-destructive">*</span>}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                action === "approve"
                  ? "Optional note (e.g. Verified by Owner for academic journal submission)..."
                  : "Required explanation for rejection..."
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
              Cancel
            </Button>
            <Button
              type="submit"
              variant={action === "approve" ? "default" : "destructive"}
              size="sm"
              disabled={submitting}
            >
              {submitting ? "Recording..." : action === "approve" ? "Authorize & Approve H3" : "Confirm Rejection H3"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
