import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { AppShell } from "@/app/layouts/AppShell";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { NotFoundPage } from "@/shared/ui/NotFoundPage";
import { RouteLoading } from "@/shared/ui/RouteLoading";

const LoginPage = lazy(() =>
  import("@/features/auth/LoginPage").then((module) => ({ default: module.LoginPage })),
);
const OverviewPage = lazy(() =>
  import("@/features/projects/pages/OverviewPage").then((module) => ({ default: module.OverviewPage })),
);
const ProjectsPage = lazy(() =>
  import("@/features/projects/pages/ProjectsPage").then((module) => ({ default: module.ProjectsPage })),
);
const SnapshotReadinessPage = lazy(() =>
  import("@/features/snapshots/pages/SnapshotReadinessPage").then((module) => ({
    default: module.SnapshotReadinessPage,
  })),
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
const ParagraphPlansPage = lazy(() =>
  import("@/features/paragraph-plans/pages/ParagraphPlansPage").then((module) => ({ default: module.ParagraphPlansPage })),
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

function PageSuspense({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteLoading />}>{children}</Suspense>;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="login" element={<PageSuspense><LoginPage /></PageSuspense>} />
        <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<PageSuspense><OverviewPage /></PageSuspense>} />
          <Route path="projects" element={<PageSuspense><ProjectsPage /></PageSuspense>} />
          <Route path="snapshots" element={<PageSuspense><SnapshotReadinessPage /></PageSuspense>} />
          <Route path="journal-profiles" element={<PageSuspense><JournalProfilesPage /></PageSuspense>} />
          <Route path="methods" element={<PageSuspense><MethodsPage /></PageSuspense>} />
          <Route path="outline" element={<PageSuspense><OutlinePage /></PageSuspense>} />
          <Route path="paragraph-plans" element={<PageSuspense><ParagraphPlansPage /></PageSuspense>} />
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
