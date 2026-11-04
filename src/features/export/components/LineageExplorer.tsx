import { useCallback, useEffect, useState } from "react";
import {
  CheckBadgeIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DocumentMagnifyingGlassIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { queryLineage } from "@/features/export/api/export.api";
import type { LineageItem } from "@/features/export/model/export.types";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export function LineageExplorer({
  projectId,
  snapshotId,
}: {
  projectId: string;
  snapshotId: string;
}) {
  const [items, setItems] = useState<LineageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [expandedIndices, setExpandedIndices] = useState<Record<number, boolean>>({ 0: true });

  const loadLineage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await queryLineage(projectId, snapshotId, {
        sectionKey: sectionFilter === "all" ? undefined : sectionFilter,
        sentence: search.trim() || undefined,
      });
      setItems(res.lineage);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load lineage graph");
    } finally {
      setLoading(false);
    }
  }, [projectId, snapshotId, sectionFilter, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadLineage();
    }, 300);
    return () => clearTimeout(timer);
  }, [loadLineage]);

  const toggleExpand = (idx: number) => {
    setExpandedIndices((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <Card className="border border-border/80">
      <CardHeader className="py-3 px-4 border-b border-border/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <DocumentMagnifyingGlassIcon className="size-5 text-primary" />
            <CardTitle className="text-base">Reverse Evidence Lineage Explorer</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cryptographic claim-to-source traceability linking drafted sentences to extracted quotes and PDF locations.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="bg-background border border-border rounded-md px-2.5 py-1.5 text-xs focus:outline-hidden focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Sections</option>
            <option value="results">Results</option>
            <option value="methods">Methods</option>
            <option value="discussion">Discussion</option>
          </select>

          <div className="relative flex-1 sm:w-56">
            <MagnifyingGlassIcon className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search claims or quotes..."
              className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-md text-xs focus:outline-hidden focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {loading ? (
          <div className="text-center py-12 text-sm text-muted-foreground animate-pulse">
            Tracing claim lineage from snapshot corpus...
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive text-sm">{error}</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-xs">
            No lineage items found for current filters.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, idx) => {
              const isExpanded = !!expandedIndices[idx];
              return (
                <div
                  key={idx}
                  className="border border-border/60 rounded-lg overflow-hidden transition-colors hover:border-primary/40 bg-card"
                >
                  {/* Paragraph Header */}
                  <div
                    onClick={() => toggleExpand(idx)}
                    className="p-3 bg-muted/20 flex items-center justify-between cursor-pointer select-none text-xs gap-3"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {isExpanded ? (
                        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="font-mono font-bold text-foreground shrink-0">
                        [{item.paragraphKey || `para_${item.paragraphIndex + 1}`}]
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground uppercase bg-muted px-1.5 py-0.5 rounded shrink-0">
                        {item.sectionKey}
                      </span>
                      <p className="text-muted-foreground truncate italic">
                        &ldquo;{item.text.slice(0, 100)}...&rdquo;
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px]">
                        {item.evidence.length} Evidence
                      </Badge>
                      {item.claimStrength && (
                        <Badge
                          variant={
                            item.claimStrength === "DEFINITIVE"
                              ? "success"
                              : item.claimStrength === "PROBABILISTIC"
                              ? "secondary"
                              : "warning"
                          }
                          className="text-[10px]"
                        >
                          {item.claimStrength}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="p-4 space-y-4 text-xs border-t border-border/40">
                      {/* Full Paragraph Text */}
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                          Drafted Assertion Prose
                        </span>
                        <p className="bg-muted/30 p-3 rounded-md border border-border/40 leading-relaxed text-foreground">
                          {item.text}
                        </p>
                      </div>

                      {/* Rhetorical Plan */}
                      {(item.rhetoricalMove || item.claimSlot) && (
                        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-muted/20 p-2.5 rounded border border-border/30">
                          <div>
                            <span className="text-muted-foreground block font-sans">Move:</span>
                            <span className="font-semibold text-foreground">{item.rhetoricalMove || "N/A"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block font-sans">Claim Slot:</span>
                            <span className="font-semibold text-foreground truncate block">{item.claimSlot || "N/A"}</span>
                          </div>
                        </div>
                      )}

                      {/* Evidence Anchors Traceability Chain */}
                      <div className="space-y-2">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                          Anchored Source Evidence ({item.evidence.length})
                        </span>

                        {item.evidence.length === 0 ? (
                          <p className="text-muted-foreground italic text-[11px]">No direct evidence anchors attached.</p>
                        ) : (
                          <div className="space-y-2.5">
                            {item.evidence.map((ev) => (
                              <div
                                key={ev.id}
                                className="p-3 rounded-md bg-muted/40 border border-border/60 space-y-2 text-xs"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <span className="font-mono font-bold text-primary mr-2">[{ev.externalId}]</span>
                                    <span className="font-semibold text-foreground">{ev.studyTitle}</span>
                                    <span className="text-muted-foreground ml-1.5">
                                      ({ev.studyAuthors?.slice(0, 2).join(", ") || "Authors"} et al., {ev.studyYear})
                                    </span>
                                  </div>
                                  <Badge
                                    variant={ev.quoteHashVerified ? "success" : "warning"}
                                    className="gap-1 shrink-0 text-[10px]"
                                  >
                                    <CheckBadgeIcon className="size-3" />
                                    {ev.quoteHashVerified ? "Hash Verified" : "Unverified"}
                                  </Badge>
                                </div>

                                <blockquote className="border-l-2 border-primary/60 pl-3 py-0.5 text-foreground italic bg-background/50 rounded-r text-[12px] leading-relaxed">
                                  &ldquo;{ev.quote}&rdquo;
                                </blockquote>

                                <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
                                  <span>Location: Page {ev.page || 1}, Section &apos;{ev.section || "Body"}&apos;, Para {ev.paragraph || 1}</span>
                                  {ev.studyDoi && (
                                    <span className="truncate max-w-xs">DOI: {ev.studyDoi}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

