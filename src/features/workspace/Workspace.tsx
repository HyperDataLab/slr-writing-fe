import { useCallback, useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Menubar from "@radix-ui/react-menubar";
import { motion } from "motion/react";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  BeakerIcon,
  BookOpenIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  CircleStackIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  FolderIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  RectangleStackIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { ApiSession } from "@/shared/api/client";
import { ApiError, errorMessage } from "@/shared/api/client";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  workspaceApi,
  type BlueprintView,
  type DraftView,
  type JournalProfile,
  type JsonRecord,
  type ParagraphPlansView,
  type ReadinessIssue,
  type SlrProject,
  type SlrRun,
  type SnapshotDetails,
  type SnapshotSummary,
  type WritingProject,
} from "@/features/workspace/workspace.api";

type WorkspaceView = "projects" | "snapshot" | "methods" | "profile" | "outline" | "plans" | "draft" | "verification" | "final" | "export";
type Notice = { kind: "success" | "error"; message: string };

const viewTitles: Record<WorkspaceView, string> = {
  projects: "Projects",
  snapshot: "Snapshot & readiness",
  methods: "Methods / PRISMA",
  profile: "Journal profile",
  outline: "Outline / H1",
  plans: "Paragraph plan",
  draft: "Manuscript / H2",
  verification: "Verification",
  final: "Final approval",
  export: "Export package",
};

const icons: Record<WorkspaceView, typeof FolderIcon> = {
  projects: FolderIcon,
  snapshot: RectangleStackIcon,
  methods: BeakerIcon,
  profile: BookOpenIcon,
  outline: Squares2X2Icon,
  plans: DocumentTextIcon,
  draft: DocumentTextIcon,
  verification: ShieldCheckIcon,
  final: CheckCircleIcon,
  export: ArrowDownTrayIcon,
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readable(value: unknown, fallback = "—"): string {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function dateLabel(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function StatusBadge({ children, tone = "neutral" }: { children: string; tone?: "neutral" | "good" | "warning" | "bad" }) {
  const styles = {
    neutral: "bg-neutral-100 text-neutral-600",
    good: "bg-emerald-50 text-emerald-800",
    warning: "bg-amber-50 text-amber-800",
    bad: "bg-red-50 text-red-700",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${styles[tone]}`}>{children}</span>;
}

function SectionHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-200 pb-5">
      <div>
        {eyebrow && <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">{eyebrow}</p>}
        <h1 className="mt-1 font-serif text-3xl tracking-tight text-neutral-900">{title}</h1>
        {description && <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function Pane({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-neutral-200 bg-white ${className}`}>
      {title && <h2 className="border-b border-neutral-100 px-4 py-3 text-sm font-semibold text-neutral-800">{title}</h2>}
      <div className="p-4">{children}</div>
    </section>
  );
}

interface ReadinessIssueGroup {
  key: string;
  code: string;
  severity: ReadinessIssue["severity"];
  count: number;
  issues: ReadinessIssue[];
}

function groupReadinessIssues(issues: ReadinessIssue[]): ReadinessIssueGroup[] {
  const groups = new Map<string, ReadinessIssueGroup>();
  for (const issue of issues) {
    const key = `${issue.severity}:${issue.code}`;
    const group = groups.get(key);
    if (group) {
      group.count += 1;
      group.issues.push(issue);
    } else {
      groups.set(key, { key, code: issue.code, severity: issue.severity, count: 1, issues: [issue] });
    }
  }
  return [...groups.values()].sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "blocking" ? -1 : 1;
    return a.code.localeCompare(b.code);
  });
}

function ReadinessGroupList({ groups, selectedKey, onSelect }: { groups: ReadinessIssueGroup[]; selectedKey: string; onSelect: (key: string) => void }) {
  if (groups.length === 0) return <p className="text-sm text-neutral-500">No readiness warnings reported by the API.</p>;
  return (
    <div className="min-w-0">
      <ul className="space-y-2">
        {groups.map((group) => (
          <li key={group.key} className="min-w-0">
            <button type="button" aria-pressed={selectedKey === group.key} onClick={() => onSelect(group.key)} className={selectedKey === group.key ? "flex w-full min-w-0 items-start gap-3 rounded-md border border-neutral-500 bg-neutral-50 p-3 text-left outline-none ring-1 ring-neutral-500" : "flex w-full min-w-0 items-start gap-3 rounded-md border border-neutral-200 bg-white p-3 text-left outline-none hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-1"}>
              <ExclamationTriangleIcon className={group.severity === "blocking" ? "mt-0.5 size-4 shrink-0 text-red-600" : "mt-0.5 size-4 shrink-0 text-amber-600"} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="break-all text-sm font-medium text-neutral-800">{group.code}</span>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-500">{group.severity}</span>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">{group.count}</span>
                </span>
                <span className="mt-1 block break-words text-xs leading-5 text-neutral-500">{group.issues[0]?.message}</span>
              </span>
              {selectedKey === group.key ? <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-neutral-700" aria-hidden="true" /> : <ChevronRightIcon className="mt-0.5 size-4 shrink-0 text-neutral-400" aria-hidden="true" />}
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-neutral-400">Select a finding to open its details.</p>
    </div>
  );
}

function ReadinessGroupDetails({ group }: { group: ReadinessIssueGroup | null }) {
  if (!group) return <p className="text-xs leading-5 text-neutral-500">Select a readiness finding to inspect its details.</p>;
  const details = new Map<string, { message: string; refs: Set<string>; count: number }>();
  for (const issue of group.issues) {
    const key = issue.message;
    const detail = details.get(key) ?? { message: issue.message, refs: new Set<string>(), count: 0 };
    detail.count += 1;
    if (issue.ref) detail.refs.add(issue.ref);
    details.set(key, detail);
  }
  return (
    <div className="space-y-3">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="break-all text-sm font-semibold text-neutral-800">{group.code}</span>
        <StatusBadge tone={group.severity === "blocking" ? "bad" : "warning"}>{`${group.count} ${group.count === 1 ? "item" : "items"}`}</StatusBadge>
      </div>
      {[...details.values()].map((detail, index) => (
        <div key={`${detail.message}-${index}`} className="min-w-0 rounded-md bg-neutral-50 p-3">
          <p className="break-words text-xs leading-5 text-neutral-600">{detail.message}</p>
          {detail.count > 1 && <p className="mt-1 text-[10px] text-neutral-400">Repeated {detail.count} times</p>}
          {detail.refs.size > 0 && <ul className="mt-2 space-y-1 border-t border-neutral-200 pt-2">{[...detail.refs].map((ref) => <li key={ref} className="break-all font-mono text-[10px] leading-4 text-neutral-500">{ref}</li>)}</ul>}
        </div>
      ))}
    </div>
  );
}

function IssuesList({ issues }: { issues: ReadinessIssue[] }) {
  if (issues.length === 0) return <p className="text-sm text-neutral-500">Không có cảnh báo từ API.</p>;
  return (
    <ul className="space-y-2">
      {issues.map((issue, index) => (
        <li key={`${issue.code}-${index}`} className="flex gap-2 text-sm leading-5">
          {issue.severity === "blocking"
            ? <ExclamationTriangleIcon className="mt-0.5 size-4 shrink-0 text-red-600" aria-hidden="true" />
            : <ExclamationTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />}
          <span><span className="font-medium">{issue.code}</span><span className="text-neutral-500"> · {issue.message}</span></span>
        </li>
      ))}
    </ul>
  );
}

function JsonPreview({ value }: { value: unknown }) {
  return <pre className="max-h-[28rem] overflow-auto rounded-md bg-neutral-50 p-3 text-xs leading-5 text-neutral-700">{JSON.stringify(value, null, 2)}</pre>;
}

interface WorkspaceProps {
  session: ApiSession;
  onSignOut: () => void;
}

export function Workspace({ session, onSignOut }: WorkspaceProps) {
  const [projects, setProjects] = useState<WritingProject[]>([]);
  const [slrProjects, setSlrProjects] = useState<SlrProject[]>([]);
  const [profiles, setProfiles] = useState<JournalProfile[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedSnapshotId, setSelectedSnapshotId] = useState("");
  const [selectedSlrProjectId, setSelectedSlrProjectId] = useState("");
  const [selectedRunId, setSelectedRunId] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState("generic-imrad");
  const [selectedSectionKey, setSelectedSectionKey] = useState("introduction");
  const [activeView, setActiveView] = useState<WorkspaceView>("projects");
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
  const [runs, setRuns] = useState<SlrRun[]>([]);
  const [resource, setResource] = useState<unknown>(null);
  const [outlineText, setOutlineText] = useState("");
  const [draftText, setDraftText] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [slrSearch, setSlrSearch] = useState("");
  const [slrSearchInput, setSlrSearchInput] = useState("");
  const [readinessIssues, setReadinessIssues] = useState<ReadinessIssue[]>([]);
  const [selectedReadinessGroupKey, setSelectedReadinessGroupKey] = useState("");
  const [readinessDialogGroupKey, setReadinessDialogGroupKey] = useState("");
  const [decisionNote, setDecisionNote] = useState("");
  const [rootLoading, setRootLoading] = useState(true);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [runsLoading, setRunsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rootError, setRootError] = useState("");
  const [runsError, setRunsError] = useState("");
  const [resourceError, setResourceError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const selectedProject = useMemo(() => projects.find((item) => item.id === selectedProjectId) ?? null, [projects, selectedProjectId]);
  const selectedSnapshot = useMemo(() => snapshots.find((item) => item.id === selectedSnapshotId) ?? null, [snapshots, selectedSnapshotId]);
  const currentExplorerSnapshot = selectedSnapshot ?? snapshots[0] ?? null;
  const selectedProfile = useMemo(() => profiles.find((profile) => profile.id === selectedProfileId) ?? profiles[0] ?? null, [profiles, selectedProfileId]);
  const resourceRecord = asRecord(resource);
  const revision = asRecord(resourceRecord.revision);
  const readinessSourceIssues = activeView === "snapshot" && resource != null
    ? asArray(resourceRecord.issues).map((entry) => {
      const issue = asRecord(entry);
      return {
        code: readable(issue.code, "READINESS"),
        severity: issue.severity === "blocking" ? "blocking" as const : "warning" as const,
        message: readable(issue.message),
        ...(typeof issue.ref === "string" && issue.ref ? { ref: issue.ref } : {}),
      };
    })
    : activeView === "snapshot" ? readinessIssues : [];
  const readinessGroups = useMemo(() => groupReadinessIssues(readinessSourceIssues), [activeView, resource, readinessIssues]);
  const selectedReadinessGroup = readinessGroups.find((group) => group.key === selectedReadinessGroupKey) ?? null;
  const readinessDialogGroup = readinessGroups.find((group) => group.key === readinessDialogGroupKey) ?? null;
  const readinessWarningCount = readinessGroups.filter((group) => group.severity === "warning").reduce((total, group) => total + group.count, 0);
  const readinessBlockingCount = readinessGroups.filter((group) => group.severity === "blocking").reduce((total, group) => total + group.count, 0);

  const loadWorkspaceLists = useCallback(async () => {
    setRootLoading(true);
    setRootError("");
    const [projectResult, slrResult, profileResult] = await Promise.allSettled([
      workspaceApi.listProjects(session),
      workspaceApi.listSlrProjects(session, slrSearch),
      workspaceApi.listProfiles(session),
    ]);
    if (projectResult.status === "fulfilled") {
      setProjects(projectResult.value);
      setSelectedProjectId((current) => current && projectResult.value.some((item) => item.id === current) ? current : projectResult.value[0]?.id ?? "");
      if (projectResult.value.length > 0) setActiveView((current) => current === "projects" ? "snapshot" : current);
      else setActiveView("projects");
    } else {
      setRootError(errorMessage(projectResult.reason));
    }
    if (slrResult.status === "fulfilled") {
      setSlrProjects(slrResult.value.items);
      setSelectedSlrProjectId((current) => slrResult.value.items.some((item) => item.id === current) ? current : slrResult.value.items[0]?.id ?? "");
    } else {
      setSlrProjects([]);
      setSelectedSlrProjectId("");
      setRootError((current) => current || errorMessage(slrResult.reason));
    }
    if (profileResult.status === "fulfilled") {
      setProfiles(profileResult.value);
      setSelectedProfileId((current) => profileResult.value.some((item) => item.id === current) ? current : profileResult.value[0]?.id ?? "");
    }
    setRootLoading(false);
  }, [session, slrSearch]);

  useEffect(() => {
    void loadWorkspaceLists();
  }, [loadWorkspaceLists]);

  useEffect(() => {
    let live = true;
    if (!selectedProject) {
      setSnapshots([]);
      setRuns([]);
      setSelectedSnapshotId("");
      setRunsError("");
      return () => { live = false; };
    }

    setSnapshotsLoading(true);
    setRunsLoading(true);
    setRunsError("");
    Promise.allSettled([
      workspaceApi.listSnapshots(session, selectedProject.id),
      workspaceApi.listRuns(session, selectedProject.slrProjectId),
    ]).then(([snapshotResult, runResult]) => {
      if (!live) return;
      if (snapshotResult.status === "fulfilled") {
        setSnapshots(snapshotResult.value);
        setSelectedSnapshotId((current) => snapshotResult.value.some((item) => item.id === current) ? current : snapshotResult.value[0]?.id ?? "");
      } else {
        setSnapshots([]);
        setSelectedSnapshotId("");
      }
      if (runResult.status === "fulfilled") {
        setRuns(runResult.value);
        setSelectedRunId((current) => runResult.value.some((item) => item.runId === current) ? current : runResult.value[0]?.runId ?? "");
      } else {
        setRuns([]);
        setSelectedRunId("");
        setRunsError(errorMessage(runResult.reason));
      }
      setSnapshotsLoading(false);
      setRunsLoading(false);
    });
    return () => { live = false; };
  }, [session, selectedProject?.id, selectedProject?.slrProjectId, reloadKey]);

  useEffect(() => {
    let live = true;
    setResource(null);
    setResourceError("");
    if (activeView === "profile") {
      if (!selectedProfile) {
        setResourceLoading(false);
        return () => { live = false; };
      }
    } else if (!selectedProject || !selectedSnapshot || activeView === "projects") {
      setResourceLoading(false);
      return () => { live = false; };
    }

    setResourceLoading(true);
    const project = selectedProject;
    const snapshot = selectedSnapshot;
    const load = async (): Promise<unknown> => {
      if (activeView === "profile") return selectedProfile ?? workspaceApi.getProfile(session, selectedProfileId);
      if (!project || !snapshot) return null;
      switch (activeView) {
        case "snapshot": return workspaceApi.getSnapshot(session, project.id, snapshot.id);
        case "methods": return workspaceApi.getMethods(session, project.id, snapshot.id);
        case "outline": return workspaceApi.getBlueprint(session, project.id, snapshot.id);
        case "plans": return workspaceApi.getPlans(session, project.id, snapshot.id);
        case "draft": return workspaceApi.getDraft(session, project.id, snapshot.id, selectedSectionKey);
        case "verification": return workspaceApi.getVerification(session, project.id, snapshot.id);
        case "final": return workspaceApi.getFinalStatus(session, project.id, snapshot.id);
        case "export": return workspaceApi.getExport(session, project.id, snapshot.id);
        default: return null;
      }
    };

    load().then((data) => {
      if (!live) return;
      setResource(data);
      const record = asRecord(data);
      const loadedRevision = asRecord(record.revision);
      if (activeView === "outline" && loadedRevision.content) setOutlineText(JSON.stringify(loadedRevision.content, null, 2));
      if (activeView === "draft") setDraftText(readable(loadedRevision.markdown, ""));
    }).catch((error: unknown) => {
      if (live) setResourceError(errorMessage(error));
    }).finally(() => {
      if (live) setResourceLoading(false);
    });
    return () => { live = false; };
  }, [session, selectedProject?.id, selectedSnapshot?.id, activeView, selectedSectionKey, selectedProfile, selectedProfileId, reloadKey]);

  const runAction = async (successMessage: string, action: () => Promise<unknown>, after?: () => void) => {
    setBusy(true);
    setNotice(null);
    setReadinessIssues([]);
    try {
      await action();
      after?.();
      setNotice({ kind: "success", message: successMessage });
      setReloadKey((value) => value + 1);
    } catch (error) {
      if (error instanceof ApiError && error.code === "SNAPSHOT_NOT_READY") {
        const report = asRecord(error.details);
        setReadinessIssues(asArray(report.issues).map((item) => {
          const issue = asRecord(item);
          return {
            code: readable(issue.code, "READINESS"),
            severity: issue.severity === "blocking" ? "blocking" : "warning",
            message: readable(issue.message),
          };
        }));
      }
      setNotice({ kind: "error", message: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const chooseProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedSnapshotId("");
    setActiveView("snapshot");
    setNotice(null);
  };

  const createProject = () => {
    if (!newProjectName.trim() || !selectedSlrProjectId) return;
    void runAction("Đã liên kết Writing project với SLR project.", async () => {
      const project = await workspaceApi.createProject(session, { name: newProjectName.trim(), slrProjectId: selectedSlrProjectId });
      setProjects((current) => [project, ...current]);
      setSelectedProjectId(project.id);
      setSelectedSnapshotId("");
      setNewProjectName("");
      setActiveView("snapshot");
    }, () => void loadWorkspaceLists());
  };

  const importRun = () => {
    if (!selectedProject || !selectedRunId) return;
    void runAction("Snapshot đã được nhập từ SLR run.", async () => {
      const result = await workspaceApi.importRun(session, selectedProject.id, selectedRunId);
      setSelectedSnapshotId(result.snapshot.id);
      setActiveView("snapshot");
      if (result.warnings.length) setNotice({ kind: "success", message: `Snapshot đã nhập với ${result.warnings.length} cảnh báo readiness.` });
    });
  };

  const refresh = () => void runAction("Đã tải lại dữ liệu từ Writing BE.", async () => {
    await loadWorkspaceLists();
  });

  const methodsGenerate = () => selectedProject && selectedSnapshot && void runAction(
    "Methods / PRISMA đã được tạo từ snapshot.",
    () => workspaceApi.generateMethods(session, selectedProject.id, selectedSnapshot.id),
  );

  const blueprintGenerate = () => selectedProject && selectedSnapshot && void runAction(
    "Outline đã được khởi tạo từ snapshot và journal profile.",
    () => workspaceApi.createBlueprint(session, selectedProject.id, selectedSnapshot.id, selectedProfileId),
  );

  const blueprintSave = () => {
    if (!selectedProject || !selectedSnapshot || !revision.version) return;
    let content: unknown;
    try { content = JSON.parse(outlineText); } catch { setNotice({ kind: "error", message: "Outline phải là JSON hợp lệ trước khi lưu." }); return; }
    void runAction("Đã lưu revision mới của outline.", () => workspaceApi.saveBlueprint(session, selectedProject.id, selectedSnapshot.id, Number(revision.version), content));
  };

  const blueprintDecision = (decision: "approve" | "reject") => selectedProject && selectedSnapshot && revision.version && void runAction(
    decision === "approve" ? "Đã gửi yêu cầu duyệt H1." : "Đã gửi yêu cầu từ chối H1.",
    () => workspaceApi.decideBlueprint(session, selectedProject.id, selectedSnapshot.id, decision, Number(revision.version)),
  );

  const plansGenerate = () => selectedProject && selectedSnapshot && void runAction(
    "Paragraph plan đã được tạo từ outline được duyệt.",
    () => workspaceApi.createPlans(session, selectedProject.id, selectedSnapshot.id),
  );

  const draftGenerate = () => selectedProject && selectedSnapshot && void runAction(
    "Bản nháp section đã được tạo từ evidence registry.",
    () => workspaceApi.generateDraft(session, selectedProject.id, selectedSnapshot.id, selectedSectionKey),
  );

  const draftSave = () => {
    if (!selectedProject || !selectedSnapshot || !revision.version) return;
    void runAction("Đã lưu revision bản thảo.", () => workspaceApi.saveDraft(session, selectedProject.id, selectedSnapshot.id, selectedSectionKey, Number(revision.version), draftText));
  };

  const draftDecision = (decision: "approve" | "reject") => selectedProject && selectedSnapshot && revision.version && void runAction(
    decision === "approve" ? "Đã gửi yêu cầu duyệt H2." : "Đã gửi yêu cầu từ chối H2.",
    () => workspaceApi.decideDraft(session, selectedProject.id, selectedSnapshot.id, selectedSectionKey, decision, Number(revision.version)),
  );

  const verificationRun = () => selectedProject && selectedSnapshot && void runAction(
    "Đã chạy các verification gates.",
    () => workspaceApi.runVerification(session, selectedProject.id, selectedSnapshot.id),
  );

  const finalDecision = (decision: "approve" | "reject") => selectedProject && selectedSnapshot && void runAction(
    decision === "approve" ? "Đã gửi yêu cầu duyệt cuối H3." : "Đã gửi yêu cầu từ chối cuối H3.",
    () => workspaceApi.decideFinal(session, selectedProject.id, selectedSnapshot.id, decision, decisionNote.trim() || undefined),
  );

  const createExport = () => selectedProject && selectedSnapshot && void runAction(
    "Submission package đã được tạo.",
    () => workspaceApi.createExport(session, selectedProject.id, selectedSnapshot.id),
    () => setActiveView("export"),
  );

  const downloadExport = () => selectedProject && selectedSnapshot && void runAction(
    "Đã tải submission package.",
    () => workspaceApi.downloadExport(session, selectedProject.id, selectedSnapshot.id),
  );

  const MenuAction = ({ label, onSelect, disabled = false }: { label: string; onSelect: () => void; disabled?: boolean }) => (
    <Menubar.Item
      disabled={disabled || busy}
      onSelect={onSelect}
      className="cursor-default rounded px-3 py-2 text-sm text-neutral-800 outline-none focus:bg-neutral-100 data-[disabled]:cursor-not-allowed data-[disabled]:text-neutral-400"
    >
      {label}
    </Menubar.Item>
  );

  const renderCenter = () => {
    if (rootLoading && activeView === "projects") return <LoadingState label="Đang tải projects…" />;
    if (resourceLoading) return <LoadingState label={`Đang tải ${viewTitles[activeView].toLowerCase()}…`} />;

    switch (activeView) {
      case "projects":
        return (
          <div className="space-y-6">
            <SectionHeading eyebrow="Workspace" title="Projects" description="Liên kết một SLR project bạn có quyền truy cập để bắt đầu không gian viết." />
            {rootError && <InlineError>{rootError}</InlineError>}
            <div className="grid gap-5 xl:grid-cols-[minmax(18rem,0.85fr)_minmax(0,1.15fr)]">
              <Pane title="Liên kết SLR project">
                <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); createProject(); }}>
                  <label className="block space-y-1.5 text-sm font-medium">Tên Writing project<Input value={newProjectName} onChange={(event) => setNewProjectName(event.target.value)} placeholder="Ví dụ: Systematic review workspace" /></label>
                  <label className="block space-y-1.5 text-sm font-medium">SLR project
                    <select value={selectedSlrProjectId} onChange={(event) => setSelectedSlrProjectId(event.target.value)} className="h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm font-normal outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200">
                      {slrProjects.length === 0 && <option value="">Không có project khả dụng</option>}
                      {slrProjects.map((project) => <option key={project.id} value={project.id}>{project.name || project.title || project.id}{project.code ? ` · ${project.code}` : ""}</option>)}
                    </select>
                  </label>
                  <Button type="submit" variant="primary" disabled={busy || !newProjectName.trim() || !selectedSlrProjectId}><PlusIcon className="size-4" aria-hidden="true" /> Link project</Button>
                  <div className="flex gap-2 border-t border-neutral-100 pt-3">
                    <Input value={slrSearchInput} onChange={(event) => setSlrSearchInput(event.target.value)} placeholder="Tìm SLR project…" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); setSlrSearch(slrSearchInput); } }} />
                    <Button type="button" aria-label="Tìm SLR project" onClick={() => setSlrSearch(slrSearchInput)}><MagnifyingGlassIcon className="size-4" aria-hidden="true" /></Button>
                  </div>
                </form>
              </Pane>
              <Pane title={`Writing projects · ${projects.length}`}>
                {projects.length === 0 ? <EmptyState title="Chưa có Writing project" description="Chọn một project SLR ở bên trái để tạo workspace." icon={FolderIcon} /> : (
                  <div className="divide-y divide-neutral-100">
                    {projects.map((project) => <button key={project.id} type="button" onClick={() => chooseProject(project.id)} className="flex w-full items-center gap-3 py-3 text-left hover:bg-neutral-50">
                      <FolderIcon className="size-4 text-neutral-500" aria-hidden="true" />
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{project.name}</span><span className="mt-1 block truncate text-xs text-neutral-500">SLR project · {project.slrProjectId}</span></span>
                      <ChevronRightIcon className="size-4 text-neutral-400" aria-hidden="true" />
                    </button>)}
                  </div>
                )}
              </Pane>
            </div>
          </div>
        );
      case "snapshot": {
        const detail = resource as SnapshotDetails | null;
        const issues = detail?.issues ?? [];
        return (
          <div className="space-y-6">
            <SectionHeading eyebrow="Step 01 · Source data" title="Snapshot & readiness" description="Chọn một SLR run đã duyệt. Writing BE kiểm tra readiness và tạo snapshot bất biến trước khi viết." action={selectedSnapshot && <StatusBadge tone={selectedSnapshot.status === "READY" ? "good" : "warning"}>{selectedSnapshot.status + (readinessWarningCount > 0 ? " · " + readinessWarningCount + " warnings" : "") + (readinessBlockingCount > 0 ? " · " + readinessBlockingCount + " blockers" : "")}</StatusBadge>} />
            {resourceError && selectedSnapshot && <InlineError>{resourceError}</InlineError>}
            {!selectedProject ? <EmptyState title="Chọn Writing project" description="Tạo hoặc chọn project để xem các SLR run có thể nhập." icon={FolderIcon} /> : (
              <div className="space-y-5">
                <Pane title="Import from SLR run">
                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                    <label className="block space-y-1.5 text-sm font-medium">SLR review run
                      <select value={selectedRunId} onChange={(event) => setSelectedRunId(event.target.value)} disabled={runsLoading || runs.length === 0} className="h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm font-normal outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200 disabled:bg-neutral-50">
                        {runsLoading && <option value="">Đang tải runs…</option>}
                        {!runsLoading && runs.length === 0 && <option value="">Không có run khả dụng</option>}
                        {runs.map((run) => <option key={run.runId} value={run.runId}>{run.runId} · {dateLabel(run.generatedAt)}</option>)}
                      </select>
                    </label>
                    <Button type="button" variant="primary" disabled={busy || !selectedRunId} onClick={importRun}><ArrowDownTrayIcon className="size-4" aria-hidden="true" /> Import selected run</Button>
                  </div>
                  {runsError && <p className="mt-3 text-sm text-amber-800">{runsError}. Chỉ các run từ SLR project mà role hiện tại được quyền xem mới xuất hiện.</p>}
                  <p className="mt-3 text-xs leading-5 text-neutral-500">Import lấy dữ liệu qua Writing BE và giữ nguyên corpus hash/provenance. FE không gửi corpus thủ công hoặc upload ZIP vì BE hiện không có endpoint đó.</p>
                </Pane>
                {!selectedSnapshot && readinessIssues.length > 0 && <Pane title={`Run blocked by readiness · ${readinessIssues.length} findings`}><ReadinessGroupList groups={readinessGroups} selectedKey={selectedReadinessGroup?.key ?? ""} onSelect={(key) => { setSelectedReadinessGroupKey(key); setReadinessDialogGroupKey(key); }} /></Pane>}
                <Pane title="Snapshot history">
                  {snapshotsLoading ? <p className="text-sm text-neutral-500">Đang tải snapshot…</p> : snapshots.length === 0 ? <p className="text-sm text-neutral-500">Project này chưa có snapshot. Chọn SLR run phía trên để import.</p> : (
                    <div className="space-y-2">
                      {snapshots.map((snapshot) => <button key={snapshot.id} type="button" onClick={() => setSelectedSnapshotId(snapshot.id)} className={`flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors ${selectedSnapshotId === snapshot.id ? "border-neutral-500 bg-neutral-50" : "border-neutral-200 hover:bg-neutral-50"}`}>
                        <CircleStackIcon className="size-4 shrink-0 text-neutral-500" aria-hidden="true" />
                        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{snapshot.sourceRunId}</span><span className="mt-1 block text-xs text-neutral-500">{dateLabel(snapshot.importedAt)} · {snapshot.corpusVersion}</span></span>
                        <StatusBadge tone={snapshot.status === "READY" ? "good" : "warning"}>{snapshot.status}</StatusBadge>
                      </button>)}
                    </div>
                  )}
                </Pane>
                {selectedSnapshot && detail && <Pane title="Readiness report">
                  <div className="mb-4 flex flex-wrap items-center gap-2"><StatusBadge tone={detail.status === "READY" ? "good" : "warning"}>{detail.status}</StatusBadge><span className="text-xs text-neutral-500">Imported {dateLabel(detail.importedAt)}</span></div>
                  <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                    {Object.entries(detail._count).map(([key, count]) => <div key={key} className="rounded-md bg-neutral-50 p-3"><span className="block text-lg font-semibold">{count}</span><span className="text-[11px] text-neutral-500">{key}</span></div>)}
                  </div>
                  <div className="mt-5"><h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Readiness findings · {issues.length}</h3><ReadinessGroupList groups={readinessGroups} selectedKey={selectedReadinessGroup?.key ?? ""} onSelect={(key) => { setSelectedReadinessGroupKey(key); setReadinessDialogGroupKey(key); }} /></div>
                </Pane>}
              </div>
            )}
          </div>
        );
      }
      case "methods": {
        const methodsRevision = asRecord(revision);
        const generated = Boolean(methodsRevision.markdown);
        return <div className="space-y-6"><SectionHeading eyebrow="Step 02 · Evidence-derived text" title="Methods / PRISMA" description="Methods được sinh xác định từ snapshot; số liệu thiếu được đánh dấu rõ và không tự suy diễn." action={<Button variant="primary" disabled={busy || !selectedSnapshot} onClick={methodsGenerate}>Generate from snapshot</Button>} />
          {resourceError && !generated ? <EmptyState title="Methods chưa được tạo" description="Tạo Methods từ snapshot hiện hành. Nếu snapshot thiếu dữ liệu bắt buộc, BE sẽ trả cảnh báo hoặc lỗi tương ứng." icon={BeakerIcon} /> : generated ? <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]"><Pane title={`Revision ${readable(methodsRevision.version)}`}><article className="prose prose-neutral max-w-none whitespace-pre-wrap font-serif text-base leading-8">{readable(methodsRevision.markdown, "Chưa có nội dung.")}</article></Pane><Pane title="Warnings"><IssuesList issues={asArray(methodsRevision.warnings).map((entry) => ({ ...asRecord(entry), code: readable(asRecord(entry).code), severity: "warning" as const, message: readable(asRecord(entry).message) }))} /></Pane></div> : <EmptyState title="Chưa có Methods revision" description="Chạy generator để tạo nội dung có thể truy vết về dữ liệu snapshot." icon={BeakerIcon} />}
        </div>;
      }
      case "profile": {
        const profile = (resource as JournalProfile | null) ?? selectedProfile;
        return <div className="space-y-6"><SectionHeading eyebrow="Writing requirements" title="Journal profile" description="Profile mô tả cấu trúc bài và word budget gợi ý; trạng thái xác minh của BE là nguồn chuẩn." action={<select value={selectedProfileId} onChange={(event) => setSelectedProfileId(event.target.value)} className="h-9 rounded-md border border-neutral-300 bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-neutral-200">{profiles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>} />
          {profile ? <div className="space-y-5"><Pane title={profile.name}><div className="grid gap-5 sm:grid-cols-2"><Meta label="Journal" value={profile.journal.name ?? "No journal selected"} /><Meta label="Verification" value={profile.verification.status} /><Meta label="Article type" value={profile.articleType} /><Meta label="Language" value={profile.language.toUpperCase()} /><Meta label="Citation style" value={profile.citationStyle ?? "Not specified"} /><Meta label="Budget basis" value={profile.wordBudgetSource} /></div>{profile.notice && <p className="mt-5 rounded-md bg-neutral-50 p-3 text-sm leading-6 text-neutral-600">{profile.notice}</p>}</Pane><Pane title={`Manuscript structure · ${profile.sections.length} sections`}><div className="divide-y divide-neutral-100">{profile.sections.map((section) => <div key={section.key} className="grid gap-2 py-3 sm:grid-cols-[2rem_1fr_auto]"><span className="text-xs text-neutral-400">{String(section.order).padStart(2, "0")}</span><span><span className="block text-sm font-medium">{section.title}{section.required ? " · Required" : ""}</span><span className="mt-1 block text-xs text-neutral-500">{section.purpose}</span></span><span className="text-xs text-neutral-500">{section.wordBudget.min}–{section.wordBudget.max} words</span></div>)}</div></Pane></div> : <EmptyState title="Journal profile không khả dụng" description={resourceError || "Không có profile trả về từ BE."} icon={BookOpenIcon} />}
        </div>;
      }
      case "outline": {
        const blueprint = resource as BlueprintView | null;
        return <div className="space-y-6"><SectionHeading eyebrow="Step 03 · H1" title="Outline" description="Dàn ý được tạo theo journal profile và snapshot. H1 chỉ được OWNER của SLR project duyệt." action={<div className="flex gap-2"><Button disabled={busy || !selectedSnapshot} onClick={blueprintGenerate}><PlusIcon className="size-4" aria-hidden="true" /> Generate outline</Button>{blueprint && <Button variant="primary" disabled={busy || !blueprint.approvable || blueprint.approval.status === "APPROVED"} onClick={() => blueprintDecision("approve")}>Approve H1</Button>}</div>} />
          {blueprint ? <div className="space-y-4"><div className="flex flex-wrap items-center gap-2"><StatusBadge tone={blueprint.approvable ? "good" : "warning"}>{blueprint.approvable ? "Approvable" : "Needs revision"}</StatusBadge><StatusBadge>{`H1 ${blueprint.approval.status}`}</StatusBadge><span className="text-xs text-neutral-500">Revision {blueprint.revision.version}</span></div>{blueprint.issues.length > 0 && <Pane title="Outline checks"><IssuesList issues={blueprint.issues} /></Pane>}<Pane title="Outline content · JSON"><textarea value={outlineText} onChange={(event) => setOutlineText(event.target.value)} spellCheck={false} className="min-h-[26rem] w-full resize-y rounded-md border border-neutral-200 bg-white p-4 font-mono text-xs leading-5 text-neutral-800 outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-100" /><div className="mt-3 flex justify-end"><Button variant="primary" disabled={busy || !outlineText.trim()} onClick={blueprintSave}>Save revision</Button></div></Pane></div> : <EmptyState title="Chưa có outline" description={resourceError || "Generate outline để khởi tạo dàn ý từ dữ liệu đã snapshot."} icon={Squares2X2Icon} />}
        </div>;
      }
      case "plans": {
        const plansView = resource as ParagraphPlansView | null;
        const content = asRecord(asRecord(plansView?.revision).content);
        const plans = asArray(content.plans).map(asRecord);
        return <div className="space-y-6"><SectionHeading eyebrow="Planning" title="Paragraph plan" description="Mỗi đoạn gắn với mục H1, claim, finding và evidence trong snapshot registry." action={<Button variant="primary" disabled={busy || !selectedSnapshot} onClick={plansGenerate}><PlusIcon className="size-4" aria-hidden="true" /> Generate plan</Button>} />
          {plansView ? <div className="space-y-4"><div className="flex flex-wrap gap-2"><StatusBadge tone={plansView.readyToDraft ? "good" : "warning"}>{plansView.readyToDraft ? "Ready to draft" : "Needs evidence"}</StatusBadge><StatusBadge>{`${plansView.stats.readyParagraphs}/${plansView.stats.totalParagraphs} ready`}</StatusBadge><span className="py-1 text-xs text-neutral-500">Revision {plansView.revision.version}</span></div>{plansView.issues.length > 0 && <Pane title="Plan checks"><IssuesList issues={plansView.issues} /></Pane>}<Pane title={`Paragraphs · ${plans.length}`}>
            {plans.length ? <div className="divide-y divide-neutral-100">{plans.map((plan, index) => <button key={readable(plan.id, String(index))} type="button" onClick={() => { setSelectedSectionKey(readable(plan.sectionKey, "introduction")); setActiveView("draft"); }} className="flex w-full items-start gap-3 py-3 text-left hover:bg-neutral-50"><span className="rounded bg-neutral-100 px-2 py-1 text-xs font-medium">{readable(plan.id, `P${index + 1}`)}</span><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{readable(plan.rhetoricalMove).replaceAll("_", " ")}</span><span className="mt-1 block text-xs text-neutral-500">{readable(plan.sectionKey)} · {asArray(plan.evidenceIds).length} evidence · {asArray(plan.claimIds).length} claims</span></span><StatusBadge tone={plan.status === "READY_TO_DRAFT" ? "good" : "warning"}>{readable(plan.status)}</StatusBadge></button>)}</div> : <p className="text-sm text-neutral-500">Plan hiện chưa có paragraph nào.</p>}
          </Pane></div> : <EmptyState title="Chưa có paragraph plan" description={resourceError || "BE cần outline H1 đã được duyệt trước khi tạo paragraph plan."} icon={DocumentTextIcon} />}
        </div>;
      }
      case "draft": {
        const draft = resource as DraftView | null;
        return <div className="space-y-6"><SectionHeading eyebrow={`Step 04 · H2 · ${selectedSectionKey}`} title={`Drafting · ${sectionTitle(selectedProfile, selectedSectionKey)}`} description="Bản thảo được tạo từ paragraph plan và evidence pack tối thiểu. H2 approval được xác nhận bởi Writing BE." action={<div className="flex gap-2"><Button disabled={busy || !selectedSnapshot} onClick={draftGenerate}>Draft from evidence</Button>{draft && <Button variant="primary" disabled={busy || draft.approval.status === "APPROVED"} onClick={() => draftDecision("approve")}>Approve H2</Button>}</div>} />
          {draft ? <Pane title={`Revision ${draft.revision.version} · ${draft.approval.status}`}><textarea value={draftText} onChange={(event) => setDraftText(event.target.value)} className="min-h-[55vh] w-full resize-y border-0 bg-white p-0 font-serif text-lg leading-8 text-neutral-900 outline-none focus:ring-0" /><div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3"><span className="text-xs text-neutral-500">{draftText.trim() ? draftText.trim().split(/\s+/).length : 0} words · registry-only citations</span><Button variant="primary" disabled={busy || !draftText.trim()} onClick={draftSave}>Save revision</Button></div></Pane> : <EmptyState title="Chưa có bản nháp cho section này" description={resourceError || "Draft from evidence sẽ dùng các paragraph plan READY_TO_DRAFT."} icon={DocumentTextIcon} />}
        </div>;
      }
      case "verification":
        return <div className="space-y-6"><SectionHeading eyebrow="Quality gates · G1–G7" title="Verification" description="Chạy kiểm tra citation, claim và evidence linkage cho snapshot hiện hành." action={<Button variant="primary" disabled={busy || !selectedSnapshot} onClick={verificationRun}><ShieldCheckIcon className="size-4" aria-hidden="true" /> Run verification</Button>} />{resource ? <Pane title="Verification report"><JsonPreview value={resource} /></Pane> : <EmptyState title="Chưa có verification report" description={resourceError || "Chạy các quality gates để tạo report có phiên bản."} icon={ShieldCheckIcon} />}</div>;
      case "final":
        return <div className="space-y-6"><SectionHeading eyebrow="H3 · Human approval" title="Final approval" description="BE kiểm tra verification và H2 trước khi OWNER quyết định trạng thái cuối." />{resource ? <><Pane title="Final readiness"><JsonPreview value={resource} /></Pane><Pane title="Decision note"><div className="space-y-3"><Input value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} placeholder="Giải thích quyết định nếu cần…" /><div className="flex justify-end gap-2"><Button disabled={busy || !decisionNote.trim()} onClick={() => finalDecision("reject")}>Reject</Button><Button variant="primary" disabled={busy} onClick={() => finalDecision("approve")}>Approve final</Button></div></div></Pane></> : <EmptyState title="Chưa đủ dữ liệu phê duyệt" description={resourceError || "Final status cần manuscript và verification hiện hành."} icon={CheckCircleIcon} />}</div>;
      case "export":
        return <div className="space-y-6"><SectionHeading eyebrow="Submission package" title="Export" description="Package bất biến chỉ được tạo sau khi H3 được duyệt và quality gates đạt." action={<div className="flex gap-2"><Button disabled={busy} onClick={createExport}>Create package</Button><Button variant="primary" disabled={busy || !resource} onClick={downloadExport}><ArrowDownTrayIcon className="size-4" aria-hidden="true" /> Download ZIP</Button></div>} />{resource ? <Pane title="Latest export package"><JsonPreview value={resource} /></Pane> : <EmptyState title="Chưa có export package" description={resourceError || "Hoàn tất H3 và tạo package để tải xuống."} icon={ArrowDownTrayIcon} />}</div>;
    }
  };

  const inspectorRecord = resourceRecord;
  const inspectorIssues = (asArray(inspectorRecord.issues).map((item) => asRecord(item)) as Array<JsonRecord & { code: string; severity: "warning" | "blocking"; message: string }>);

  return (
    <div className="flex h-screen min-h-[600px] flex-col overflow-hidden bg-white text-neutral-900">
      <Menubar.Root aria-label="Workspace commands" className="z-20 flex h-12 shrink-0 items-center gap-1 border-b border-neutral-200 bg-white px-3">
        <Menubar.Menu><Menubar.Trigger className="rounded px-3 py-1.5 text-sm outline-none hover:bg-neutral-100 focus-visible:ring-1 focus-visible:ring-neutral-500 data-[state=open]:bg-neutral-100">File</Menubar.Trigger><Menubar.Portal><Menubar.Content align="start" sideOffset={5} className="z-50 min-w-56 rounded-md border border-neutral-200 bg-white p-1 shadow-lg"><MenuAction label="Projects" onSelect={() => setActiveView("projects")} /><MenuAction label="Import snapshot from SLR run" onSelect={() => setActiveView("snapshot")} disabled={!selectedProject} /><Menubar.Separator className="my-1 h-px bg-neutral-100" /><MenuAction label="Refresh workspace data" onSelect={refresh} /><MenuAction label="Sign out" onSelect={onSignOut} /></Menubar.Content></Menubar.Portal></Menubar.Menu>
        <Menubar.Menu><Menubar.Trigger className="rounded px-3 py-1.5 text-sm outline-none hover:bg-neutral-100 focus-visible:ring-1 focus-visible:ring-neutral-500 data-[state=open]:bg-neutral-100">Edit</Menubar.Trigger><Menubar.Portal><Menubar.Content align="start" sideOffset={5} className="z-50 min-w-52 rounded-md border border-neutral-200 bg-white p-1 shadow-lg"><MenuAction label="Save outline revision" onSelect={blueprintSave} disabled={activeView !== "outline" || !revision.version} /><MenuAction label="Save manuscript revision" onSelect={draftSave} disabled={activeView !== "draft" || !revision.version} /></Menubar.Content></Menubar.Portal></Menubar.Menu>
        <Menubar.Menu><Menubar.Trigger className="rounded px-3 py-1.5 text-sm outline-none hover:bg-neutral-100 focus-visible:ring-1 focus-visible:ring-neutral-500 data-[state=open]:bg-neutral-100">Review</Menubar.Trigger><Menubar.Portal><Menubar.Content align="start" sideOffset={5} className="z-50 min-w-56 rounded-md border border-neutral-200 bg-white p-1 shadow-lg"><MenuAction label="Generate Methods / PRISMA" onSelect={() => { setActiveView("methods"); methodsGenerate(); }} disabled={!selectedSnapshot} /><MenuAction label="Generate outline (H1)" onSelect={blueprintGenerate} disabled={!selectedSnapshot} /><MenuAction label="Approve outline (H1)" onSelect={() => blueprintDecision("approve")} disabled={activeView !== "outline" || !revision.version} /><MenuAction label="Generate paragraph plan" onSelect={() => { setActiveView("plans"); plansGenerate(); }} disabled={!selectedSnapshot} /><MenuAction label="Approve current section (H2)" onSelect={() => draftDecision("approve")} disabled={activeView !== "draft" || !revision.version} /></Menubar.Content></Menubar.Portal></Menubar.Menu>
        <Menubar.Menu><Menubar.Trigger className="rounded px-3 py-1.5 text-sm outline-none hover:bg-neutral-100 focus-visible:ring-1 focus-visible:ring-neutral-500 data-[state=open]:bg-neutral-100">Verify</Menubar.Trigger><Menubar.Portal><Menubar.Content align="start" sideOffset={5} className="z-50 min-w-52 rounded-md border border-neutral-200 bg-white p-1 shadow-lg"><MenuAction label="Run verification gates" onSelect={() => { setActiveView("verification"); verificationRun(); }} disabled={!selectedSnapshot} /><MenuAction label="Open final readiness" onSelect={() => setActiveView("final")} disabled={!selectedSnapshot} /></Menubar.Content></Menubar.Portal></Menubar.Menu>
        <Menubar.Menu><Menubar.Trigger className="rounded px-3 py-1.5 text-sm outline-none hover:bg-neutral-100 focus-visible:ring-1 focus-visible:ring-neutral-500 data-[state=open]:bg-neutral-100">Export</Menubar.Trigger><Menubar.Portal><Menubar.Content align="start" sideOffset={5} className="z-50 min-w-52 rounded-md border border-neutral-200 bg-white p-1 shadow-lg"><MenuAction label="Approve final manuscript (H3)" onSelect={() => { setActiveView("final"); finalDecision("approve"); }} disabled={!selectedSnapshot} /><MenuAction label="Create submission package" onSelect={createExport} disabled={!selectedSnapshot} /><MenuAction label="Download latest package" onSelect={() => { setActiveView("export"); downloadExport(); }} disabled={!selectedSnapshot} /></Menubar.Content></Menubar.Portal></Menubar.Menu>
        <div className="ml-auto flex min-w-0 items-center gap-3 pl-3 text-xs text-neutral-500"><span className="hidden max-w-56 truncate sm:block">{session.email}</span><span className="rounded bg-neutral-100 px-2 py-1 uppercase">{session.role}</span><Button variant="ghost" className="min-h-8 px-2 text-xs" onClick={onSignOut}>Sign out</Button></div>
      </Menubar.Root>

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[14.5rem_minmax(0,1fr)] xl:grid-cols-[14.5rem_minmax(0,1fr)_18rem]">
        <aside aria-label="Workspace explorer" className="hidden min-h-0 flex-col border-r border-neutral-200 bg-[#fafaf9] md:flex">
          <div className="flex h-11 shrink-0 items-center justify-between border-b border-neutral-200 px-4"><span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Explorer</span><button type="button" className="rounded p-1 text-neutral-400 hover:bg-neutral-100" aria-label="Refresh" onClick={refresh}><ArrowPathIcon className="size-4" aria-hidden="true" /></button></div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
            <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">Project / workspace</p>
            <SidebarItem icon={FolderIcon} label="Projects" active={activeView === "projects"} onClick={() => setActiveView("projects")} />
            {projects.map((project) => <div key={project.id} className="mt-1">
              <SidebarItem icon={FolderIcon} label={project.name} onClick={() => chooseProject(project.id)} nested />
              {project.id === selectedProjectId && <div className="ml-3 border-l border-neutral-200 pl-2">
                <SidebarItem icon={RectangleStackIcon} label="Snapshots" active={activeView === "snapshot" && !selectedSnapshot} onClick={() => setActiveView("snapshot")} nested />
                {currentExplorerSnapshot && <button type="button" aria-current={activeView === "snapshot" ? "page" : undefined} title={currentExplorerSnapshot.sourceRunId} onClick={() => { setSelectedSnapshotId(currentExplorerSnapshot.id); setActiveView("snapshot"); }} className={`flex min-h-8 w-full items-center gap-2 rounded py-1 pl-5 pr-2 text-left text-xs transition-colors ${activeView === "snapshot" ? "bg-neutral-200/70 font-medium text-neutral-900" : "text-neutral-500 hover:bg-neutral-100"}`}><span className={`size-1.5 shrink-0 rounded-full ${activeView === "snapshot" ? "bg-neutral-800" : "bg-neutral-300"}`} aria-hidden="true" /><span className="truncate">Current snapshot</span></button>}
              </div>}
            </div>)}
            <p className="px-2 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">Writing workflow</p>
            {(["methods", "outline", "plans"] as WorkspaceView[]).map((view) => <SidebarItem key={view} icon={icons[view]} label={viewTitles[view]} active={activeView === view} onClick={() => setActiveView(view)} disabled={!selectedSnapshot} />)}
            <SidebarItem icon={icons.profile} label={viewTitles.profile} active={activeView === "profile"} onClick={() => setActiveView("profile")} />
            <SidebarItem icon={DocumentTextIcon} label="Manuscript / H2" active={activeView === "draft"} onClick={() => setActiveView("draft")} disabled={!selectedSnapshot} />
            {selectedProfile?.sections.map((section) => <button key={section.key} type="button" onClick={() => { setSelectedSectionKey(section.key); setActiveView("draft"); }} disabled={!selectedSnapshot} className={`flex min-h-7 w-full items-center gap-2 rounded py-1 pl-9 pr-2 text-left text-xs ${activeView === "draft" && selectedSectionKey === section.key ? "bg-neutral-200/70 text-neutral-900" : "text-neutral-500 hover:bg-neutral-100 disabled:opacity-40"}`}><span className="truncate">{section.title}</span></button>)}
            {(["verification", "final", "export"] as WorkspaceView[]).map((view) => <SidebarItem key={view} icon={icons[view]} label={viewTitles[view]} active={activeView === view} onClick={() => setActiveView(view)} disabled={!selectedSnapshot} />)}
          </div>
          <div className="border-t border-neutral-200 p-3"><div className="flex items-start gap-2 rounded-md border border-neutral-200 bg-white p-3 text-xs leading-5 text-neutral-500"><ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-neutral-400" aria-hidden="true" /><span>Snapshots stay immutable. Writing and citations use the selected snapshot registry.</span></div></div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-col bg-[#f5f5f4]">
          <header className="flex h-11 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-4 sm:px-6"><div className="min-w-0 truncate text-sm font-medium text-neutral-700">{selectedProject?.name ?? "SLRW workspace"}{selectedSnapshot && <span className="font-normal text-neutral-400"> · {selectedSnapshot.sourceRunId}</span>}</div><div className="ml-3 max-w-52 shrink-0 truncate text-xs text-neutral-400">{selectedSnapshot ? selectedSnapshot.status + (readinessWarningCount > 0 ? " · " + readinessWarningCount + " warnings" : "") + (readinessBlockingCount > 0 ? " · " + readinessBlockingCount + " blockers" : "") : "No snapshot selected"}</div></header>
          <section aria-label="Document workspace" className="min-h-0 flex-1 overflow-auto p-4 sm:p-7 xl:p-9">
            <motion.div key={activeView + selectedSnapshotId + selectedSectionKey} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.16, ease: "easeOut" }} className="mx-auto w-full max-w-5xl space-y-4">
              {notice && <div role="status" className={`flex items-start justify-between gap-3 rounded-md border px-3 py-2.5 text-sm ${notice.kind === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-neutral-200 bg-white text-neutral-700"}`}><span>{notice.message}</span><button type="button" onClick={() => setNotice(null)} className="text-neutral-400 hover:text-neutral-800" aria-label="Dismiss">×</button></div>}
              {resourceError && !["projects", "snapshot", "methods", "profile", "outline", "plans", "draft", "verification", "final", "export"].includes(activeView) && <InlineError>{resourceError}</InlineError>}
              {renderCenter()}
            </motion.div>
          </section>
        </main>

        <aside aria-label="Inspector" className="hidden min-h-0 min-w-0 flex-col overflow-hidden border-l border-neutral-200 bg-white xl:flex">
          <div className="flex h-11 shrink-0 items-center border-b border-neutral-200 px-4"><span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Inspector</span></div>
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4">
            <h2 className="font-serif text-xl">{activeView === "draft" ? "Evidence inspector" : viewTitles[activeView]}</h2>
            <p className="mt-1 text-xs leading-5 text-neutral-500">{selectedProject?.name ?? "Chưa chọn project"}</p>
            <div className="mt-5 space-y-4">
              {selectedSnapshot && <div className="border-b border-neutral-100 pb-4"><Meta label="Current snapshot" value={selectedSnapshot.sourceRunId} /><Meta label="Imported" value={dateLabel(selectedSnapshot.importedAt)} /><Meta label="Corpus hash" value={selectedSnapshot.corpusHash.slice(0, 18) + "…"} /></div>}
              {activeView === "snapshot" && <div className="min-w-0 space-y-4">
                {resource != null && <><Meta label="Studies" value={readable(asRecord(inspectorRecord._count).studies)} /><Meta label="Evidence records" value={readable(asRecord(inspectorRecord._count).evidence)} /><Meta label="Research questions" value={readable(asRecord(inspectorRecord._count).researchQuestions)} /><Meta label="Warnings" value={readinessWarningCount} /><Meta label="Blocking issues" value={readinessBlockingCount} /></>}
              </div>}
              {activeView === "methods" && <><p className="text-xs text-neutral-500">Methods derives facts from the frozen source data.</p><JsonPreview value={asRecord(revision).facts ?? []} /></>}
              {activeView === "profile" && selectedProfile && <><Meta label="Profile" value={selectedProfile.name} /><Meta label="Verified" value={selectedProfile.verification.status} /><Meta label="Sections" value={selectedProfile.sections.length} /><p className="text-xs leading-5 text-neutral-500">{selectedProfile.notice ?? "Profile notice not provided."}</p></>}
              {activeView === "outline" && resource != null && <><Meta label="H1 state" value={readable(asRecord(inspectorRecord.approval).status)} /><Meta label="Can approve" value={readable(inspectorRecord.approvable)} /><IssuesList issues={inspectorIssues as ReadinessIssue[]} /></>}
              {activeView === "plans" && resource != null && <><Meta label="Ready paragraphs" value={readable(asRecord(inspectorRecord.stats).readyParagraphs)} /><Meta label="Total paragraphs" value={readable(asRecord(inspectorRecord.stats).totalParagraphs)} /><IssuesList issues={inspectorIssues as ReadinessIssue[]} /></>}
              {activeView === "draft" && resource != null && <><Meta label="H2 state" value={readable(asRecord(inspectorRecord.approval).status)} /><Meta label="Revision" value={readable(revision.version)} /><p className="text-xs leading-5 text-neutral-500">Linked claims and evidence are maintained in the paragraph plan and revision facts.</p><JsonPreview value={asRecord(revision).facts ?? {}} /></>}
              {activeView === "verification" && resource != null && <JsonPreview value={resource} />}
              {activeView === "final" && resource != null && <JsonPreview value={resource} />}
              {activeView === "export" && resource != null && <JsonPreview value={resource} />}
              {!selectedSnapshot && activeView !== "snapshot" && <div className="rounded-md bg-neutral-50 p-3 text-xs leading-5 text-neutral-500">Chọn project và import một SLR run để xem nguồn dữ liệu, readiness và provenance.</div>}
            </div>
          </div>
        </aside>
      </div>
      <Dialog.Root open={readinessDialogGroup !== null} onOpenChange={(open) => { if (!open) setReadinessDialogGroupKey(""); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px]" />
          {readinessDialogGroup && <Dialog.Content className="fixed left-1/2 top-1/2 z-[51] flex max-h-[min(80vh,48rem)] w-[min(42rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xl focus:outline-none">
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4">
              <div className="min-w-0">
                <Dialog.Title className="break-all text-base font-semibold text-neutral-900">{readinessDialogGroup.code}</Dialog.Title>
                <Dialog.Description className="mt-1 text-xs text-neutral-500">{readinessDialogGroup.severity} finding · {readinessDialogGroup.count} {readinessDialogGroup.count === 1 ? "item" : "items"} from snapshot readiness.</Dialog.Description>
              </div>
              <Dialog.Close asChild><button type="button" aria-label="Close details" className="rounded-md p-1.5 text-neutral-500 outline-none hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-neutral-400"><XMarkIcon className="size-5" aria-hidden="true" /></button></Dialog.Close>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-5"><ReadinessGroupDetails group={readinessDialogGroup} /></div>
            <footer className="flex shrink-0 justify-end border-t border-neutral-200 px-5 py-3"><Dialog.Close asChild><Button>Close</Button></Dialog.Close></footer>
          </Dialog.Content>}
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function SidebarItem({ icon: Icon, label, active, disabled, nested, onClick }: { icon: typeof FolderIcon; label: string; active?: boolean; disabled?: boolean; nested?: boolean; onClick: () => void }) {
  return <button type="button" aria-current={active ? "page" : undefined} disabled={disabled} onClick={onClick} className={`flex min-h-8 w-full items-center gap-2 rounded px-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${nested ? "pl-2" : ""} ${active ? "bg-neutral-200/70 font-medium text-neutral-900" : "text-neutral-600 hover:bg-neutral-100"}`}><Icon className="size-4 shrink-0" aria-hidden="true" /><span className="truncate">{label}</span></button>;
}

function LoadingState({ label }: { label: string }) {
  return <div className="flex min-h-64 items-center justify-center text-sm text-neutral-500"><ArrowPathIcon className="mr-2 size-4 animate-spin" aria-hidden="true" />{label}</div>;
}

function InlineError({ children }: { children: React.ReactNode }) {
  return <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-red-800">{children}</p>;
}

function EmptyState({ title, description, icon: Icon }: { title: string; description: string; icon: typeof FolderIcon }) {
  return <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-white px-6 py-10 text-center"><div className="flex size-11 items-center justify-center rounded-lg bg-neutral-100"><Icon className="size-5 text-neutral-500" aria-hidden="true" /></div><h2 className="mt-4 font-serif text-xl text-neutral-900">{title}</h2><p className="mt-2 max-w-md text-sm leading-6 text-neutral-500">{description}</p></div>;
}

function Meta({ label, value }: { label: string; value: unknown }) {
  return <div className="py-1"><span className="block text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{label}</span><span className="mt-1 block break-words text-sm text-neutral-800">{readable(value)}</span></div>;
}

function sectionTitle(profile: JournalProfile | null, key: string) {
  return profile?.sections.find((section) => section.key === key)?.title ?? key;
}
