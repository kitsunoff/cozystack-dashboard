// Dashboard CRDs (cluster-scoped)
const DASHBOARD_GROUP = "dashboard.cozystack.io";
const DASHBOARD_VERSION = "v1alpha1";
const DASHBOARD_BASE = `/apis/${DASHBOARD_GROUP}/${DASHBOARD_VERSION}`;

// Application CRDs
const APPS_GROUP = "apps.cozystack.io";
const APPS_VERSION = "v1alpha1";
const APPS_BASE = `/apis/${APPS_GROUP}/${APPS_VERSION}`;

// Cozystack definitions
const COZYSTACK_GROUP = "cozystack.io";
const COZYSTACK_VERSION = "v1alpha1";
const COZYSTACK_BASE = `/apis/${COZYSTACK_GROUP}/${COZYSTACK_VERSION}`;

export const endpoints = {
  // Dashboard resources (cluster-scoped)
  marketplacePanels: () => `${DASHBOARD_BASE}/marketplacepanels`,
  factories: () => `${DASHBOARD_BASE}/factories`,
  factory: (name: string) => `${DASHBOARD_BASE}/factories/${name}`,
  customFormsOverrides: () => `${DASHBOARD_BASE}/customformsoverrides`,
  customFormsPrefills: () => `${DASHBOARD_BASE}/customformsprefills`,
  cfoMapping: () => `${DASHBOARD_BASE}/cfomappings/cfomapping`,
  customColumnsOverrides: () => `${DASHBOARD_BASE}/customcolumnsoverrides`,
  dashboardForms: () => `${DASHBOARD_BASE}/dashboardforms`,

  // Application instances (namespaced)
  instances: (plural: string, namespace: string) =>
    `${APPS_BASE}/namespaces/${namespace}/${plural}`,
  instance: (plural: string, namespace: string, name: string) =>
    `${APPS_BASE}/namespaces/${namespace}/${plural}/${name}`,

  // Application definitions (cluster-scoped)
  applicationDefinitions: () =>
    `${COZYSTACK_BASE}/applicationdefinitions`,
  applicationDefinition: (name: string) =>
    `${COZYSTACK_BASE}/applicationdefinitions/${name}`,

  // Generic namespaced resource
  namespacedResource: (
    apiGroup: string,
    apiVersion: string,
    namespace: string,
    plural: string
  ) => `/apis/${apiGroup}/${apiVersion}/namespaces/${namespace}/${plural}`,

  // Generic cluster-scoped resource
  clusterResource: (
    apiGroup: string,
    apiVersion: string,
    plural: string
  ) => `/apis/${apiGroup}/${apiVersion}/${plural}`,

  // Core API resources
  namespaces: () => "/api/v1/namespaces",
  events: (namespace: string) => `/api/v1/namespaces/${namespace}/events`,

  // Secrets
  secrets: (namespace: string) => `/api/v1/namespaces/${namespace}/secrets`,

  // Storage
  storageClasses: () => "/apis/storage.k8s.io/v1/storageclasses",

  // Cluster API resources
  machineDeployments: (namespace: string) =>
    `/apis/cluster.x-k8s.io/v1beta1/namespaces/${namespace}/machinedeployments`,
} as const;
