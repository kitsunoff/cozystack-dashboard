import type { ComponentType } from "react";
import type { AppInstance } from "@/lib/k8s/types";

/** Props passed to all pluggable components */
export interface ResourceComponentProps {
  instance: AppInstance;
  plural: string;
  namespace: string;
}

/** Props for list-level components (multiple instances) */
export interface ListComponentProps {
  instances: AppInstance[];
  plural: string;
  namespace: string;
}

/** Tab definition for detail page */
export interface TabDef {
  key: string;
  label: string;
  component: ComponentType<ResourceComponentProps>;
}

/** Action definition for quick actions */
export interface ActionDef {
  key: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  /** href string or async function. Receives instance for detail, undefined for list. */
  action: string | ((props: { plural: string; namespace: string; instance?: AppInstance }) => void | Promise<void>);
  variant?: "default" | "destructive";
}

/** Column definition for instance table */
export interface ColumnDef {
  key: string;
  label: string;
  render: (instance: AppInstance) => React.ReactNode;
}

/** Status renderer — returns ReactNode for instance status display */
export type StatusRenderer = (instance: AppInstance) => React.ReactNode;

/** List section — custom component between table and events */
export interface ListSectionDef {
  key: string;
  label?: string;
  component: ComponentType<ListComponentProps>;
}
