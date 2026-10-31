import type { ComponentType, SVGProps } from "react";
import {
  ArrowUpTrayIcon,
  FolderIcon,
  HomeIcon,
} from "@heroicons/react/24/outline";

export interface NavigationItem {
  label: string;
  to: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export const workspaceNavigation: NavigationItem[] = [
  { label: "Tổng quan", to: "/", icon: HomeIcon },
  { label: "Projects", to: "/projects", icon: FolderIcon },
];

export const workflowNavigation: NavigationItem[] = [
  { label: "Snapshot & readiness", to: "/snapshots", icon: ArrowUpTrayIcon },
];

