import type { ReactNode } from "react";
import type { AppInstance } from "@/lib/k8s/types";

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  group?: string;
  keywords?: string[];
  drilldown?: boolean;
  onSelect: () => void;
}

export type NavigationLevel =
  | { type: "root" }
  | { type: "resource"; plural: string; label: string; icon?: string }
  | { type: "instance"; plural: string; instance: AppInstance; label: string; resourceLabel: string; icon?: string };
