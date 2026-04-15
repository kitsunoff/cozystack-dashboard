// Common Kubernetes types

export interface ObjectMeta {
  name: string;
  namespace?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  creationTimestamp?: string;
  deletionTimestamp?: string;
  uid?: string;
  resourceVersion?: string;
  ownerReferences?: OwnerReference[];
}

export interface OwnerReference {
  apiVersion: string;
  kind: string;
  name: string;
  uid: string;
}

export interface Condition {
  type: string;
  status: "True" | "False" | "Unknown";
  reason?: string;
  message?: string;
  lastTransitionTime?: string;
}

export interface CommonStatus {
  observedGeneration?: number;
  conditions?: Condition[];
}

// Core Kubernetes Event
export interface K8sEvent {
  apiVersion: string;
  kind: "Event";
  metadata: ObjectMeta;
  involvedObject: {
    apiVersion?: string;
    kind: string;
    name: string;
    namespace?: string;
    uid?: string;
    fieldPath?: string;
  };
  reason: string;
  message: string;
  source?: {
    component?: string;
    host?: string;
  };
  type: "Normal" | "Warning";
  firstTimestamp?: string;
  lastTimestamp?: string;
  count?: number;
  eventTime?: string;
}

// dashboard.cozystack.io/v1alpha1

export interface MarketplacePanel {
  apiVersion: string;
  kind: "MarketplacePanel";
  metadata: ObjectMeta;
  spec: MarketplacePanelSpec;
  status?: CommonStatus;
}

export interface MarketplacePanelSpec {
  name: string;
  description: string;
  type: string;
  apiGroup: string;
  apiVersion: string;
  plural: string;
  disabled: boolean;
  hidden: boolean;
  tags: string[];
  icon: string;
}

export interface Factory {
  apiVersion: string;
  kind: "Factory";
  metadata: ObjectMeta;
  spec: FactorySpec;
  status?: CommonStatus;
}

export interface FactorySpec {
  key: string;
  id: string;
  sidebarTags?: string[];
  withScrollableMainContentCard?: boolean;
  urlsToFetch?: FactoryUrlToFetch[];
  data: FactoryDataItem[];
}

export interface FactoryUrlToFetch {
  url: string;
  method?: string;
}

export interface FactoryDataItem {
  type: string;
  data: Record<string, unknown>;
}

export interface CustomFormsOverride {
  apiVersion: string;
  kind: "CustomFormsOverride";
  metadata: ObjectMeta;
  spec: CustomFormsOverrideSpec;
  status?: CommonStatus;
}

export interface CustomFormsOverrideSpec {
  customizationId: string;
  hidden?: string[][];
  sort?: string[][];
  schema?: Record<string, unknown>;
  strategy?: "merge" | "replace";
}

export interface CustomFormsPrefill {
  apiVersion: string;
  kind: "CustomFormsPrefill";
  metadata: ObjectMeta;
  spec: CustomFormsPrefillSpec;
  status?: CommonStatus;
}

export interface CustomFormsPrefillSpec {
  customizationId: string;
  values?: PrefillValue[];
}

export interface PrefillValue {
  path: string[];
  value: unknown;
}

export interface CFOMapping {
  apiVersion: string;
  kind: "CFOMapping";
  metadata: ObjectMeta;
  spec: CFOMappingSpec;
  status?: CommonStatus;
}

export interface CFOMappingSpec {
  mappings?: Record<string, string>;
}

export interface CustomColumnsOverride {
  apiVersion: string;
  kind: "CustomColumnsOverride";
  metadata: ObjectMeta;
  spec: CustomColumnsOverrideSpec;
  status?: CommonStatus;
}

// dashboard.cozystack.io/v1alpha1 DashboardForm
export interface DashboardForm {
  apiVersion: string;
  kind: "DashboardForm";
  metadata: ObjectMeta;
  spec: DashboardFormSpec;
}

export interface DashboardFormSpec {
  target: {
    plural: string;
    apiGroup?: string;
  };
  sections: DashboardFormSection[];
  hideAdvanced?: boolean;
}

export interface DashboardFormSection {
  id: string;
  title: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  showIf?: { path: string; value: unknown };
  blocks: DashboardFormBlock[];
}

export type DashboardFormBlock = string | DashboardFormBlockFull;

export interface DashboardFormBlockFull {
  block: string;
  path?: string;
  title?: string;
  fieldMap?: Record<string, string>;
  showIf?: { path: string; value: unknown };
  hidden?: boolean;
  readOnly?: boolean;
  /** Arbitrary block-specific configuration */
  props?: Record<string, unknown>;
}

export interface CustomColumnsOverrideSpec {
  customizationId: string;
  columns?: ColumnDefinition[];
}

export interface ColumnDefinition {
  title: string;
  path: string[];
  type?: string;
  width?: number;
}

// cozystack.io/v1alpha1

export interface ApplicationDefinition {
  apiVersion: string;
  kind: "ApplicationDefinition";
  metadata: ObjectMeta;
  spec: {
    application: {
      kind: string;
      plural: string;
      openAPISchema?: string;
    };
    dashboard?: {
      category?: string;
      singular?: string;
      plural?: string;
      description?: string;
      icon?: string;
      tags?: string[];
      module?: boolean;
      name?: string;
      keysOrder?: string[][];
    };
    release?: {
      prefix?: string;
    };
  };
}

// Cluster API MachineDeployment
export interface MachineDeployment {
  apiVersion: string;
  kind: "MachineDeployment";
  metadata: ObjectMeta;
  status?: {
    replicas?: number;
    readyReplicas?: number;
    availableReplicas?: number;
    unavailableReplicas?: number;
    phase?: string;
  };
}

// Core Kubernetes Secret
export interface K8sSecret {
  apiVersion: string;
  kind: "Secret";
  metadata: ObjectMeta;
  type?: string;
  data?: Record<string, string>;
}

// Generic app instance (apps.cozystack.io/v1alpha1)

export interface AppInstance {
  apiVersion: string;
  kind: string;
  metadata: ObjectMeta;
  spec: Record<string, unknown>;
  status?: CommonStatus;
}
