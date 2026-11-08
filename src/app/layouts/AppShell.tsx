import { useEffect, useState, type ComponentType, type SVGProps } from "react";
import { Link, useLocation, useOutlet, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  Bars3Icon,
  ChevronDownIcon,
  CircleStackIcon,
  ListBulletIcon,
  PencilSquareIcon,
  RectangleStackIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { cn } from "@/shared/utils/cn";
import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog";
import { useAuth } from "@/features/auth/auth-context";
import { LanguageSwitcher } from "@/shared/ui/LanguageSwitcher";
import { useProjects } from "@/features/projects/hooks/use-projects";
import type { ProjectSummary } from "@/features/projects/model/project.types";

type NavItem = {
  labelKey: string;
  to: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  children?: NavItem[];
};

const workspaceItems: NavItem[] = [
  { labelKey: "navigation.overview", to: "/", icon: Squares2X2Icon },
  {
    labelKey: "navigation.writingStudio",
    to: "/drafting",
    icon: PencilSquareIcon,
  },
  { labelKey: "navigation.outlineBuilder", to: "/outline", icon: ListBulletIcon },
  {
    labelKey: "navigation.evidenceRegistry",
    to: "/evidence",
    icon: CircleStackIcon,
    children: [
      { labelKey: "navigation.qualityGates", to: "/verification?tab=gates", icon: ShieldCheckIcon },
    ],
  },
  { labelKey: "navigation.snapshotsShort", to: "/snapshots", icon: Squares2X2Icon },
];

const projectToolItems: NavItem[] = [
  { labelKey: "navigation.importProject", to: "/import", icon: ArrowUpTrayIcon },
  { labelKey: "navigation.exportDraft", to: "/export", icon: ArrowDownTrayIcon },
];
function isItemActive(to: string, pathname: string, searchParams: URLSearchParams) {
  const [path, query = ""] = to.split("?");
  if (path !== pathname) return false;

  const targetParams = new URLSearchParams(query);
  const targetTab = targetParams.get("tab");
  const targetMode = targetParams.get("mode");
  if (targetTab) return searchParams.get("tab") === targetTab;
  if (path === "/verification") return !searchParams.get("tab") || searchParams.get("tab") === "gates";
  if (targetMode) return searchParams.get("mode") === targetMode;
  if (path === "/snapshots") return searchParams.get("mode") !== "import";
  return true;
}

function withWorkspaceContext(to: string, projectId: string, snapshotId: string) {
  const [path, query = ""] = to.split("?");
  const params = new URLSearchParams(query);
  if (projectId) params.set("projectId", projectId);
  if (snapshotId) params.set("snapshotId", snapshotId);
  const serialized = params.toString();
  return serialized ? `${path}?${serialized}` : path;
}

function SidebarNavItem({
  item,
  nested = false,
  pathname,
  searchParams,
  projectId,
  snapshotId,
  onNavigate,
}: {
  item: NavItem;
  nested?: boolean;
  pathname: string;
  searchParams: URLSearchParams;
  projectId: string;
  snapshotId: string;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();

  const active = isItemActive(item.to, pathname, searchParams);
  const activeChild = item.children?.some((child) => isItemActive(child.to, pathname, searchParams)) ?? false;
  const [expanded, setExpanded] = useState(activeChild);

  useEffect(() => {
    if (activeChild) setExpanded(true);
  }, [activeChild]);

  const target = withWorkspaceContext(item.to, projectId, snapshotId);
  const Icon = item.icon;

  return (
    <div className={cn("slrw-nav-item", nested && "is-nested")}>
      <div className="slrw-nav-item-row">
        <Link
          to={target}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          className={cn("slrw-nav-link", nested && "slrw-nav-child-link", active && "is-active")}
        >
          <Icon className="size-[18px]" aria-hidden="true" />
          <span>{t(item.labelKey)}</span>
        </Link>
        {item.children && (
          <button
            type="button"
            className="slrw-nav-disclosure"
            aria-label={t("navigation.toggleSubmenu", { item: t(item.labelKey) })}
            aria-expanded={expanded}
            onClick={() => setExpanded((open) => !open)}
          >
            <ChevronDownIcon className={cn("size-4", expanded && "is-expanded")} aria-hidden="true" />
          </button>
        )}
      </div>
      {item.children && expanded && (
        <div className="slrw-nav-children">
          {item.children.map((child) => (
            <SidebarNavItem
              key={child.to}
              item={child}
              nested
              pathname={pathname}
              searchParams={searchParams}
              projectId={projectId}
              snapshotId={snapshotId}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
function getPageTitleKey(pathname: string): string {
  if (pathname === "/") return "navigation.overview";
  if (pathname.startsWith("/projects")) return "navigation.projects";
  if (pathname === "/import") return "navigation.importProject";
  if (pathname.startsWith("/methods")) return "navigation.methods";
  if (pathname.startsWith("/journal-profiles")) return "navigation.journalProfiles";
  if (pathname.startsWith("/outline")) return "navigation.outlineBuilder";
  if (pathname.startsWith("/paragraph-plans")) return "navigation.writingStudio";
  if (pathname.startsWith("/drafting")) return "navigation.writingStudio";
  if (pathname.startsWith("/evidence")) return "navigation.evidenceRegistry";
  if (pathname.startsWith("/verification")) return "navigation.verification";
  if (pathname.startsWith("/export")) return "navigation.export";
  return "common.workspace";
}

function SidebarNavigation({
  onNavigate,
  selectedProjectId,
  selectedSnapshotId,
}: {
  onNavigate?: () => void;
  selectedProjectId: string;
  selectedSnapshotId: string;
}) {
  const { t } = useTranslation();

  const [searchParams] = useSearchParams();
  const { pathname } = useLocation();

  return (
    <div className="slrw-sidebar">
      <Link to="/" className="slrw-brand" onClick={onNavigate} aria-label={t("navigation.overview")}>
        <span className="slrw-brand-mark" aria-hidden="true">
          <RectangleStackIcon />
        </span>
        <span className="slrw-brand-copy">
          <span className="slrw-brand-name">SLR AI Writing</span>
          <span className="slrw-brand-caption">RESEARCH WORKSPACE</span>
        </span>
      </Link>

      <nav aria-label={t("navigation.main")} className="slrw-side-nav">
        <section className="slrw-nav-group" aria-label={t("navigation.workspace")}>
          <h2 className="slrw-nav-heading">{t("navigation.workspace")}</h2>
          <div className="slrw-nav-items">
            {workspaceItems.map((item) => (
              <SidebarNavItem
                key={item.to}
                item={item}
                pathname={pathname}
                searchParams={searchParams}
                projectId={selectedProjectId}
                snapshotId={selectedSnapshotId}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </section>
        <section className="slrw-nav-group slrw-project-tools" aria-label={t("navigation.projectTools")}>
          <h2 className="slrw-nav-heading">{t("navigation.projectTools")}</h2>
          <div className="slrw-nav-items">
            {projectToolItems.map((item) => (
              <SidebarNavItem
                key={item.to}
                item={item}
                pathname={pathname}
                searchParams={searchParams}
                projectId={selectedProjectId}
                snapshotId={selectedSnapshotId}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </section>
      </nav>

    </div>
  );
}

export function AppShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const outlet = useOutlet();
  const prefersReducedMotion = useReducedMotion();
  const { t } = useTranslation();

  const pageTitle = t(getPageTitleKey(pathname));
  const routeTab = pathname === "/verification" ? searchParams.get("tab") ?? "gates" : "";
  const routeMotionKey = `${pathname}:${routeTab}`;
  const { mode, user, signOut } = useAuth();
  const { projects, load: loadProjects } = useProjects();
  const selectedProjectId = searchParams.get("projectId") || (typeof window !== "undefined" ? localStorage.getItem("slrw_selected_project_id") : null) || "";
  const selectedSnapshotId = searchParams.get("snapshotId") || (typeof window !== "undefined" ? localStorage.getItem("slrw_selected_snapshot_id") : null) || "";
  const activeProject = projects.find((project) => project.id === selectedProjectId);
  const identity = user?.displayName || user?.email || user?.uid || "";
  const initials = identity.slice(0, 2).toUpperCase();

  useEffect(() => { void loadProjects(); }, [loadProjects, selectedProjectId]);

  const sidebarProps = {
    selectedProjectId,
    selectedSnapshotId,
  };

  return (
    <div className="slrw-app-shell">
      <a className="slrw-skip-link" href="#app-main">{t("navigation.skipToContent")}</a>
      <aside className="slrw-desktop-sidebar" aria-label={t("navigation.main")}>
        <SidebarNavigation {...sidebarProps} />
      </aside>

      <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <DialogContent className="slrw-mobile-sidebar-dialog left-0 top-0 h-full w-[min(19rem,88vw)] translate-x-0 translate-y-0 rounded-none border-0 p-0 sm:max-w-none">
          <DialogTitle className="sr-only">{t("navigation.mobileTitle")}</DialogTitle>

          <SidebarNavigation {...sidebarProps} onNavigate={() => setMobileMenuOpen(false)} />
        </DialogContent>
      </Dialog>

      <div className="slrw-main-column">
        <header className="slrw-topbar">
          <div className="slrw-topbar-leading">
            <button
              type="button"
              className="slrw-mobile-menu-button"
              aria-label={t("navigation.mobileMenu")}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(true)}
            >
              <Bars3Icon className="size-5" aria-hidden="true" />
            </button>
            <nav className="slrw-breadcrumbs" aria-label={t("navigation.breadcrumbs")}>
              <Link to="/">{t("navigation.workspace")}</Link>
              {!pathname.startsWith("/projects") && activeProject && (
                <>
                  <span aria-hidden="true">/</span>
                  <span className="slrw-breadcrumb-project" title={activeProject.name}>{activeProject.name}</span>
                </>
              )}
              <span aria-hidden="true">/</span>
              <span aria-current="page">{pageTitle}</span>
            </nav>
          </div>
          <div className="slrw-topbar-actions">
            <span className="slrw-workflow-status">
              <span className="slrw-status-dot" aria-hidden="true" />
              {t("navigation.workflowStatus")}
            </span>
            <LanguageSwitcher />
            {mode === "firebase" && user && (
              <div className="slrw-identity">
                <span className="slrw-avatar" aria-hidden="true">{initials}</span>
                <span className="slrw-identity-name" title={identity}>{identity}</span>
                <button type="button" className="slrw-sign-out" onClick={() => void signOut()}>
                  {t("auth.signOut")}
                </button>
              </div>
            )}
          </div>
        </header>

        <main id="app-main" className="slrw-page" tabIndex={-1}>
          <div className="slrw-page-inner">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={routeMotionKey}
                className="slrw-route-transition"
                initial={prefersReducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.16, ease: "easeOut" }}
              >
                {outlet}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
