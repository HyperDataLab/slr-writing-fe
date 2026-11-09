import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useStableT } from "@/shared/i18n/use-stable-t";
import {
  ArrowDownIcon,
  ArrowPathIcon,
  ArrowUpIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PencilSquareIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import {
  createParagraphPlans,
  getParagraphPlans,
  updateParagraphPlans,
} from "@/features/paragraph-plans/api/paragraph-plans.api";
import { ParagraphPlanCard } from "@/features/paragraph-plans/components/ParagraphPlanCard";
import type {
  ClaimStrength,
  ParagraphPlanItem,
  ParagraphPlanStatus,
  ParagraphPlanView,
  RhetoricalMove,
  SentenceSlot,
} from "@/features/paragraph-plans/model/paragraph-plan.types";
import type { SnapshotSummary } from "@/features/snapshots/model/snapshot.types";
import { ApiError } from "@/shared/lib/api-client";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";

const RHETORICAL_MOVES: RhetoricalMove[] = [
  "theme_overview",
  "report_evidence",
  "compare_and_synthesize",
  "discuss_limitation",
  "conclude_subtopic",
];

const CLAIM_STRENGTHS: ClaimStrength[] = ["neutral", "qualified", "strong"];
const PLAN_STATUSES: ParagraphPlanStatus[] = ["DRAFT", "NEEDS_EVIDENCE", "READY_TO_DRAFT"];
const SENTENCE_SLOTS: SentenceSlot[] = ["topic", "evidence", "synthesis", "qualification", "limitation"];

function linesToIds(value: string) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function PlanTextList({
  id,
  label,
  values,
  hint,
  onChange,
}: {
  id: string;
  label: string;
  values: string[];
  hint: string;
  onChange: (next: string[]) => void;
}) {
  const hintId = `${id}-hint`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="w-fit cursor-pointer text-sm font-medium text-foreground">{label}</label>
      <textarea
        id={id}
        value={values.join("\n")}
        onChange={(event) => onChange(linesToIds(event.target.value))}
        aria-describedby={hintId}
        rows={3}
        className="min-h-24 w-full resize-y rounded-xl border border-input bg-card px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground md:text-sm"
      />
      <p id={hintId} className="text-xs leading-5 text-muted-foreground">{hint}</p>
    </div>
  );
}

function PlanEditor({
  item,
  saving,
  onChange,
  onSave,
  onCancel,
}: {
  item: ParagraphPlanItem;
  saving: boolean;
  onChange: (next: ParagraphPlanItem) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const id = useId();
  const selectClass = "flex min-h-11 w-full rounded-xl border border-input bg-card px-4 py-2 text-base text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground md:min-h-10 md:text-sm";

  return (
    <Card className="border border-border shadow-none">
      <CardContent className="grid gap-4 p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor={`${id}-move`} className="w-fit cursor-pointer text-sm font-medium text-foreground">{t("plans.edit.move")}</label>
            <select
              id={`${id}-move`}
              className={selectClass}
              value={item.rhetoricalMove}
              disabled={saving}
              onChange={(event) => onChange({ ...item, rhetoricalMove: event.target.value as RhetoricalMove })}
            >
              {RHETORICAL_MOVES.map((move) => <option key={move} value={move}>{t(`plans.move.${move}`)}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`${id}-strength`} className="w-fit cursor-pointer text-sm font-medium text-foreground">{t("plans.edit.strength")}</label>
            <select
              id={`${id}-strength`}
              className={selectClass}
              value={item.claimStrength}
              disabled={saving}
              onChange={(event) => onChange({ ...item, claimStrength: event.target.value as ClaimStrength })}
            >
              {CLAIM_STRENGTHS.map((strength) => <option key={strength} value={strength}>{t(`plans.strength.${strength}`)}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`${id}-status`} className="w-fit cursor-pointer text-sm font-medium text-foreground">{t("plans.edit.status")}</label>
            <select
              id={`${id}-status`}
              className={selectClass}
              value={item.status}
              disabled={saving}
              onChange={(event) => onChange({ ...item, status: event.target.value as ParagraphPlanStatus })}
            >
              {PLAN_STATUSES.map((status) => <option key={status} value={status}>{t(`plans.status.${status}`)}</option>)}
            </select>
          </div>
          <label className="flex min-h-11 items-center gap-3 rounded-xl bg-muted/40 px-3 text-sm text-foreground">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={item.conditionsRequired}
              disabled={saving}
              onChange={(event) => onChange({ ...item, conditionsRequired: event.target.checked })}
            />
            {t("plans.edit.conditionsRequired")}
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <PlanTextList
            id={`${id}-questions`}
            label={t("plans.edit.researchQuestions")}
            values={item.rqIds}
            hint={t("plans.edit.idsHint")}
            onChange={(rqIds) => onChange({ ...item, rqIds })}
          />
          <PlanTextList
            id={`${id}-claims`}
            label={t("plans.edit.claims")}
            values={item.claimIds}
            hint={t("plans.edit.idsHint")}
            onChange={(claimIds) => onChange({ ...item, claimIds })}
          />
          <PlanTextList
            id={`${id}-findings`}
            label={t("plans.edit.findings")}
            values={item.findingIds}
            hint={t("plans.edit.idsHint")}
            onChange={(findingIds) => onChange({ ...item, findingIds })}
          />
          <PlanTextList
            id={`${id}-evidence`}
            label={t("plans.edit.evidence")}
            values={item.evidenceIds}
            hint={t("plans.edit.idsHint")}
            onChange={(evidenceIds) => onChange({ ...item, evidenceIds })}
          />
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-foreground">{t("plans.edit.sentenceSlots")}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {SENTENCE_SLOTS.map((slot) => {
              const checked = item.sentenceSlots.includes(slot);
              return (
                <label key={slot} className="flex min-h-11 items-center gap-3 rounded-xl bg-muted/40 px-3 text-sm text-foreground">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={checked}
                    disabled={saving || (checked && item.sentenceSlots.length === 1)}
                    onChange={(event) => {
                      const sentenceSlots = event.target.checked
                        ? [...item.sentenceSlots, slot]
                        : item.sentenceSlots.filter((current) => current !== slot);
                      onChange({ ...item, sentenceSlots });
                    }}
                  />
                  {t(`plans.slot.${slot}`)}
                </label>
              );
            })}
          </div>
        </fieldset>

        <PlanTextList
          id={`${id}-limitations`}
          label={t("plans.edit.limitations")}
          values={item.limitations}
          hint={t("plans.edit.limitationsHint")}
          onChange={(limitations) => onChange({ ...item, limitations })}
        />

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
            {t("plans.edit.cancel")}
          </Button>
          <Button type="button" size="sm" onClick={onSave} disabled={saving} isLoading={saving}>
            {saving ? t("plans.edit.saving") : t("plans.edit.save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ParagraphPlansWorkspace({
  projectId,
  snapshot,
  sectionKey,
  canDraft,
  hasDraft,
  draftLoading,
  drafting,
  onReadinessChange,
  onStartDraft,
}: {
  projectId: string;
  snapshot: SnapshotSummary;
  sectionKey: string;
  canDraft: boolean;
  hasDraft: boolean;
  draftLoading: boolean;
  drafting: boolean;
  onReadinessChange: (sectionKey: string, readyCount: number) => void;
  onStartDraft: () => void;
}) {
  const { t } = useTranslation();
  const stableT = useStableT();
  const [view, setView] = useState<ParagraphPlanView | null>(null);
  const [plans, setPlans] = useState<ParagraphPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<ParagraphPlanItem | null>(null);
  const requestSeq = useRef(0);

  const loadPlans = useCallback(async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    try {
      const data = await getParagraphPlans(projectId, snapshot.id);
      if (seq !== requestSeq.current) return;
      setView(data);
      setPlans(data.revision.content.plans);
    } catch (err: unknown) {
      if (seq !== requestSeq.current) return;
      setView(null);
      setPlans([]);
      if (!(err instanceof ApiError && err.status === 404)) {
        setError(err instanceof Error ? err.message : stableT("plans.loadError"));
      }
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [projectId, snapshot.id, stableT]);

  useEffect(() => {
    setView(null);
    setPlans([]);
    void loadPlans();
    return () => { requestSeq.current += 1; };
  }, [loadPlans]);

  useEffect(() => {
    setEditingPlan(null);
  }, [sectionKey]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setNotice(null);
    try {
      await createParagraphPlans(projectId, snapshot.id);
      await loadPlans();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : stableT("plans.generateError"));
    } finally {
      setGenerating(false);
    }
  };

  const persistPlans = async (nextPlans: ParagraphPlanItem[]) => {
    if (!view) return false;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const result = await updateParagraphPlans(projectId, snapshot.id, {
        baseVersion: view.revision.version,
        content: { ...view.revision.content, plans: nextPlans },
      });
      setPlans(result.revision.content.plans);
      try {
        const updatedView = await getParagraphPlans(projectId, snapshot.id);
        setView(updatedView);
        setPlans(updatedView.revision.content.plans);
      } catch {
        setView((current) => current ? {
          ...current,
          revision: result.revision,
          stats: {
            totalParagraphs: result.revision.totalParagraphs,
            readyParagraphs: result.revision.readyParagraphs,
          },
        } : current);
      }
      setNotice(stableT("plans.saved", { version: result.revision.version }));
      return true;
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        setEditingPlan(null);
        await loadPlans();
        setError(stableT("plans.conflictError"));
      } else {
        setError(err instanceof Error ? err.message : stableT("plans.saveError"));
      }
      return false;
    } finally {
      setSaving(false);
    }
  };

  const hasUnsavedChanges = Boolean(view && JSON.stringify(plans) !== JSON.stringify(view.revision.content.plans));
  const sectionPlans = plans.filter((plan) => plan.sectionKey === sectionKey);
  const readyCount = sectionPlans.filter((plan) => plan.status === "READY_TO_DRAFT").length;
  const sectionPlanIds = new Set(sectionPlans.map((plan) => plan.id));
  const sectionIssues = view?.issues.filter((issue) => !issue.ref || sectionPlanIds.has(issue.ref)) ?? [];
  const sectionLabel = t(`plans.sectionName.${sectionKey}`, { defaultValue: sectionKey });

  useEffect(() => {
    onReadinessChange(sectionKey, loading || saving || editingPlan || hasUnsavedChanges ? 0 : readyCount);
  }, [editingPlan, hasUnsavedChanges, loading, onReadinessChange, readyCount, saving, sectionKey]);

  const handleEditChange = (next: ParagraphPlanItem) => setEditingPlan(next);

  const handleSaveEdit = async () => {
    if (!editingPlan) return;
    const nextPlans = plans.map((plan) => plan.id === editingPlan.id ? editingPlan : plan);
    if (await persistPlans(nextPlans)) setEditingPlan(null);
  };

  const handleMove = async (index: number, offset: -1 | 1) => {
    if (saving || editingPlan) return;
    const nextIndex = index + offset;
    if (nextIndex < 0 || nextIndex >= sectionPlans.length) return;

    const reorderedSection = [...sectionPlans];
    [reorderedSection[index], reorderedSection[nextIndex]] = [reorderedSection[nextIndex], reorderedSection[index]];
    let sectionIndex = 0;
    const nextPlans = plans.map((plan) => plan.sectionKey === sectionKey ? reorderedSection[sectionIndex++] : plan);
    setPlans(nextPlans);
    await persistPlans(nextPlans);
  };

  const handleStartDraft = () => {
    if (draftLoading || drafting || (!hasDraft && (!canDraft || readyCount === 0))) return;
    onStartDraft();
  };

  const canStartDraft = hasDraft || (canDraft && readyCount > 0);
  const draftActionDisabled = draftLoading || drafting || !canStartDraft;

  return (
    <section className="draft-plan-workspace" aria-labelledby="draft-plan-heading">
      <header className="draft-plan-header">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id="draft-plan-heading" className="text-base font-semibold text-foreground">{t("plans.sectionHeading")}</h3>
            {view && <Badge variant="outline" className="font-mono text-xs">v{view.revision.version}</Badge>}
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("plans.sectionDescription", { section: sectionLabel })}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void loadPlans()} disabled={loading || generating || saving}>
            <ArrowPathIcon className={loading ? "animate-spin" : ""} aria-hidden="true" />
            {t("workflow.refresh")}
          </Button>
          {hasUnsavedChanges && !editingPlan && (
            <Button type="button" size="sm" onClick={() => void persistPlans(plans)} disabled={saving} isLoading={saving}>
              {saving ? t("plans.edit.saving") : t("plans.edit.save")}
            </Button>
          )}
        </div>
      </header>

      <div className="draft-plan-api-note" role="note">
        <InformationCircleIcon aria-hidden="true" />
        <p>{t("plans.apiLimitations")}</p>
      </div>

      {hasUnsavedChanges && (
        <p className="draft-plan-unsaved" role="status">{t("plans.edit.unsaved")}</p>
      )}
      {error && <div className="draft-plan-error" role="alert">{error}</div>}
      {notice && <p className="draft-plan-notice" role="status">{notice}</p>}

      {loading ? (
        <div className="draft-plan-state" role="status" aria-live="polite">{t("plans.loading")}</div>
      ) : !view && !error ? (
        <Card className="border border-border shadow-none">
          <CardContent className="grid justify-items-center gap-3 p-6 text-center sm:p-8">
            <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
              <SparklesIcon className="size-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">{t("plans.noPlansTitle")}</h4>
              <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-muted-foreground">{t("plans.noPlansDescription")}</p>
              <p className="mx-auto mt-1 max-w-lg text-xs leading-5 text-muted-foreground">{t("plans.blueprintRequired")}</p>
            </div>
            <Button type="button" onClick={() => void handleGenerate()} disabled={generating} isLoading={generating}>
              <SparklesIcon aria-hidden="true" />
              {generating ? t("plans.planning") : t("plans.generateFromBlueprint")}
            </Button>
          </CardContent>
        </Card>
      ) : !view ? (
        null
      ) : sectionPlans.length === 0 ? (
        <Card className="border border-border shadow-none">
          <CardContent className="p-5">
            <h4 className="text-sm font-semibold text-foreground">{t("plans.noPlansForSection")}</h4>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("plans.noPlansForSectionDescription")}</p>
            {!canDraft ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("draft.methodsOnOwnPage")}</p>
            ) : !hasDraft && (
              <p className="mt-3 text-sm text-warning">{t("plans.noReadyPlans")}</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sectionIssues.length > 0 && (
            <div className="draft-plan-issues" role="status">
              <div className="flex items-center gap-2 font-medium">
                <ExclamationTriangleIcon aria-hidden="true" />
                {t("plans.issues", { count: sectionIssues.length })}
              </div>
              <ul>
                {sectionIssues.map((issue, index) => (
                  <li key={`${issue.code}-${issue.ref ?? index}`}>
                    <Badge variant={issue.severity === "blocking" ? "destructive" : "warning"} className="text-[10px]">
                      {t(`plans.severity.${issue.severity}`)}
                    </Badge>
                    <span>{issue.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div role="list" className="draft-plan-list" aria-label={t("plans.sectionListLabel", { count: sectionPlans.length, ready: readyCount })}>
            {sectionPlans.map((item, index) => (
              <div role="listitem" key={item.id} className="draft-plan-list-item">
                {editingPlan?.id === item.id ? (
                  <PlanEditor
                    item={editingPlan}
                    saving={saving}
                    onChange={handleEditChange}
                    onSave={() => void handleSaveEdit()}
                    onCancel={() => setEditingPlan(null)}
                  />
                ) : (
                  <ParagraphPlanCard
                    item={item}
                    index={index}
                    actions={(
                      <div className="flex items-center gap-1" role="group" aria-label={t("plans.edit.actionsFor", { n: index + 1 })}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-11 p-0 md:size-9"
                          aria-label={t("plans.edit.moveUp", { n: index + 1 })}
                          title={t("plans.edit.moveUp", { n: index + 1 })}
                          onClick={() => void handleMove(index, -1)}
                          disabled={index === 0 || saving || Boolean(editingPlan)}
                        >
                          <ArrowUpIcon aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-11 p-0 md:size-9"
                          aria-label={t("plans.edit.moveDown", { n: index + 1 })}
                          title={t("plans.edit.moveDown", { n: index + 1 })}
                          onClick={() => void handleMove(index, 1)}
                          disabled={index === sectionPlans.length - 1 || saving || Boolean(editingPlan)}
                        >
                          <ArrowDownIcon aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => setEditingPlan({ ...item })}
                          disabled={saving || Boolean(editingPlan)}
                        >
                          <PencilSquareIcon aria-hidden="true" />
                          {t("plans.edit.edit")}
                        </Button>
                      </div>
                    )}
                  />
                )}
              </div>
            ))}
          </div>

          {!canDraft && !hasDraft ? (
            <p className="draft-plan-methods-note" role="note">{t("draft.methodsOnOwnPage")}</p>
          ) : !hasDraft && readyCount === 0 ? (
            <p className="draft-plan-not-ready" role="status">{t("plans.noReadyPlans")}</p>
          ) : null}

          <div className="draft-plan-footer">
            <div className="draft-plan-ready-count">
              <span>{t("plans.readyCount", { ready: readyCount, total: sectionPlans.length })}</span>
            </div>
            <Button
              type="button"
              onClick={handleStartDraft}
              disabled={draftActionDisabled || saving || Boolean(editingPlan) || hasUnsavedChanges}
              isLoading={drafting}
            >
              {hasDraft ? t("plans.openDraft") : drafting ? t("draft.drafting") : t("plans.draftFromPlan")}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
