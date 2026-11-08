import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import {
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ExclamationCircleIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { useActiveWorkspaceSelection } from "@/features/projects/hooks/use-active-workspace-selection";
import { queryLineage } from "@/features/export/api/export.api";
import type { LineageItem } from "@/features/export/model/export.types";
import { getSnapshot } from "@/features/snapshots/api/snapshots.api";
import type { SnapshotDetail } from "@/features/snapshots/model/snapshot.types";
import { ApiError } from "@/shared/lib/api-client";
import { useStableT } from "@/shared/i18n/use-stable-t";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";

type RegistryFilter = "all" | "verified" | "review" | "unlinked";

interface RegistryRow {
  externalId: string;
  quote: string;
  studyTitle: string;
  studyAuthors: string[];
  studyYear: number;
  claims: string[];
  verified: boolean;
}

function collectRegistryRows(items: LineageItem[]): RegistryRow[] {
  const byEvidence = new Map<string, RegistryRow>();
  for (const item of items) {
    for (const evidence of item.evidence) {
      const existing = byEvidence.get(evidence.externalId);
      if (existing) {
        if (!existing.claims.includes(item.text)) existing.claims.push(item.text);
        continue;
      }
      byEvidence.set(evidence.externalId, {
        externalId: evidence.externalId,
        quote: evidence.quote,
        studyTitle: evidence.studyTitle,
        studyAuthors: evidence.studyAuthors,
        studyYear: evidence.studyYear,
        claims: [item.text],
        verified: evidence.quoteHashVerified,
      });
    }
  }
  return [...byEvidence.values()];
}

export function EvidenceRegistryPage() {
  const { t } = useTranslation();
  const stableT = useStableT();
  const {
    selectedProjectId,
    selectedSnapshotId,
    activeSnapshot,
    projectsLoading,
    projectsError,
    snapshotsLoading,
  } = useActiveWorkspaceSelection();
  const [snapshot, setSnapshot] = useState<SnapshotDetail | null>(null);
  const [lineage, setLineage] = useState<LineageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [lineageError, setLineageError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RegistryFilter>("all");

  useEffect(() => {
    let cancelled = false;
    setSnapshot(null);
    setSnapshotError(null);
    if (!selectedProjectId || !selectedSnapshotId) return () => { cancelled = true; };

    void getSnapshot(selectedProjectId, selectedSnapshotId)
      .then((detail) => { if (!cancelled) setSnapshot(detail); })
      .catch((error: unknown) => {
        if (!cancelled) setSnapshotError(error instanceof Error ? error.message : stableT("evidenceRegistry.snapshotError"));
      });
    return () => { cancelled = true; };
  }, [selectedProjectId, selectedSnapshotId, stableT]);

  useEffect(() => {
    let cancelled = false;
    setLineage([]);
    setLineageError(null);
    if (!selectedProjectId || !selectedSnapshotId) {
      setLoading(false);
      return () => { cancelled = true; };
    }

    setLoading(true);
    void queryLineage(selectedProjectId, selectedSnapshotId)
      .then((response) => { if (!cancelled) setLineage(response.lineage); })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (!(error instanceof ApiError && error.status === 404)) {
          setLineageError(error instanceof Error ? error.message : stableT("evidenceRegistry.loadError"));
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedProjectId, selectedSnapshotId, stableT]);

  const rows = useMemo(() => collectRegistryRows(lineage), [lineage]);
  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return rows.filter((row) => {
      const matchesFilter = filter === "all"
        || (filter === "verified" && row.verified)
        || (filter === "review" && !row.verified);
      if (!matchesFilter) return false;
      if (!normalizedQuery) return true;
      return [row.externalId, row.quote, row.studyTitle, row.studyAuthors.join(" "), ...row.claims]
        .some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
    });
  }, [filter, query, rows]);

  const totalEvidence = snapshot?._count.evidence ?? 0;
  const unlinkedCount = Math.max(0, totalEvidence - rows.length);
  const studioUrl = selectedProjectId && selectedSnapshotId
    ? `/drafting?projectId=${encodeURIComponent(selectedProjectId)}&snapshotId=${encodeURIComponent(selectedSnapshotId)}`
    : "/drafting";
  const exportUrl = selectedProjectId && selectedSnapshotId
    ? `/export?projectId=${encodeURIComponent(selectedProjectId)}&snapshotId=${encodeURIComponent(selectedSnapshotId)}`
    : "/export";

  const filters: Array<{ id: RegistryFilter; label: string; count?: number }> = [
    { id: "all", label: t("evidenceRegistry.filterAll"), count: rows.length },
    { id: "verified", label: t("evidenceRegistry.filterVerified"), count: rows.filter((row) => row.verified).length },
    { id: "review", label: t("evidenceRegistry.filterReview"), count: rows.filter((row) => !row.verified).length },
    { id: "unlinked", label: t("evidenceRegistry.filterUnlinked"), count: unlinkedCount },
  ];

  const isWorkspaceLoading = projectsLoading || snapshotsLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{t("evidenceRegistry.eyebrow")}</p>
          <h1 className="slrw-page-title mt-1">{t("navigation.evidenceRegistry")}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t("evidenceRegistry.description")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to={studioUrl}><PencilSquareIcon aria-hidden="true" />{t("evidenceRegistry.returnToDraft")}</Link>
          </Button>
          <Button asChild>
            <Link to={exportUrl}><ArrowDownTrayIcon aria-hidden="true" />{t("navigation.exportDraft")}</Link>
          </Button>
        </div>
      </div>

      {projectsError && <p role="alert" className="rounded-lg border border-destructive/30 px-4 py-3 text-sm text-destructive">{projectsError}</p>}
      {snapshotError && <p role="alert" className="rounded-lg border border-destructive/30 px-4 py-3 text-sm text-destructive">{snapshotError}</p>}

      {!selectedProjectId || !selectedSnapshotId ? (
        <Card><CardContent className="py-14 text-center">
          <h3 className="text-base font-semibold">{t("evidenceRegistry.noSnapshotTitle")}</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{t("evidenceRegistry.noSnapshotBody")}</p>
          <Button asChild className="mt-5"><Link to="/snapshots">{t("navigation.snapshots")}<ChevronRightIcon aria-hidden="true" /></Link></Button>
        </CardContent></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4">
            <div className="relative min-w-[min(100%,22rem)] flex-1 sm:max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <label className="sr-only" htmlFor="registry-search">{t("evidenceRegistry.searchLabel")}</label>
              <Input
                id="registry-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("evidenceRegistry.searchPlaceholder")}
                className="pl-10 pr-3"
              />
            </div>
            <div role="group" aria-label={t("evidenceRegistry.filtersLabel")} className="flex flex-wrap gap-2">
              {filters.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={filter === item.id}
                  onClick={() => setFilter(item.id)}
                  className={`min-h-11 rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:min-h-10 ${filter === item.id ? "border-primary/25 bg-secondary text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted"}`}
                >
                  {item.label}{item.count !== undefined && <span className="ml-1.5 tabular-nums">{item.count}</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/20 px-5 py-3 text-xs text-muted-foreground">
            <span>{t("evidenceRegistry.dataScope", { linked: rows.length, total: totalEvidence })}</span>
            <span>{activeSnapshot?.sourceRunId ?? snapshot?.sourceRunId}</span>
          </div>

          {filter === "unlinked" ? (
            <div className="px-5 py-10 text-center">
              <h3 className="text-sm font-semibold">{t("evidenceRegistry.unlinkedTitle", { count: unlinkedCount })}</h3>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{t("evidenceRegistry.unlinkedBody")}</p>
            </div>
          ) : loading || isWorkspaceLoading ? (
            <p role="status" className="px-5 py-12 text-center text-sm text-muted-foreground">{t("evidenceRegistry.loading")}</p>
          ) : lineageError ? (
            <p role="alert" className="px-5 py-12 text-center text-sm text-destructive">{lineageError}</p>
          ) : filteredRows.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-muted-foreground">{t(rows.length === 0 ? "evidenceRegistry.noDraftEvidence" : "evidenceRegistry.noMatches")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead className="bg-muted/20 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-5 py-3">{t("evidenceRegistry.colEvidence")}</th>
                    <th scope="col" className="px-5 py-3">{t("evidenceRegistry.colClaim")}</th>
                    <th scope="col" className="px-5 py-3">{t("evidenceRegistry.colSource")}</th>
                    <th scope="col" className="px-5 py-3">{t("evidenceRegistry.colStatus")}</th>
                    <th scope="col" className="w-10 px-3 py-3"><span className="sr-only">{t("evidenceRegistry.openDraft")}</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRows.map((row) => (
                    <tr key={row.externalId} className="align-top transition-colors hover:bg-muted/20">
                      <td className="px-5 py-4">
                        <span className="block font-mono text-sm font-bold text-primary">{row.externalId}</span>
                        <span className="mt-1 block max-w-[15rem] text-xs leading-5 text-muted-foreground">{row.quote}</span>
                      </td>
                      <td className="max-w-[34rem] px-5 py-4">
                        <span className="line-clamp-2 text-sm leading-6 text-foreground">{row.claims[0]}</span>
                        {row.claims.length > 1 && <span className="mt-1 block text-xs text-muted-foreground">{t("evidenceRegistry.additionalClaims", { count: row.claims.length - 1 })}</span>}
                      </td>
                      <td className="max-w-[15rem] px-5 py-4">
                        <span className="block text-sm font-semibold text-foreground">{row.studyTitle}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">{[row.studyAuthors.slice(0, 2).join(", "), row.studyYear || ""].filter(Boolean).join(" · ") || t("evidenceRegistry.sourceDetailsUnavailable")}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${row.verified ? "bg-secondary text-primary" : "bg-warning-soft text-warning"}`}>
                          {row.verified ? <CheckCircleIcon className="size-3.5" aria-hidden="true" /> : <ExclamationCircleIcon className="size-3.5" aria-hidden="true" />}
                          {t(row.verified ? "evidenceRegistry.verified" : "evidenceRegistry.needsReview")}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-muted-foreground">
                        <Link to={studioUrl} aria-label={t("evidenceRegistry.openDraftFor", { id: row.externalId })} className="inline-flex size-11 items-center justify-center rounded-md hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:size-10">
                          <ChevronRightIcon className="size-4" aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3 text-xs text-muted-foreground">
            <span>{t("evidenceRegistry.rowsSummary", { shown: filteredRows.length, linked: rows.length, total: totalEvidence })}</span>
            <span>{t("evidenceRegistry.footerHint")}</span>
          </div>
        </Card>
      )}
    </div>
  );
}
