import type { ComponentType, SVGProps } from "react";
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  BookOpenIcon,
  DocumentTextIcon,
  FolderIcon,
  HomeIcon,
  ListBulletIcon,
  PencilSquareIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

export interface NavigationItem {
  labelKey: string;
  to: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export const workspaceNavigation: NavigationItem[] = [
  { labelKey: "navigation.overview", to: "/", icon: HomeIcon },
  { labelKey: "navigation.projects", to: "/projects", icon: FolderIcon },
];

export const workflowNavigation: NavigationItem[] = [
  { labelKey: "navigation.snapshots", to: "/snapshots", icon: ArrowUpTrayIcon },
  { labelKey: "navigation.journalProfiles", to: "/journal-profiles", icon: BookOpenIcon },
  { labelKey: "navigation.methods", to: "/methods", icon: DocumentTextIcon },
  { labelKey: "navigation.outline", to: "/outline", icon: ListBulletIcon },
  { labelKey: "navigation.drafting", to: "/drafting", icon: PencilSquareIcon },
  { labelKey: "navigation.verification", to: "/verification", icon: ShieldCheckIcon },
  { labelKey: "navigation.export", to: "/export", icon: ArrowDownTrayIcon },
];
