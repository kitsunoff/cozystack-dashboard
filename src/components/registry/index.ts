import type { ComponentType } from "react";
import type { TabDef, ActionDef, ListSectionDef, ColumnDef, StatusRenderer, ResourceComponentProps } from "./types";

export type { TabDef, ActionDef, ListSectionDef, ColumnDef, StatusRenderer, ResourceComponentProps, ListComponentProps } from "./types";

// --- Detail Tabs ---

const tabRegistry = new Map<string, TabDef[]>();

export function registerDetailTabs(plural: string, tabs: TabDef[]): void {
  tabRegistry.set(plural, tabs);
}

export function getDetailTabs(plural: string): TabDef[] | undefined {
  return tabRegistry.get(plural);
}

// --- Detail Actions (per-instance) ---

const detailActionRegistry = new Map<string, ActionDef[]>();

export function registerDetailActions(plural: string, actions: ActionDef[]): void {
  detailActionRegistry.set(plural, actions);
}

export function getDetailActions(plural: string): ActionDef[] {
  return detailActionRegistry.get(plural) ?? [];
}

// --- List Quick Actions ---

const listActionRegistry = new Map<string, ActionDef[]>();

export function registerListActions(plural: string, actions: ActionDef[]): void {
  listActionRegistry.set(plural, actions);
}

export function getListActions(plural: string): ActionDef[] {
  return listActionRegistry.get(plural) ?? [];
}

// --- List Sections (between table and events) ---

const listSectionRegistry = new Map<string, ListSectionDef[]>();

export function registerListSections(plural: string, sections: ListSectionDef[]): void {
  listSectionRegistry.set(plural, sections);
}

export function getListSections(plural: string): ListSectionDef[] {
  return listSectionRegistry.get(plural) ?? [];
}

// --- Table Columns ---

const columnRegistry = new Map<string, ColumnDef[]>();

export function registerColumns(plural: string, columns: ColumnDef[]): void {
  columnRegistry.set(plural, columns);
}

export function getColumns(plural: string): ColumnDef[] | undefined {
  return columnRegistry.get(plural);
}

// --- Status Renderer ---

const statusRegistry = new Map<string, StatusRenderer>();

export function registerStatusRenderer(plural: string, renderer: StatusRenderer): void {
  statusRegistry.set(plural, renderer);
}

export function getStatusRenderer(plural: string): StatusRenderer | undefined {
  return statusRegistry.get(plural);
}

// --- Default tabs ---

import { OverviewTab } from "@/components/detail/tabs/overview-tab";
import { SecretsTab } from "@/components/detail/tabs/secrets-tab";
import { YamlTab } from "@/components/detail/tabs/yaml-tab";
import { WorkloadsTab } from "@/components/detail/tabs/workloads-tab";

const defaultOverviewTab: TabDef = {
  key: "overview",
  label: "Overview",
  component: OverviewTab as ComponentType<ResourceComponentProps>,
};

const defaultSecretsTab: TabDef = {
  key: "secrets",
  label: "Secrets",
  component: SecretsTab,
};

const defaultWorkloadsTab: TabDef = {
  key: "workloads",
  label: "Workloads",
  component: WorkloadsTab as ComponentType<ResourceComponentProps>,
};

const defaultYamlTab: TabDef = {
  key: "yaml",
  label: "YAML",
  component: YamlTab as ComponentType<ResourceComponentProps>,
};

/** Get tabs for a resource — registered or defaults */
export function resolveDetailTabs(plural: string): TabDef[] {
  return getDetailTabs(plural) ?? [defaultOverviewTab, defaultSecretsTab, defaultWorkloadsTab, defaultYamlTab];
}
