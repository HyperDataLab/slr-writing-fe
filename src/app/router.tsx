import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useSearchParams } from "react-router";
import { AppShell } from "@/app/layouts/AppShell";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { NotFoundPage } from "@/shared/ui/NotFoundPage";
import { RouteLoading } from "@/shared/ui/RouteLoading";

const LoginPage = lazy(() =>
  import("@/features/auth/LoginPage").then((module) => ({ default: module.LoginPage })),
);
const DesignSystemPage = lazy(() =>
  import("@/features/design-system/pages/DesignSystemPage").then((module) => ({ default: module.DesignSystemPage })),
);
const OverviewPage = lazy(() =>
  import("@/features/projects/pages/OverviewPage").then((module) => ({ default: module.OverviewPage })),
);
const ImportProjectPage = lazy(() =>
  import("@/features/projects/pages/ImportProjectPage").then((module) => ({ default: module.ImportProjectPage })),
);
const SnapshotReadinessPage = lazy(() =>
  import("@/features/snapshots/pages/SnapshotReadinessPage").then((module) => ({
    default: module.SnapshotReadinessPage,
  })),
);
const EvidenceRegistryPage = lazy(() =>
  import("@/features/evidence/pages/EvidenceRegistryPage").then((module) => ({ default: module.EvidenceRegistryPage })),
);
const JournalProfilesPage = lazy(() =>
  import("@/features/journal-profiles/pages/JournalProfilesPage").then((module) => ({ default: module.JournalProfilesPage })),
);
const MethodsPage = lazy(() =>
  import("@/features/methods/pages/MethodsPage").then((module) => ({ default: module.MethodsPage })),
);
const OutlinePage = lazy(() =>
  import("@/features/outline/pages/OutlinePage").then((module) => ({ default: module.OutlinePage })),
);
const DraftingPage = lazy(() =>
  import("@/features/drafting/pages/DraftingPage").then((module) => ({ default: module.DraftingPage })),
);
const VerificationPage = lazy(() =>
  import("@/features/verification/pages/VerificationPage").then((module) => ({ default: module.VerificationPage })),
);
const ExportPage = lazy(() =>
  import("@/features/export/pages/ExportPage").then((module) => ({ default: module.ExportPage })),
);

function SnapshotRoute() {
  const [searchParams] = useSearchParams();
  if (searchParams.get("mode") === "import") {
    const next = new URLSearchParams(searchParams);
    next.delete("mode");
    next.delete("snapshotId");
    const query = next.toString();
    return <Navigate to={query ? `/import?${query}` : "/import"} replace />;
  }
  return <PageSuspense><SnapshotReadinessPage /></PageSuspense>;
}

function ParagraphPlansRedirect() {
  const [searchParams] = useSearchParams();
  const next = new URLSearchParams(searchParams);
  next.delete("studioMode");
  const query = next.toString();
  return <Navigate to={query ? `/drafting?${query}#paragraph-plans` : "/drafting#paragraph-plans"} replace />;
}

function PageSuspense({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteLoading />}>{children}</Suspense>;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="login" element={<PageSuspense><LoginPage /></PageSuspense>} />
        <Route path="design-system" element={<PageSuspense><DesignSystemPage /></PageSuspense>} />
        <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<PageSuspense><OverviewPage /></PageSuspense>} />
          <Route path="projects" element={<Navigate to="/import?newProject=1" replace />} />
          <Route path="import" element={<PageSuspense><ImportProjectPage /></PageSuspense>} />
          <Route path="evidence" element={<PageSuspense><EvidenceRegistryPage /></PageSuspense>} />
          <Route path="snapshots" element={<SnapshotRoute />} />
          <Route path="journal-profiles" element={<PageSuspense><JournalProfilesPage /></PageSuspense>} />
          <Route path="methods" element={<PageSuspense><MethodsPage /></PageSuspense>} />
          <Route path="outline" element={<PageSuspense><OutlinePage /></PageSuspense>} />
          <Route path="paragraph-plans" element={<ParagraphPlansRedirect />} />
          <Route path="drafting" element={<PageSuspense><DraftingPage /></PageSuspense>} />
          <Route path="verification" element={<PageSuspense><VerificationPage /></PageSuspense>} />
          <Route path="export" element={<PageSuspense><ExportPage /></PageSuspense>} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
