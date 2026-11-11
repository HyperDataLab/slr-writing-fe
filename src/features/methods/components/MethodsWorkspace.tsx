import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ArrowPathIcon, ChevronDownIcon, ClipboardDocumentIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { generateMethods, getLatestMethods, getMethodsRevision } from "@/features/methods/api/methods.api";
import { MethodsDocument } from "@/features/methods/components/MethodsDocument";
import { MethodsFactList } from "@/features/methods/components/MethodsFactList";
import type { MethodsRevision, MethodsRevisionSummary } from "@/features/methods/model/methods.types";
import { getSnapshot } from "@/features/snapshots/api/snapshots.api";
import type { SnapshotDetail, SnapshotSummary } from "@/features/snapshots/model/snapshot.types";
import { ApiError } from "@/shared/lib/api-client";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { GsapListItem, GsapReveal } from "@/shared/ui/gsap-motion";

function revisionSummary(revision: MethodsRevision): MethodsRevisionSummary {
  return {
    id: revision.id,
    version: revision.version,
    generator: revision.generator,
    contentHash: revision.contentHash,
    createdBy: revision.createdBy,
    createdAt: revision.createdAt,
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function MethodsDisclosure({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();

  return (
    <div>
      <h3>
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => setIsOpen((current) => !current)}
          className="group flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left text-pretty text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <span className="flex min-w-0 items-center gap-2">
            {icon}
            <span>{title}</span>
          </span>
          <ChevronDownIcon
            className={`size-4 shrink-0 text-muted transition-[rotate,color] duration-200 group-hover:text-foreground motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
      </h3>
      <div
        id={panelId}
        inert={!isOpen}
        className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="px-5 pb-4 text-sm/6 text-muted-foreground">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function MethodsWorkspace({
  projectId,
  snapshot,
}: {
  projectId: string;
  snapshot: SnapshotSummary;
}) {
  const { t, i18n } = useTranslation();
  const revisionRequestId = useRef(0);
  const [revision, setRevision] = useState<MethodsRevision | null>(null);
  const [versions, setVersions] = useState<MethodsRevisionSummary[]>([]);
  const [selectedVersion, setSelectedVersion] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingVersion, setIsLoadingVersion] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationResult, setGenerationResult] = useState<"created" | "unchanged" | null>(null);
  const [copyResult, setCopyResult] = useState<"copied" | "failed" | null>(null);
  const [snapshotDetail, setSnapshotDetail] = useState<SnapshotDetail | null>(null);
  const [snapshotDetailState, setSnapshotDetailState] = useState<"loading" | "loaded" | "error">("loading");
  const isReady = snapshot.status === "READY";

  useEffect(() => {
    let cancelled = false;
    setSnapshotDetail(null);
    setSnapshotDetailState("loading");

    void getSnapshot(projectId, snapshot.id)
      .then((detail) => {
        if (!cancelled) {
          setSnapshotDetail(detail);
          setSnapshotDetailState("loaded");
        }
      })
      .catch(() => {
        if (!cancelled) setSnapshotDetailState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, snapshot.id]);

  useEffect(() => {
    let cancelled = false;
    const requestId = ++revisionRequestId.current;
    setIsLoading(true);
    setError(null);
    setRevision(null);
    setVersions([]);
    setSelectedVersion("");
    setGenerationResult(null);
    setCopyResult(null);

    void getLatestMethods(projectId, snapshot.id)
      .then((response) => {
        if (cancelled) return;
        setRevision(response.revision);
        setVersions(response.versions);
        setSelectedVersion(String(response.revision.version));
      })
      .catch((requestError: unknown) => {
        if (cancelled) return;
        if (requestError instanceof ApiError && requestError.code === "METHODS_NOT_GENERATED") {
          setRevision(null);
          setVersions([]);
          setError(null);
          return;
        }
        setError(getErrorMessage(requestError, t("methods.loadError")));
      })
      .finally(() => {
        if (!cancelled && requestId === revisionRequestId.current) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      revisionRequestId.current += 1;
    };
  }, [projectId, snapshot.id, t]);

  async function handleGenerate() {
    if (!isReady || isGenerating) return;
    revisionRequestId.current += 1;
    setIsGenerating(true);
    setIsLoadingVersion(false);
    setError(null);
    setGenerationResult(null);
    setCopyResult(null);

    try {
      const result = await generateMethods(projectId, snapshot.id);
      setRevision(result.revision);
      setSelectedVersion(String(result.revision.version));
      setVersions((current) => [
        ...current.filter((item) => item.version !== result.revision.version),
        revisionSummary(result.revision),
      ].sort((left, right) => left.version - right.version));
      setGenerationResult(result.created ? "created" : "unchanged");
    } catch (requestError) {
      setError(getErrorMessage(requestError, t("methods.generateError")));
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleVersionChange(versionValue: string) {
    setSelectedVersion(versionValue);
    setError(null);
    if (!versionValue) return;
    const version = Number(versionValue);
    if (revision?.version === version) return;

    const requestId = ++revisionRequestId.current;
    setIsLoadingVersion(true);
    try {
      const selectedRevision = await getMethodsRevision(projectId, snapshot.id, version);
      if (requestId !== revisionRequestId.current) return;
      setRevision(selectedRevision);
      setCopyResult(null);
    } catch (requestError) {
      if (requestId === revisionRequestId.current) {
        setError(getErrorMessage(requestError, t("methods.revisionError")));
      }
    } finally {
      if (requestId === revisionRequestId.current) setIsLoadingVersion(false);
    }
  }

  async function handleCopy() {
    if (!revision) return;
    try {
      await navigator.clipboard.writeText(revision.markdown);
      setCopyResult("copied");
    } catch {
      setCopyResult("failed");
    }
  }

  const prismaFacts = revision?.facts.filter((fact) => fact.key.startsWith("prisma.")) ?? [];
  const sourceFacts = revision?.facts.filter((fact) => !fact.key.startsWith("prisma.")) ?? [];
  const displayedVersionIsLatest = revision?.version === versions.at(-1)?.version;
  const generator = revision?.generator ?? "methods-template@1";
  const isDeterministicTemplate = generator === "methods-template@1";

  return (
    <div className="space-y-4" aria-busy={isLoading || isLoadingVersion || isGenerating}>
      <GsapReveal>
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={!isReady || isGenerating || isLoading || isLoadingVersion}
            isLoading={isGenerating}
          >
            {!isGenerating && <ArrowPathIcon aria-hidden="true" />}
            {t(isGenerating ? "methods.generating" : revision ? "methods.generateAgain" : "methods.generate")}
          </Button>
        </div>
      </GsapReveal>

      <GsapReveal>
        <section aria-label={t("methods.pipelineLabel")} className="grid gap-2 sm:grid-cols-3">
          <div className="min-w-0 rounded-xl bg-secondary/70 p-3 sm:p-4">
            <p className="text-sm font-semibold text-foreground">{t("methods.pipelineSnapshot")}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {snapshotDetail ? (
                <>
                  {snapshotDetail._count.studies} {t("methods.studyCount", { count: snapshotDetail._count.studies })}
                  <span aria-hidden="true"> · </span>
                  {snapshotDetail._count.findings} {t("methods.findingCount", { count: snapshotDetail._count.findings })}
                </>
              ) : t(snapshotDetailState === "loading" ? "methods.snapshotFactsLoading" : "methods.snapshotFactsUnavailable")}
            </p>
          </div>
          <div className="min-w-0 rounded-xl bg-secondary/70 p-3 sm:p-4">
            <p className="text-sm font-semibold text-foreground">{t("methods.pipelineTemplate")}</p>
            <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
              {generator}{isDeterministicTemplate && <> · {t("methods.llmNotUsed")}</>}
            </p>
          </div>
          <div className="min-w-0 rounded-xl bg-secondary/70 p-3 sm:p-4">
            <p className="text-sm font-semibold text-foreground">{t("methods.pipelineGrounding")}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {revision
                ? t(isDeterministicTemplate ? "methods.groundingPassed" : "methods.groundingUnknown")
                : t("methods.groundingOnGenerate")}
            </p>
          </div>
        </section>
      </GsapReveal>

      {generationResult && (
        <p role="status" className="rounded-xl bg-secondary/70 px-4 py-3 text-sm text-foreground">
          {t(generationResult === "created" ? "methods.generated" : "methods.unchanged", { version: revision?.version })}
        </p>
      )}
      {error && <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

      {isLoading ? (
        <GsapReveal>
          <Card><CardContent role="status" className="py-10 text-center text-sm text-muted-foreground">{t("methods.loading")}</CardContent></Card>
        </GsapReveal>
      ) : !revision ? (
        <GsapReveal>
          <Card>
            <CardContent className="py-8">
              <p className="text-base font-semibold text-foreground">
                {isReady ? t("methods.emptyTitle") : t("methods.blockedTitle")}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {isReady ? t("methods.emptyDescription") : t("methods.blockedDescription")}
              </p>
            </CardContent>
          </Card>
        </GsapReveal>
      ) : (
        <>
          {!displayedVersionIsLatest && (
            <p role="status" className="text-sm text-muted-foreground">{t("methods.historicalVersion")}</p>
          )}

          <GsapReveal>
            <Card>
              <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <CardTitle>{t("methods.documentTitle", { version: revision.version })}</CardTitle>
                  <CardDescription>{t("methods.documentDescription")}</CardDescription>
                  <p className="text-xs text-muted-foreground">
                    {new Date(revision.createdAt).toLocaleString(i18n.resolvedLanguage ?? "en")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  {versions.length > 1 ? (
                    <>
                      <label htmlFor="methods-version" className="sr-only">{t("methods.versionLabel")}</label>
                      <select
                        id="methods-version"
                        value={selectedVersion}
                        onChange={(event) => void handleVersionChange(event.target.value)}
                        disabled={isGenerating || isLoadingVersion}
                        className="h-11 min-w-32 rounded-xl border border-input bg-background px-3 text-base text-foreground outline-none transition-colors focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60 md:h-10 md:text-sm"
                      >
                        {versions.map((version) => (
                          <option key={version.id} value={version.version}>
                            {t("methods.versionOption", { version: version.version })}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <Badge variant="secondary">{t("methods.versionOption", { version: revision.version })}</Badge>
                  )}
                  <Button type="button" size="sm" variant="outline" onClick={() => void handleCopy()} disabled={isLoadingVersion}>
                    <ClipboardDocumentIcon aria-hidden="true" />
                    {t(copyResult === "copied" ? "methods.copied" : "methods.copyMarkdown")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {copyResult === "failed" && (
                  <p role="status" className="text-sm text-muted-foreground">{t("methods.copyFailed")}</p>
                )}
                {isLoadingVersion ? (
                  <p role="status" className="py-8 text-center text-sm text-muted-foreground">{t("methods.loadingRevision")}</p>
                ) : (
                  <MethodsDocument markdown={revision.markdown} />
                )}
                <dl className="grid gap-3 rounded-xl bg-secondary/60 p-4 text-xs sm:grid-cols-2">
                  <div className="min-w-0 space-y-1">
                    <dt className="text-muted-foreground">{t("methods.sourceIntegrityHash")}</dt>
                    <dd className="break-all font-mono leading-5 text-foreground">
                      {snapshotDetail?.integrityHash ?? t(snapshotDetailState === "loading" ? "methods.snapshotFactsLoading" : "methods.sourceIntegrityUnavailable")}
                    </dd>
                  </div>
                  <div className="min-w-0 space-y-1">
                    <dt className="text-muted-foreground">{t("methods.contentHash")}</dt>
                    <dd className="break-all font-mono leading-5 text-foreground">{revision.contentHash}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </GsapReveal>

          <GsapReveal effect="fade">
            <Card>
              <div className="divide-y divide-border">
                <MethodsDisclosure title={t("methods.sourcesSummary", { count: sourceFacts.length })}>
                  <MethodsFactList facts={sourceFacts} />
                </MethodsDisclosure>
                <MethodsDisclosure title={t("methods.prismaSummary", { count: prismaFacts.length })}>
                  <MethodsFactList facts={prismaFacts} />
                </MethodsDisclosure>
                <MethodsDisclosure
                  title={t("methods.warningsSummary", { count: revision.warnings.length })}
                  icon={<ExclamationTriangleIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
                >
                  {revision.warnings.length === 0 ? (
                    <p>{t("methods.noWarnings")}</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {revision.warnings.map((warning, index) => (
                        <GsapListItem key={`${warning.code}-${warning.ref ?? index}`} delay={index * 0.04} className="space-y-1 py-3 first:pt-0 last:pb-0">
                          <p className="text-xs font-semibold text-foreground">{warning.code}</p>
                          <p className="text-sm leading-5 text-muted-foreground">{warning.message}</p>
                          {warning.ref && <code className="block break-all text-xs text-muted-foreground">{warning.ref}</code>}
                        </GsapListItem>
                      ))}
                    </ul>
                  )}
                </MethodsDisclosure>
              </div>
            </Card>
          </GsapReveal>
        </>
      )}
    </div>
  );
}
