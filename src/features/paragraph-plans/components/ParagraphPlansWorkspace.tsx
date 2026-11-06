import { useCallback, useEffect, useState } from "react";
import { ArrowPathIcon, SparklesIcon } from "@heroicons/react/24/outline";
import {
  createParagraphPlans,
  getParagraphPlans,
} from "@/features/paragraph-plans/api/paragraph-plans.api";
import { ApiError } from "@/shared/lib/api-client";
import { ParagraphPlanCard } from "@/features/paragraph-plans/components/ParagraphPlanCard";
import type { ParagraphPlanView } from "@/features/paragraph-plans/model/paragraph-plan.types";
import type { SnapshotSummary } from "@/features/snapshots/model/snapshot.types";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { MotionReveal } from "@/shared/ui/motion";

export function ParagraphPlansWorkspace({
  projectId,
  snapshot,
}: {
  projectId: string;
  snapshot: SnapshotSummary;
}) {
  const [view, setView] = useState<ParagraphPlanView | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>("all");

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getParagraphPlans(projectId, snapshot.id);
      setView(data);
    } catch (err: unknown) {
      setView(null);
      if (!(err instanceof ApiError && err.status === 404)) {
        setError(err instanceof Error ? err.message : "Failed to load paragraph plans");
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, snapshot.id]);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      await createParagraphPlans(projectId, snapshot.id);
      setView(await getParagraphPlans(projectId, snapshot.id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate paragraph plans");
    } finally {
      setGenerating(false);
    }
  };

  const allPlans = view?.revision.content.plans ?? [];
  const sectionStats = new Map<string, { count: number; ready: number }>();
  for (const plan of allPlans) {
    const info = sectionStats.get(plan.sectionKey) ?? { count: 0, ready: 0 };
    info.count += 1;
    if (plan.status === "READY_TO_DRAFT") info.ready += 1;
    sectionStats.set(plan.sectionKey, info);
  }
  const sectionsList = [...sectionStats.keys()];
  const filteredParagraphs = allPlans.filter((p) =>
    activeSection === "all" ? true : p.sectionKey === activeSection,
  );

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <Card className="border border-border/80">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">Paragraph Planning Studio (M6)</CardTitle>
              {view && (
                <Badge variant="outline" className="font-mono text-xs">
                  v{view.revision.version}
                </Badge>
              )}
            </div>
            <CardDescription className="mt-1">
              Deterministic allocation of evidence quotes and rhetorical moves per paragraph based on approved H1 Blueprint.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadPlans}
              disabled={loading || generating}
              className="gap-1.5"
            >
              <ArrowPathIcon className={`size-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleGenerate}
              disabled={generating}
              className="gap-1.5"
            >
              <SparklesIcon className="size-4" />
              {generating ? "Planning..." : view ? "Regenerate Plans" : "Generate Paragraph Plans"}
            </Button>
          </div>
        </CardHeader>

        {view && (
          <CardContent className="pt-0 border-t border-border/60">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 text-center">
              <div className="bg-muted/40 p-3 rounded-lg border border-border/40">
                <span className="text-xs text-muted-foreground uppercase tracking-wider block font-medium">Total Paragraphs</span>
                <span className="text-2xl font-bold text-foreground mt-0.5 block">{view.stats.totalParagraphs}</span>
              </div>
              <div className="bg-muted/40 p-3 rounded-lg border border-border/40">
                <span className="text-xs text-muted-foreground uppercase tracking-wider block font-medium">Ready to Draft</span>
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">{view.stats.readyParagraphs}</span>
              </div>
              <div className="bg-muted/40 p-3 rounded-lg border border-border/40">
                <span className="text-xs text-muted-foreground uppercase tracking-wider block font-medium">Sections Planned</span>
                <span className="text-2xl font-bold text-primary mt-0.5 block">{sectionsList.length}</span>
              </div>
              <div className="bg-muted/40 p-3 rounded-lg border border-border/40">
                <span className="text-xs text-muted-foreground uppercase tracking-wider block font-medium">Content Hash</span>
                <span className="text-xs font-mono text-muted-foreground mt-1.5 block truncate max-w-[140px] mx-auto" title={view.revision.contentHash}>
                  {view.revision.contentHash.slice(0, 16)}...
                </span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-4 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError(null)}>Dismiss</Button>
        </div>
      )}

      {view && view.issues.length > 0 && (
        <Card className="border border-amber-500/40 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {view.readyToDraft ? "Notes" : "Not ready to draft"} ({view.issues.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-xs">
            {view.issues.map((issue, idx) => (
              <div key={`${issue.code}-${issue.ref ?? idx}`} className="flex items-start gap-2">
                <Badge variant={issue.severity === "BLOCKING" ? "destructive" : "warning"} className="text-[10px] shrink-0">
                  {issue.severity}
                </Badge>
                <span>
                  <span className="font-mono text-muted-foreground">{issue.code}</span> — {issue.message}
                  {issue.ref ? <span className="font-mono text-muted-foreground"> ({issue.ref})</span> : null}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* When no plans exist yet */}
      {!loading && !view && (
        <Card className="text-center py-12 border-dashed">
          <CardContent className="space-y-4">
            <div className="size-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
              <SparklesIcon className="size-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">No Paragraph Plans Generated Yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                Paragraph plans automatically distribute validated evidence and claims into distinct paragraphs with rhetorical moves.
              </p>
            </div>
            <Button onClick={handleGenerate} disabled={generating} className="gap-2">
              <SparklesIcon className="size-4" />
              {generating ? "Generating..." : "Generate Paragraph Plans from Blueprint"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Plans View & Section Filter */}
      {view && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border/60">
            <button
              onClick={() => setActiveSection("all")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeSection === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              All Sections ({allPlans.length})
            </button>
            {sectionsList.map((sec) => {
              const info = sectionStats.get(sec);
              return (
                <button
                  key={sec}
                  onClick={() => setActiveSection(sec)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                    activeSection === sec
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <span className="capitalize">{sec}</span>
                  <span className="text-[10px] bg-background/50 px-1 rounded font-mono">
                    {info ? `${info.ready}/${info.count}` : "0"}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredParagraphs.map((item, idx) => (
              <MotionReveal key={item.id}>
                <ParagraphPlanCard item={item} index={idx} />
              </MotionReveal>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
