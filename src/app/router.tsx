import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { AppShell } from "@/app/layouts/AppShell";
import { NotFoundPage } from "@/shared/ui/NotFoundPage";
import { RouteLoading } from "@/shared/ui/RouteLoading";

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
const MethodsPage = lazy(() =>
  import("@/features/methods/pages/MethodsPage").then((module) => ({ default: module.MethodsPage })),
);
const JournalProfilesPage = lazy(() =>
  import("@/features/journal-profiles/pages/JournalProfilesPage").then((module) => ({ default: module.JournalProfilesPage })),
);
const OutlinePage = lazy(() =>
  import("@/features/outline/pages/OutlinePage").then((module) => ({ default: module.OutlinePage })),
);

function PageSuspense({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteLoading />}>{children}</Suspense>;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<PageSuspense><OverviewPage /></PageSuspense>} />
          <Route path="projects" element={<PageSuspense><ProjectsPage /></PageSuspense>} />
          <Route path="snapshots" element={<PageSuspense><SnapshotReadinessPage /></PageSuspense>} />
          <Route path="methods" element={<PageSuspense><MethodsPage /></PageSuspense>} />
          <Route path="journal-profiles" element={<PageSuspense><JournalProfilesPage /></PageSuspense>} />
          <Route path="outline" element={<PageSuspense><OutlinePage /></PageSuspense>} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

