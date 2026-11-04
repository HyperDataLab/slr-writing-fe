import { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ShieldCheckIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";
import { cn } from "@/shared/utils/cn";
import {
  workflowNavigation,
  workspaceNavigation,
  type NavigationItem,
} from "@/shared/constants/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog";
import { Separator } from "@/shared/ui/separator";
import { LanguageSwitcher } from "@/shared/ui/LanguageSwitcher";

function SidebarNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const currentProjectId = searchParams.get("projectId") || (typeof window !== "undefined" ? localStorage.getItem("slrw_selected_project_id") : null);
  const currentSnapshotId = searchParams.get("snapshotId") || (typeof window !== "undefined" ? localStorage.getItem("slrw_selected_snapshot_id") : null);

  const renderItem = (item: NavigationItem) => {
    const Icon = item.icon;
    const isRoot = item.to === "/";
    const toWithParams = !isRoot && currentProjectId
      ? `${item.to}?projectId=${encodeURIComponent(currentProjectId)}${currentSnapshotId ? `&snapshotId=${encodeURIComponent(currentSnapshotId)}` : ""}`
      : item.to;

    return (
      <NavLink
        key={item.to}
        to={toWithParams}
        end={item.to === "/"}
        onClick={onNavigate}
        className={({ isActive }) =>
          cn(
            "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            isActive
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground",
          )
        }
      >
        {({ isActive }) => (
          <>
            <Icon
              className={cn("size-[18px]", isActive ? "text-primary" : "text-muted-foreground")}
              aria-hidden="true"
            />
            <span>{t(item.labelKey)}</span>
          </>
        )}
      </NavLink>
    );
  };

  return (
    <div className="flex h-full flex-col bg-card">
      <Link to="/" className="flex items-center px-6 py-4" onClick={onNavigate}>
        <img
          src="/SLRW_logo_vector.svg"
          alt="SLRW"
          className="h-auto w-32 max-w-full"
        />
      </Link>

      <Separator />

      <nav aria-label={t("navigation.main")} className="flex-1 space-y-7 overflow-y-auto px-4 py-6">
        <div>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t("navigation.workspace")}
          </p>
          <div className="space-y-1">{workspaceNavigation.map(renderItem)}</div>
        </div>

        <div>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t("navigation.writingWorkflow")}
          </p>
          <div className="space-y-1">{workflowNavigation.map(renderItem)}</div>
        </div>
      </nav>

      <div className="p-4">
        <div className="rounded-xl border border-primary/15 bg-secondary/70 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ShieldCheckIcon className="size-4 text-primary" aria-hidden="true" />
            {t("navigation.evidenceFirst")}
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {t("navigation.evidenceDescription")}
          </p>
        </div>
      </div>
    </div>
  );
}

function getPageTitleKey(pathname: string): string {
  if (pathname === "/") return "navigation.overview";
  if (pathname.startsWith("/projects")) return "navigation.projects";
  if (pathname.startsWith("/snapshots")) return "navigation.snapshots";
  if (pathname.startsWith("/methods")) return "navigation.methods";
  if (pathname.startsWith("/journal-profiles")) return "navigation.journalProfiles";
  if (pathname.startsWith("/outline")) return "navigation.outline";
  if (pathname.startsWith("/paragraph-plans")) return "navigation.paragraphPlans";
  if (pathname.startsWith("/drafting")) return "navigation.drafting";
  if (pathname.startsWith("/verification")) return "navigation.verification";
  if (pathname.startsWith("/export")) return "navigation.export";
  return "common.workspace";
}

export function AppShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const pageTitle = t(getPageTitleKey(pathname));

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-card lg:block">
        <SidebarNavigation />
      </aside>

      <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <DialogContent className="left-0 top-0 h-full w-[min(19rem,86vw)] translate-x-0 translate-y-0 rounded-none border-y-0 border-l-0 p-0 sm:max-w-none">
          <DialogTitle className="sr-only">{t("navigation.mobileTitle")}</DialogTitle>
          <SidebarNavigation onNavigate={() => setMobileMenuOpen(false)} />
        </DialogContent>
      </Dialog>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="inline-flex size-10 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
              aria-label={t("navigation.mobileMenu")}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(true)}
            >
              <Bars3Icon className="size-5" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-muted-foreground">SLRW</p>
              <h1 className="truncate text-sm font-semibold text-foreground">{pageTitle}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 text-xs font-medium text-muted-foreground sm:flex">
              <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
              {t("navigation.workflowStatus")}
            </div>
            <LanguageSwitcher />
          </div>
        </header>

        <main className="mx-auto w-full max-w-screen-2xl px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
