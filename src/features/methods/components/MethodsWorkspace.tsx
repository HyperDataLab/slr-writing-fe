import { useEffect, useRef, useState } from "react";
import { ArrowPathIcon, ClipboardDocumentIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { generateMethods, getLatestMethods, getMethodsRevision } from "@/features/methods/api/methods.api";
import { MethodsDocument } from "@/features/methods/components/MethodsDocument";
import { MethodsFactList } from "@/features/methods/components/MethodsFactList";
import type { MethodsRevision, MethodsRevisionSummary } from "@/features/methods/model/methods.types";
import type { SnapshotSummary } from "@/features/snapshots/model/snapshot.types";
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
  const isReady = snapshot.status === "READY";

  useEffect(() => {
    let cancelled = false;
    const requestId = ++revisionRequestId.current;
    setIsLoading(true);
    setError(null);
    setRevision(null);
    setVersions([]);
    setSelectedVersion("");
    setGenerationResult(null);

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

  return (
    <div className="space-y-5">
      <GsapReveal>
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>{t("methods.snapshotTitle")}</CardTitle>
            <CardDescription>
              {t("methods.snapshotDescription", { runId: snapshot.sourceRunId })}
            </CardDescription>
          </div>
          <Badge variant={isReady ? "default" : "outline"}>
            {t(`snapshots.status.${snapshot.status}`)}
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {isReady ? t("methods.snapshotReady") : t("methods.snapshotNotReady")}
          </p>
          <Button type="button" onClick={() => void handleGenerate()} disabled={!isReady || isGenerating || isLoading || isLoadingVersion}>
            <ArrowPathIcon aria-hidden="true" />
            {t(isGenerating ? "methods.generating" : revision ? "methods.generateAgain" : "methods.generate")}
          </Button>
        </CardContent>
      </Card>
      </GsapReveal>

      {generationResult && (
        <p role="status" className="rounded-lg border border-border bg-secondary/60 px-4 py-3 text-sm text-foreground">
          {t(generationResult === "created" ? "methods.generated" : "methods.unchanged", { version: revision?.version })}
        </p>
      )}
      {error && <p role="alert" className="rounded-lg border border-border px-4 py-3 text-sm text-destructive">{error}</p>}

      {isLoading ? (
        <GsapReveal><Card><CardContent className="py-12 text-center text-sm text-muted-foreground">{t("methods.loading")}</CardContent></Card></GsapReveal>
      ) : !revision ? (
        <GsapReveal><Card className="flex min-h-56 items-center justify-center">
          <CardContent className="max-w-md px-6 py-10 text-center">
            <p className="text-base font-semibold text-foreground">{t("methods.emptyTitle")}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {isReady ? t("methods.emptyDescription") : t("methods.blockedDescription")}
            </p>
          </CardContent>
        </Card></GsapReveal>
      ) : (
        <>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(19rem,0.85fr)]">
            <div className="space-y-5">
              <GsapReveal>
              <Card>
                <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle>{t("methods.documentTitle")}</CardTitle>
                    <CardDescription className="mt-1">{t("methods.documentDescription")}</CardDescription>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={() => void handleCopy()}>
                    <ClipboardDocumentIcon aria-hidden="true" />
                    {t(copyResult === "copied" ? "methods.copied" : "methods.copyMarkdown")}
                  </Button>
                </CardHeader>
                <CardContent>
                  {copyResult === "failed" && (
                    <p role="status" className="mb-3 text-xs text-muted-foreground">{t("methods.copyFailed")}</p>
                  )}
                  {isLoadingVersion ? (
                    <p role="status" className="py-8 text-center text-sm text-muted-foreground">{t("methods.loadingRevision")}</p>
                  ) : (
                    <MethodsDocument markdown={revision.markdown} />
                  )}
                </CardContent>
              </Card>
              </GsapReveal>

              <GsapReveal effect="fade">
              <Card>
                <CardHeader>
                  <CardTitle>{t("methods.sourcesTitle")}</CardTitle>
                  <CardDescription>{t("methods.sourcesDescription")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <details>
                    <summary className="cursor-pointer text-sm font-semibold text-foreground">
                      {t("methods.sourcesSummary", { count: sourceFacts.length })}
                    </summary>
                    <div className="mt-4">
                      <MethodsFactList facts={sourceFacts} />
                    </div>
                  </details>
                </CardContent>
              </Card>
              </GsapReveal>
            </div>

            <aside className="space-y-5">
              <GsapReveal effect="fade">
              <Card>
                <CardHeader>
                  <CardTitle>{t("methods.prismaTitle")}</CardTitle>
                  <CardDescription>{t("methods.prismaDescription")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <MethodsFactList facts={prismaFacts} />
                </CardContent>
              </Card>
              </GsapReveal>

              <GsapReveal effect="fade">
              <Card>
                <CardHeader className="flex-row items-start gap-3">
                  <ExclamationTriangleIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="space-y-1.5">
                    <CardTitle>{t("methods.warningsTitle")}</CardTitle>
                    <CardDescription>{t("methods.warningsDescription", { count: revision.warnings.length })}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  {revision.warnings.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("methods.noWarnings")}</p>
                  ) : (
                    <ul className="space-y-3">
                      {revision.warnings.map((warning, index) => (
                        <GsapListItem key={`${warning.code}-${warning.ref ?? index}`} delay={index * 0.04} className="rounded-lg border border-border bg-secondary/40 p-3">
                          <p className="text-xs font-semibold text-foreground">{warning.code}</p>
                          <p className="mt-1 text-sm leading-5 text-muted-foreground">{warning.message}</p>
                          {warning.ref && <code className="mt-2 block break-all text-[11px] text-muted-foreground">{warning.ref}</code>}
                        </GsapListItem>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
              </GsapReveal>
            </aside>
          </div>

          <GsapReveal delay={0.12}>
          <Card>
            <CardContent className="grid gap-4 pt-6 sm:grid-cols-[minmax(13rem,0.5fr)_minmax(0,1fr)] sm:items-end">
              <div className="space-y-2">
                <label htmlFor="methods-version" className="text-sm font-medium text-foreground">
                  {t("methods.versionLabel")}
                </label>
                <select
                  id="methods-version"
                  value={selectedVersion}
                  onChange={(event) => void handleVersionChange(event.target.value)}
                  disabled={versions.length < 2 || isGenerating || isLoadingVersion}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-foreground/40 disabled:opacity-60"
                >
                  {versions.map((version) => (
                    <option key={version.id} value={version.version}>
                      {t("methods.versionOption", { version: version.version })}
                    </option>
                  ))}
                </select>
              </div>
              <dl className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
                <div>
                  <dt>{t("methods.generator")}</dt>
                  <dd className="mt-1 break-all font-medium text-foreground">{revision.generator}</dd>
                </div>
                <div>
                  <dt>{t("methods.createdAt")}</dt>
                  <dd className="mt-1 font-medium text-foreground">
                    {new Date(revision.createdAt).toLocaleString(i18n.resolvedLanguage ?? "en")}
                  </dd>
                </div>
                <div>
                  <dt>{t("methods.contentHash")}</dt>
                  <dd className="mt-1 break-all font-mono text-foreground">{revision.contentHash}</dd>
                </div>
              </dl>
              {!displayedVersionIsLatest && (
                <p className="text-xs text-muted-foreground sm:col-span-2">{t("methods.historicalVersion")}</p>
              )}
            </CardContent>
          </Card>
          </GsapReveal>
        </>
      )}
    </div>
  );
}
