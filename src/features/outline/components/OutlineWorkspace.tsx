import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowPathIcon, ArrowUturnLeftIcon, CheckBadgeIcon, DocumentPlusIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import type { JournalProfile } from "@/features/journal-profiles/model/journal-profile.types";
import { approveBlueprint, createBlueprint, getBlueprint, getBlueprintRevision, rejectBlueprint, saveBlueprint } from "@/features/outline/api/outline.api";
import { OutlineCoverageEditor } from "@/features/outline/components/OutlineCoverageEditor";
import { OutlineIssuesPanel } from "@/features/outline/components/OutlineIssuesPanel";
import { OutlineSectionsEditor } from "@/features/outline/components/OutlineSectionsEditor";
import type { BlueprintContent, BlueprintView } from "@/features/outline/model/outline.types";
import { ANSWERING_SECTION_KEYS, collectClaimOptions, collectQuestionIds, ensureCoverageEntries } from "@/features/outline/utils/outline.helpers";
import type { SnapshotSummary } from "@/features/snapshots/model/snapshot.types";
import { ApiError } from "@/shared/lib/api-client";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { GsapReveal } from "@/shared/ui/gsap-motion";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function profileForView(profiles: JournalProfile[], view: BlueprintView | null) {
  const profileId = view?.revision.content.profile.id;
  return profiles.find((profile) => profile.id === profileId);
}

function orderSectionsForProfile(content: BlueprintContent, profile: JournalProfile): BlueprintContent {
  const order = new Map(profile.sections.map((section) => [section.key, section.order]));
  return {
    ...content,
    sections: [...content.sections].sort((left, right) =>
      (order.get(left.key) ?? Number.MAX_SAFE_INTEGER) - (order.get(right.key) ?? Number.MAX_SAFE_INTEGER),
    ),
  };
}

export function OutlineWorkspace({
  projectId,
  projectName,
  snapshot,
  profiles,
  profilesLoading,
  requestedProfileId,
}: {
  projectId: string;
  projectName: string;
  snapshot: SnapshotSummary;
  profiles: JournalProfile[];
  profilesLoading: boolean;
  requestedProfileId: string;
}) {
  const { t, i18n } = useTranslation();
  const [view, setView] = useState<BlueprintView | null>(null);
  const [draft, setDraft] = useState<BlueprintContent | null>(null);
  const [selectedVersion, setSelectedVersion] = useState("");
  const [profileId, setProfileId] = useState(requestedProfileId);
  const [loading, setLoading] = useState(true);
  const [loadingVersion, setLoadingVersion] = useState(false);
  const [notCreated, setNotCreated] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const locale = i18n.resolvedLanguage ?? "en";

  useEffect(() => {
    if (profiles.length === 0) return;
    setProfileId((current) => {
      if (profiles.some((profile) => profile.id === current)) return current;
      if (profiles.some((profile) => profile.id === requestedProfileId)) return requestedProfileId;
      return profiles[0]?.id ?? "";
    });
  }, [profiles, requestedProfileId]);

  const loadLatest = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    setView(null);
    setDraft(null);
    setNotCreated(false);
    try {
      const nextView = await getBlueprint(projectId, snapshot.id);
      const questionIds = collectQuestionIds(nextView.revision.content, nextView.issues);
      setView(nextView);
      setDraft(ensureCoverageEntries(nextView.revision.content, questionIds));
      setSelectedVersion(String(nextView.revision.version));
      return true;
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.code === "BLUEPRINT_NOT_FOUND") {
        setNotCreated(true);
      } else {
        setError(errorMessage(requestError, t("outline.loadError")));
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [projectId, snapshot.id, t]);

  useEffect(() => {
    void loadLatest();
  }, [loadLatest]);

  const profile = profileForView(profiles, view);
  const selectedProfile = profiles.find((item) => item.id === profileId);
  const isLatest = Boolean(view && view.versions.at(-1)?.version === view.revision.version);
  const isReady = snapshot.status === "READY";
  const isBusy = creating || saving || deciding || loadingVersion;
  const dirty = Boolean(view && draft && JSON.stringify(draft) !== JSON.stringify(view.revision.content));
  const questionIds = useMemo(
    () => view ? collectQuestionIds(view.revision.content, view.issues) : [],
    [view],
  );
  const claimOptions = useMemo(
    () => view ? collectClaimOptions(view.revision.content, view.issues) : [],
    [view],
  );

  async function handleCreate() {
    if (!profileId || !isReady || creating) return;
    setCreating(true);
    setError(null);
    setMessage(null);
    try {
      const result = await createBlueprint(projectId, snapshot.id, profileId);
      if (await loadLatest()) {
        setMessage(t(result.created ? "outline.generated" : "outline.generationExists"));
      }
    } catch (requestError) {
      setError(errorMessage(requestError, t("outline.generateError")));
    } finally {
      setCreating(false);
    }
  }

  async function handleSave() {
    if (!view || !draft || !isLatest || !dirty || !isReady || saving) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const content = profile ? orderSectionsForProfile(draft, profile) : draft;
      const result = await saveBlueprint(projectId, snapshot.id, view.revision.version, content);
      if (await loadLatest()) {
        setMessage(t(result.created ? "outline.saved" : "outline.unchanged"));
      }
    } catch (requestError) {
      setError(errorMessage(requestError, t("outline.saveError")));
    } finally {
      setSaving(false);
    }
  }

  async function handleVersionChange(versionValue: string) {
    const version = Number(versionValue);
    if (!Number.isInteger(version) || version < 1 || version === view?.revision.version) return;
    setSelectedVersion(versionValue);
    setLoadingVersion(true);
    setError(null);
    setMessage(null);
    try {
      const nextView = await getBlueprintRevision(projectId, snapshot.id, version);
      const ids = collectQuestionIds(nextView.revision.content, nextView.issues);
      setView(nextView);
      setDraft(ensureCoverageEntries(nextView.revision.content, ids));
    } catch (requestError) {
      setError(errorMessage(requestError, t("outline.revisionError")));
      setSelectedVersion(String(view?.revision.version ?? ""));
    } finally {
      setLoadingVersion(false);
    }
  }

  async function handleDecision(decision: "APPROVED" | "REJECTED") {
    if (!view || !isLatest || dirty || !isReady || deciding) return;
    const note = decisionNote.trim();
    if (decision === "REJECTED" && note.length === 0) {
      setError(t("outline.rejectionNoteRequired"));
      return;
    }
    if (note.length > 2000) {
      setError(t("outline.noteTooLong"));
      return;
    }
    setDeciding(true);
    setError(null);
    setMessage(null);
    try {
      const result = decision === "APPROVED"
        ? await approveBlueprint(projectId, snapshot.id, view.revision.version, note || undefined)
        : await rejectBlueprint(projectId, snapshot.id, view.revision.version, note);
      const refreshed = await loadLatest();
      setDecisionNote("");
      if (refreshed) {
        const messageKey = result.created
          ? decision === "APPROVED" ? "outline.approvalSaved" : "outline.rejectionSaved"
          : "outline.decisionUnchanged";
        setMessage(t(messageKey));
      }
    } catch (requestError) {
      setError(errorMessage(requestError, t("outline.decisionError")));
    } finally {
      setDeciding(false);
    }
  }

  if (loading || profilesLoading) {
    return <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">{t("outline.loading")}</CardContent></Card>;
  }

  if (error && !view && !notCreated) {
    return (
      <div className="outline-builder-layout">
        <section className="outline-builder-state-panel" aria-labelledby="outline-load-error-title">
          <div className="outline-builder-state-heading">
            <span className="outline-builder-state-icon is-error" aria-hidden="true">
              <ExclamationTriangleIcon />
            </span>
            <div>
              <p className="outline-builder-state-kicker">{t("outline.studioEyebrow")}</p>
              <h2 id="outline-load-error-title">{t("outline.unavailableTitle")}</h2>
            </div>
          </div>
          <p className="outline-builder-state-description">{t("outline.loadError")}</p>
          <p role="alert" className="outline-builder-error">{error}</p>
          <div className="outline-builder-state-actions">
            <Button type="button" size="sm" variant="outline" onClick={() => void loadLatest()}>{t("common.retry")}</Button>
          </div>
        </section>
        <aside className="outline-structure-health">
          <p className="outline-structure-eyebrow">{t("outline.structureHealthTitle")}</p>
          <h2>{t("outline.healthUnavailableTitle")}</h2>
          <p className="outline-structure-description">{t("outline.structureHealthDescription")}</p>
          <div className="outline-health-notice is-error" role="status">
            <ExclamationTriangleIcon aria-hidden="true" />
            <p>{t("outline.healthUnavailable")}</p>
          </div>
        </aside>
      </div>
    );
  }

  if (notCreated || !view || !draft) {
    return (
      <div className="outline-builder-layout">
        <GsapReveal>
          <Card>
            <CardHeader>
              <CardTitle>{t("outline.notCreatedTitle")}</CardTitle>
              <CardDescription>{t("outline.generateDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {!isReady && (
                <div className="flex items-start gap-3 rounded-lg border border-warning-border bg-warning-soft p-4 text-warning">
                  <ExclamationTriangleIcon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold">{t("outline.readySnapshotRequired")}</p>
                    <Link className="mt-1 inline-block text-sm font-medium underline underline-offset-4" to={`/snapshots?projectId=${encodeURIComponent(projectId)}&snapshotId=${encodeURIComponent(snapshot.id)}`}>
                      {t("outline.openReadiness")}
                    </Link>
                  </div>
                </div>
              )}
              <div className="max-w-xl space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t("outline.profileStep")}</p>
                  <Badge variant="outline">{t("outline.profileRequired")}</Badge>
                </div>
                <p id="outline-profile-hint" className="text-sm leading-6 text-muted-foreground">
                  {t("outline.profileRequiredHint")}
                </p>
                {profiles.length === 0 ? (
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>{t("outline.noProfiles")}</p>
                    <Link className="font-medium text-primary underline-offset-4 hover:underline" to="/journal-profiles">{t("outline.openProfiles")}</Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label htmlFor="outline-profile" className="text-sm font-medium text-foreground">{t("outline.profileLabel")}</label>
                    <select
                      id="outline-profile"
                      required
                      aria-describedby="outline-profile-hint"
                      value={profileId}
                      onChange={(event) => setProfileId(event.target.value)}
                      className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-10"
                    >
                      {profiles.map((item) => <option key={item.id} value={item.id}>{item.name} · v{item.version}</option>)}
                    </select>
                    {selectedProfile?.verification.status === "unverified" && selectedProfile.notice && (
                      <p className="rounded-lg border border-warning-border bg-warning-soft p-3 text-xs leading-5 text-warning">{selectedProfile.notice}</p>
                    )}
                  </div>
                )}
              </div>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <Button type="button" onClick={() => void handleCreate()} disabled={!isReady || !profileId || profiles.length === 0 || creating}>
                <DocumentPlusIcon aria-hidden="true" />
                {t(creating ? "outline.generating" : "outline.generate")}
              </Button>
            </CardContent>
          </Card>
        </GsapReveal>
        <aside className="outline-structure-health">
          <p className="outline-structure-eyebrow">{t("outline.structureHealthTitle")}</p>
          <h2>{t("outline.healthWaitingTitle")}</h2>
          <p className="outline-structure-description">{t("outline.structureHealthDescription")}</p>
          <div className={isReady ? "outline-health-notice" : "outline-health-notice is-error"} role="status">
            {!isReady && <ExclamationTriangleIcon aria-hidden="true" />}
            <p>{isReady ? t("outline.notCreatedTitle") : t("outline.readySnapshotRequired")}</p>
          </div>
        </aside>
      </div>
    );
  }

  const editingDisabled = !profile || !isReady || !isLatest || isBusy;
  const canApprove = Boolean(profile && isLatest && isReady && !dirty && view.approvable && view.approval.status === "PENDING" && !isBusy);
  const canReject = Boolean(profile && isLatest && isReady && !dirty && decisionNote.trim() && view.approval.status === "PENDING" && !isBusy);
  const coverageRows = questionIds.map((rqId) => {
    const coverage = draft.coverage.find((item) => item.rqId === rqId);
    const subsections = draft.sections.flatMap((section) => {
      if (!section.include || !ANSWERING_SECTION_KEYS.has(section.key)) return [];
      const profileSection = profile?.sections.find((item) => item.key === section.key);
      const sectionTitle = t(`journalProfiles.sectionTitles.${section.key}`, {
        defaultValue: profileSection?.title ?? section.key,
      });
      return section.subsections
        .filter((subsection) => coverage?.subsectionIds.includes(subsection.id) || subsection.rqIds.includes(rqId))
        .map((subsection) => ({ id: subsection.id, sectionTitle, title: subsection.title }));
    });
    const notApplicableReason = coverage?.notApplicableReason?.trim() ?? "";
    return { rqId, subsections, notApplicableReason, covered: subsections.length > 0 || Boolean(notApplicableReason) };
  });
  const coveredQuestionCount = coverageRows.filter((row) => row.covered).length;
  const blockingIssueCount = view.issues.filter((issue) => issue.severity === "blocking").length;
  const warningIssueCount = view.issues.length - blockingIssueCount;
  return (
    <div className="outline-workspace-content">
      <GsapReveal>
        <Card className="outline-revision-context">
          <CardContent className="outline-revision-context-content">
            <div className="outline-context-identity">
              <span className="outline-context-project">
                <span className="outline-revision-label">{t("outline.projectLabel")}</span>
                <strong>{projectName}</strong>
              </span>
              <span className="outline-context-snapshot">
                <span className="outline-revision-label">{t("outline.snapshotLabel")}</span>
                <Link to={`/snapshots?projectId=${encodeURIComponent(projectId)}&snapshotId=${encodeURIComponent(snapshot.id)}`}>
                  {snapshot.sourceRunId}
                </Link>
              </span>
              <Badge variant={snapshot.status === "READY" ? "success" : "secondary"}>{snapshot.status}</Badge>
            </div>
            <div className="outline-revision-profile">
              <strong>{t("outline.profileInUse", {
                name: profile?.name ?? view.revision.content.profile.id,
                version: view.revision.content.profile.version,
              })}</strong>
              <Badge variant="secondary">{t("outline.versionOption", { version: view.revision.version })}</Badge>
              <Badge
                variant={view.approval.status === "APPROVED" ? "default" : "outline"}
                className={view.approval.status === "REJECTED" ? "border-destructive/40 text-destructive" : undefined}
              >
                {t(`outline.approvalStatus.${view.approval.status}`)}
              </Badge>
              {profile?.verification.status === "unverified" && profile.notice && (
                <details className="outline-profile-notice">
                  <summary>
                    <Badge variant="warning">{t("journalProfiles.status.unverified")}</Badge>
                    <span>{t("journalProfiles.verificationDetails")}</span>
                  </summary>
                  <p>{profile.notice}</p>
                </details>
              )}
            </div>
            <div className="outline-revision-controls">
              <div className="outline-version-control">
                <label htmlFor="outline-version">{t("outline.versionLabel")}</label>
                <select
                  id="outline-version"
                  value={selectedVersion}
                  onChange={(event) => void handleVersionChange(event.target.value)}
                  disabled={isBusy || view.versions.length < 2}
                  className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 md:min-h-10"
                >
                  {view.versions.map((version) => (
                    <option key={version.id} value={version.version}>
                      {t("outline.versionOption", { version: version.version })} · {t(`outline.origin.${version.origin}`)}
                    </option>
                  ))}
                </select>
              </div>
              {!isLatest && (
                <Button type="button" size="sm" variant="outline" disabled={isBusy} onClick={() => void loadLatest()}>
                  <ArrowUturnLeftIcon aria-hidden="true" />
                  {t("outline.loadLatest")}
                </Button>
              )}
              <Button type="button" size="sm" variant="outline" disabled={isBusy} onClick={() => void loadLatest()}>
                <ArrowPathIcon aria-hidden="true" />
                <span className="sr-only">{t("workflow.refresh")}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </GsapReveal>

      {error && <p role="alert" className="rounded-lg border border-destructive/30 px-4 py-3 text-sm text-destructive">{error}</p>}
      {message && <p role="status" className="rounded-lg border border-border bg-secondary/60 px-4 py-3 text-sm text-foreground">{message}</p>}
      {dirty && isLatest && (
        <p role="status" className="text-sm font-medium text-primary">{t("outline.unsavedChanges")}</p>
      )}
      {!isLatest && (
        <p role="status" className="rounded-lg bg-secondary/60 px-4 py-3 text-sm text-muted-foreground">{t("outline.readOnlyHistory")}</p>
      )}
      {!isReady && (
        <p role="status" className="rounded-lg border border-warning-border bg-warning-soft px-4 py-3 text-sm text-warning">{t("outline.readySnapshotRequired")}</p>
      )}
      {!profile && (
        <p role="status" className="rounded-lg border border-warning-border bg-warning-soft px-4 py-3 text-sm text-warning">{t("outline.profileUnavailable")}</p>
      )}
      {profile && profile.version !== draft.profile.version && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning-border bg-warning-soft px-4 py-3 text-sm text-warning">
          <p>{t("outline.profileVersionOutdated", { blueprintVersion: draft.profile.version, currentVersion: profile.version })}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isBusy || !isLatest || !isReady}
            onClick={() => setDraft((current) => current ? { ...current, profile: { ...current.profile, version: profile.version } } : current)}
          >
            {t("outline.useCurrentProfile")}
          </Button>
        </div>
      )}

      <div className="outline-review-layout">
        <OutlineSectionsEditor
          content={draft}
          profile={profile}
          claimOptions={claimOptions}
          disabled={editingDisabled}
          locale={locale}
          onChange={setDraft}
        />

        <aside className="outline-review-rail">
          <Card className="outline-coverage-summary">
            <CardHeader className="outline-coverage-summary-header">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>{t("outline.coverageTitle")}</CardTitle>
                <Badge variant={coveredQuestionCount === questionIds.length && questionIds.length > 0 ? "default" : "outline"}>
                  {questionIds.length > 0
                    ? t("outline.coverageCount", { covered: coveredQuestionCount, total: questionIds.length })
                    : t("outline.noQuestions")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="outline-coverage-summary-content">
              {coverageRows.length === 0 ? (
                <p className="outline-coverage-empty">{t("outline.noQuestions")}</p>
              ) : (
                <ol className="outline-coverage-list">
                  {coverageRows.map((row) => (
                    <li className="outline-coverage-row" key={row.rqId}>
                      <span className="outline-coverage-rq">{row.rqId}</span>
                      <div className="outline-coverage-targets">
                        {row.subsections.length > 0 ? row.subsections.map((subsection) => (
                          <span className="outline-coverage-target" key={subsection.id}>
                            <span>{subsection.sectionTitle}</span>
                            <strong>{subsection.title || t("outline.untitledSubsection")}</strong>
                          </span>
                        )) : row.notApplicableReason ? (
                          <span className="outline-coverage-unassigned">
                            {t("outline.notApplicableReason")}: {row.notApplicableReason}
                          </span>
                        ) : (
                          <span className="outline-coverage-unassigned">{t("outline.coverageNeedsMapping")}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              <details className="outline-disclosure">
                <summary>{t("outline.editCoverage")}</summary>
                <div className="outline-disclosure-content">
                  <OutlineCoverageEditor
                    content={draft}
                    questionIds={questionIds}
                    profile={profile}
                    disabled={editingDisabled}
                    onChange={setDraft}
                  />
                </div>
              </details>
              <details className="outline-disclosure">
                <summary>
                  <span>{t("outline.issuesTitle")}</span>
                  <Badge variant={view.approvable ? "default" : "outline"}>
                    {t("outline.issuesDescription", { blocking: blockingIssueCount, warning: warningIssueCount })}
                  </Badge>
                </summary>
                <div className="outline-disclosure-content">
                  <OutlineIssuesPanel issues={view.issues} approvable={view.approvable} />
                </div>
              </details>
            </CardContent>
          </Card>

          <Card className="outline-owner-review">
            <CardHeader className="outline-owner-review-header">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>{t("outline.ownerReviewTitle")}</CardTitle>
                <Badge
                  variant={view.approval.status === "APPROVED" ? "default" : "outline"}
                  className={view.approval.status === "REJECTED" ? "border-destructive/40 text-destructive" : undefined}
                >
                  {t(`outline.approvalStatus.${view.approval.status}`)}
                </Badge>
              </div>
              <CardDescription>
                {t(view.approval.status === "APPROVED"
                  ? "outline.approvalRecorded"
                  : view.approval.status === "REJECTED"
                    ? "outline.changesRequested"
                    : "outline.ownerReviewDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="outline-owner-review-content">
              <p className="outline-owner-only">{t("outline.ownerOnly")}</p>
              {view.approval.decision && (
                <div className="outline-provenance-record" role="status">
                  <CheckBadgeIcon aria-hidden="true" />
                  <div>
                    <strong>{t(view.approval.decision.decision === "APPROVED" ? "outline.approvalRecorded" : "outline.changesRequested")}</strong>
                    <p>{t("outline.decidedBy", { user: view.approval.decision.decidedBy })}</p>
                    <p>{t("outline.decidedAt", { date: new Date(view.approval.decision.decidedAt).toLocaleString(locale) })}</p>
                    <p>{t("outline.recordedRole", { role: view.approval.decision.slrRole })}</p>
                    {view.approval.decision.note && <p className="outline-provenance-note">{view.approval.decision.note}</p>}
                    <span>{t("outline.provenanceEventRecorded")}</span>
                  </div>
                </div>
              )}
              {view.approval.status === "PENDING" && (
                <details className="outline-decision-details">
                  <summary>
                    <span>{t("outline.addDecisionNote")}</span>
                    <span className="outline-decision-summary-hint">{t("outline.decisionNoteHint")}</span>
                  </summary>
                  <div className="outline-decision-field">
                    <label htmlFor="outline-decision-note">{t("outline.decisionNote")}</label>
                    <textarea
                      id="outline-decision-note"
                      rows={2}
                      maxLength={2000}
                      value={decisionNote}
                      onChange={(event) => setDecisionNote(event.target.value)}
                      disabled={!isLatest || isBusy || !isReady}
                      placeholder={t("outline.decisionNotePlaceholder")}
                      className="w-full resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                    />
                    {dirty && <p className="text-xs text-muted-foreground">{t("outline.saveBeforeDecision")}</p>}
                  </div>
                </details>
              )}
              <div className="outline-owner-actions">
                {dirty && (
                  <Button type="button" size="sm" disabled={!isLatest || !isReady || isBusy} onClick={() => void handleSave()}>
                  {t(saving ? "outline.saving" : "outline.saveRevision")}
                  </Button>
                )}
                <Button type="button" size="sm" disabled={!canApprove} onClick={() => void handleDecision("APPROVED")}>
                  <CheckBadgeIcon aria-hidden="true" />
                  {t(deciding ? "outline.deciding" : "outline.approveH1")}
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={!canReject} onClick={() => void handleDecision("REJECTED")}>
                  {t("outline.requestChanges")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
