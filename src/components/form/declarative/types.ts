import type { ComponentType } from "react";

// Re-export CRD types from canonical location
export type {
  DashboardFormSpec,
  DashboardFormSection as SectionSpec,
  DashboardFormBlock as BlockEntry,
  DashboardFormBlockFull as BlockEntryFull,
} from "@/lib/k8s/types";

/** Props for block components in the block registry */
export interface BlockComponentProps {
  schema: Record<string, unknown>;
  basePath?: string[];
  title?: string;
  fieldMap?: Record<string, string>;
  readOnly?: boolean;
  /** Arbitrary block-specific configuration from DashboardForm CRD */
  props?: Record<string, unknown>;
}

/** Block registry maps block ID → React component */
export type BlockComponent = ComponentType<BlockComponentProps>;
