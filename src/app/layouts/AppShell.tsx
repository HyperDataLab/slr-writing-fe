import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import {
  BookOpenIcon,
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

function SidebarNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const renderItem = (item: NavigationItem) => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.to}
        to={item.to}
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
            <span>{item.label}</span>
          </>
        )}
      </NavLink>
    );
  };

  return (
    <div className="flex h-full flex-col bg-card">
      <Link to="/" className="flex items-center gap-3 px-6 py-6" onClick={onNavigate}>
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
          <BookOpenIcon className="size-5" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold tracking-tight text-foreground">
            SLR AI Writing
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">Research workspace</span>
        </span>
      </Link>

      <Separator />

      <nav aria-label="Điều hướng chính" className="flex-1 space-y-7 overflow-y-auto px-4 py-6">
        <div>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Workspace
          </p>
          <div className="space-y-1">{workspaceNavigation.map(renderItem)}</div>
        </div>

        <div>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Writing workflow
          </p>
          <div className="space-y-1">{workflowNavigation.map(renderItem)}</div>
        </div>
      </nav>

      <div className="p-4">
        <div className="rounded-xl border border-primary/15 bg-secondary/70 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ShieldCheckIcon className="size-4 text-primary" aria-hidden="true" />
            Evidence-first writing
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Drafts stay traceable to reviewed findings and source evidence.
          </p>
        </div>
      </div>
    </div>
  );
}

function getPageTitle(pathname: string): string {
  if (pathname === "/") return "Tổng quan";
  if (pathname.startsWith("/projects")) return "Projects";
  if (pathname.startsWith("/snapshots")) return "Snapshot & readiness";
  return "Workspace";
}

export function AppShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const pageTitle = getPageTitle(pathname);

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-card lg:block">
        <SidebarNavigation />
      </aside>

      <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <DialogContent className="left-0 top-0 h-full w-[min(19rem,86vw)] translate-x-0 translate-y-0 rounded-none border-y-0 border-l-0 p-0 sm:max-w-none">
          <DialogTitle className="sr-only">Điều hướng SLR AI Writing</DialogTitle>
          <SidebarNavigation onNavigate={() => setMobileMenuOpen(false)} />
        </DialogContent>
      </Dialog>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="inline-flex size-10 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
              aria-label="Mở điều hướng"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(true)}
            >
              <Bars3Icon className="size-5" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-muted-foreground">SLR AI Writing</p>
              <h1 className="truncate text-sm font-semibold text-foreground">{pageTitle}</h1>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-xs font-medium text-muted-foreground sm:flex">
            <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
            Evidence-linked workflow
          </div>
        </header>

        <main className="mx-auto w-full max-w-screen-2xl px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

