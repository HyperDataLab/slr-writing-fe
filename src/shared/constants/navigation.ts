import type { ComponentType, SVGProps } from "react";
import {
  ArrowUpTrayIcon,
  BookOpenIcon,
  DocumentTextIcon,
  FolderIcon,
  HomeIcon,
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
  { labelKey: "navigation.methods", to: "/methods", icon: DocumentTextIcon },
  { labelKey: "navigation.journalProfiles", to: "/journal-profiles", icon: BookOpenIcon },
];

