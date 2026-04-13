"use client";

import { useQuery } from "@tanstack/react-query";
import { k8sList, k8sGet, k8sCreate, k8sBatch } from "./client";
import { useK8sWatch } from "./watch";
import { endpoints } from "./endpoints";
import type {
  MarketplacePanel,
  Factory,
  CustomFormsOverride,
  CustomFormsPrefill,
  CFOMapping,
  CustomColumnsOverride,
  ApplicationDefinition,
  AppInstance,
  K8sEvent,
  MachineDeployment,
} from "./types";

export function useMarketplacePanels() {
  return useQuery({
    queryKey: ["marketplacePanels"],
    queryFn: () => k8sList<MarketplacePanel>(endpoints.marketplacePanels()),
    select: (data) =>
      data.items.filter((mp) => !mp.spec.disabled && !mp.spec.hidden),
  });
}

export function useInstances(plural: string, namespace: string) {
  const query = useQuery({
    queryKey: ["instances", plural, namespace],
    queryFn: () =>
      k8sList<AppInstance>(endpoints.instances(plural, namespace)),
    enabled: !!plural && !!namespace,
  });

  // Subscribe to watch events for real-time updates
  useK8sWatch(
    endpoints.instances(plural, namespace),
    ["instances", plural, namespace],
    query.data?.metadata.resourceVersion,
    !!plural && !!namespace && !!query.data
  );

  return query;
}

export interface ServiceInstances {
  panel: MarketplacePanel;
  instances: AppInstance[];
}

export function useAllInstances(namespace: string, panels?: MarketplacePanel[]) {
  const plurals = panels?.map((p) => p.spec.plural) ?? [];

  const { data: batchResult, isLoading } = useQuery({
    queryKey: ["allInstances", namespace, plurals.join(",")],
    queryFn: async () => {
      const paths = plurals.map((p) => endpoints.instances(p, namespace));
      return k8sBatch<AppInstance>(paths);
    },
    enabled: !!namespace && plurals.length > 0,
  });

  const data: ServiceInstances[] = [];
  if (panels && batchResult) {
    for (const panel of panels) {
      const path = endpoints.instances(panel.spec.plural, namespace);
      const list = batchResult.get(path);
      if (list && list.items.length > 0) {
        data.push({ panel, instances: list.items });
      }
    }
  }

  return { data, isLoading };
}

export function useInstance(
  plural: string,
  namespace: string,
  name: string
) {
  return useQuery({
    queryKey: ["instance", plural, namespace, name],
    queryFn: () =>
      k8sGet<AppInstance>(endpoints.instance(plural, namespace, name)),
    enabled: !!plural && !!namespace && !!name,
  });
}

export function useApplicationDefinitions() {
  return useQuery({
    queryKey: ["applicationDefinitions"],
    queryFn: () =>
      k8sList<ApplicationDefinition>(endpoints.applicationDefinitions()),
  });
}

export function useApplicationDefinition(name: string) {
  return useQuery({
    queryKey: ["applicationDefinition", name],
    queryFn: () =>
      k8sGet<ApplicationDefinition>(endpoints.applicationDefinition(name)),
    enabled: !!name,
  });
}

export function useCustomFormsOverrides() {
  return useQuery({
    queryKey: ["customFormsOverrides"],
    queryFn: () =>
      k8sList<CustomFormsOverride>(endpoints.customFormsOverrides()),
  });
}

export function useCustomFormsPrefills() {
  return useQuery({
    queryKey: ["customFormsPrefills"],
    queryFn: () =>
      k8sList<CustomFormsPrefill>(endpoints.customFormsPrefills()),
  });
}

export function useCFOMapping() {
  return useQuery({
    queryKey: ["cfoMapping"],
    queryFn: () => k8sGet<CFOMapping>(endpoints.cfoMapping()),
  });
}

export function useFactories() {
  return useQuery({
    queryKey: ["factories"],
    queryFn: () => k8sList<Factory>(endpoints.factories()),
  });
}

export function useFactory(name: string) {
  return useQuery({
    queryKey: ["factory", name],
    queryFn: () => k8sGet<Factory>(endpoints.factory(name)),
    enabled: !!name,
  });
}

export function useCustomColumnsOverrides() {
  return useQuery({
    queryKey: ["customColumnsOverrides"],
    queryFn: () =>
      k8sList<CustomColumnsOverride>(endpoints.customColumnsOverrides()),
  });
}

export function useNamespaces() {
  return useQuery({
    queryKey: ["namespaces"],
    queryFn: async () => {
      const data = await k8sList<{
        metadata: { name: string };
      }>(endpoints.namespaces());
      return data.items
        .map((ns) => ns.metadata.name)
        .filter((name) => name.startsWith("tenant-"));
    },
  });
}

export interface NamespaceInfo {
  name: string;
  status: string;
  labels: Record<string, string>;
  creationTimestamp: string;
}

export function filterTenantNamespaces(
  namespaces: NamespaceInfo[]
): NamespaceInfo[] {
  return namespaces.filter((ns) => ns.name.startsWith("tenant-"));
}

export function useNamespaceDetails() {
  return useQuery({
    queryKey: ["namespaceDetails"],
    queryFn: async () => {
      const data = await k8sList<{
        metadata: {
          name: string;
          labels?: Record<string, string>;
          creationTimestamp?: string;
        };
        status?: { phase?: string };
      }>(endpoints.namespaces());
      return data.items.map(
        (ns): NamespaceInfo => ({
          name: ns.metadata.name,
          status: ns.status?.phase || "Active",
          labels: ns.metadata.labels || {},
          creationTimestamp: ns.metadata.creationTimestamp || "",
        })
      );
    },
  });
}

// --- RBAC: SelfSubjectRulesReview ---

export type OpType = "read" | "write" | "delete" | "*";

export interface ResourcePermission {
  resource: string;
  opType: OpType;
}

export interface TenantPermissions {
  wildcardOp: OpType | null;
  resources: ResourcePermission[];
}

export interface SelfSubjectRulesReviewResponse {
  status: {
    resourceRules: Array<{
      verbs: string[];
      apiGroups: string[];
      resources: string[];
    }>;
  };
}

export function verbsToOpType(verbs: string[]): OpType {
  if (verbs.includes("*")) return "*";
  if (verbs.includes("delete")) return "delete";
  if (verbs.some((v) => ["create", "update", "patch"].includes(v)))
    return "write";
  return "read";
}

const IGNORED_RESOURCES = new Set([
  "selfsubjectaccessreviews",
  "selfsubjectrulesreviews",
  "localsubjectaccessreviews",
  "tokenreviews",
  "subjectaccessreviews",
]);

const OP_PRIORITY: Record<OpType, number> = { read: 0, write: 1, delete: 2, "*": 3 };

function higherOp(a: OpType, b: OpType): OpType {
  return OP_PRIORITY[a] >= OP_PRIORITY[b] ? a : b;
}

export function parseRulesReview(
  response: SelfSubjectRulesReviewResponse
): TenantPermissions {
  const resourceMap = new Map<string, OpType>();
  let wildcardOp: OpType | null = null;

  for (const rule of response.status.resourceRules) {
    const opType = verbsToOpType(rule.verbs);
    for (const resource of rule.resources) {
      if (IGNORED_RESOURCES.has(resource)) continue;
      if (resource === "*") {
        wildcardOp = wildcardOp ? higherOp(wildcardOp, opType) : opType;
        continue;
      }
      const existing = resourceMap.get(resource);
      resourceMap.set(resource, existing ? higherOp(existing, opType) : opType);
    }
  }

  if (wildcardOp) {
    for (const [resource, existing] of resourceMap) {
      resourceMap.set(resource, higherOp(existing, wildcardOp));
    }
  }

  const resources = Array.from(resourceMap.entries())
    .map(([resource, opType]) => ({ resource, opType }))
    .sort((a, b) => a.resource.localeCompare(b.resource));

  return { wildcardOp, resources };
}

export function useTenantPermissions(namespace: string) {
  return useQuery({
    queryKey: ["tenantPermissions", namespace],
    queryFn: async () => {
      const review = await k8sCreate<SelfSubjectRulesReviewResponse>(
        "/apis/authorization.k8s.io/v1/selfsubjectrulesreviews",
        {
          apiVersion: "authorization.k8s.io/v1",
          kind: "SelfSubjectRulesReview",
          spec: { namespace },
        }
      );
      return parseRulesReview(review);
    },
    enabled: !!namespace,
    staleTime: 5 * 60_000,
  });
}

// --- Cluster API ---

/**
 * Fetch MachineDeployments for a Kubernetes cluster instance.
 * MachineDeployments are named {releasePrefix}{instanceName}-{nodeGroupName}.
 */
export function useMachineDeployments(
  namespace: string,
  releasePrefix: string,
  instanceName: string
) {
  const labelSelector = `cluster.x-k8s.io/cluster-name=${releasePrefix}${instanceName}`;

  return useQuery({
    queryKey: ["machineDeployments", namespace, releasePrefix, instanceName],
    queryFn: () =>
      k8sList<MachineDeployment>(endpoints.machineDeployments(namespace), { labelSelector }),
    enabled: !!namespace && !!instanceName,
    select: (data) => {
      // Build map: nodeGroupName → status
      const map = new Map<string, MachineDeployment["status"]>();
      const prefix = `${releasePrefix}${instanceName}-`;
      for (const md of data.items) {
        const ngName = md.metadata.name.startsWith(prefix)
          ? md.metadata.name.slice(prefix.length)
          : md.metadata.name;
        map.set(ngName, md.status);
      }
      return map;
    },
  });
}

// --- K8s Events ---

/**
 * Fetch events in a namespace, optionally filtered by instance names.
 *
 * @param namespace - K8s namespace
 * @param instanceNames - instance names to match events against
 * @param releasePrefix - Cozystack release prefix from ApplicationDefinition
 *   (e.g. "vm-instance-"). When set, events are matched by prefix:
 *   involvedObject.name starts with `${releasePrefix}${instanceName}`.
 *   When empty, events are matched by exact involvedObject.name.
 */
export function useEvents(
  namespace: string,
  instanceNames?: string[],
  releasePrefix?: string
) {
  return useQuery({
    queryKey: ["events", namespace],
    queryFn: () => k8sList<K8sEvent>(endpoints.events(namespace)),
    enabled: !!namespace,
    select: (data) => {
      let filtered = data.items;

      if (instanceNames) {
        if (instanceNames.length === 0) return [];

        if (releasePrefix) {
          // Prefix match: child resources named {prefix}{instanceName}-xxx
          const prefixes = instanceNames.map((n) => `${releasePrefix}${n}`);
          filtered = filtered.filter((e) =>
            prefixes.some((p) => e.involvedObject.name.startsWith(p))
          );
        } else {
          // Exact match fallback
          const nameSet = new Set(instanceNames);
          filtered = filtered.filter((e) => nameSet.has(e.involvedObject.name));
        }
      }

      // Deduplicate by involvedObject+reason — keep latest, sum counts
      // (message often contains timestamps that differ between duplicates)
      const deduped = new Map<string, K8sEvent>();
      for (const e of filtered) {
        const key = `${e.involvedObject.name}::${e.reason}`;
        const existing = deduped.get(key);
        if (existing) {
          const existingTs = existing.lastTimestamp || existing.eventTime || existing.metadata.creationTimestamp || "";
          const newTs = e.lastTimestamp || e.eventTime || e.metadata.creationTimestamp || "";
          if (newTs > existingTs) {
            deduped.set(key, {
              ...e,
              count: (existing.count ?? 1) + (e.count ?? 1),
            });
          } else {
            existing.count = (existing.count ?? 1) + (e.count ?? 1);
          }
        } else {
          deduped.set(key, { ...e });
        }
      }

      return Array.from(deduped.values())
        .sort((a, b) => {
          const ta = a.lastTimestamp || a.eventTime || a.metadata.creationTimestamp || "";
          const tb = b.lastTimestamp || b.eventTime || b.metadata.creationTimestamp || "";
          return tb.localeCompare(ta);
        })
        .slice(0, 30);
    },
  });
}

export function useK8sListForDropdown(
  uri: string,
  keysToValue: string[],
  keysToLabel: string[]
) {
  return useQuery({
    queryKey: ["k8sDropdown", uri],
    queryFn: async () => {
      const data = await k8sList<Record<string, unknown>>(uri);
      return data.items.map((item) => ({
        value: getNestedValue(item, keysToValue) as string,
        label: getNestedValue(item, keysToLabel) as string,
      }));
    },
    enabled: !!uri,
  });
}

function getNestedValue(obj: unknown, path: string[]): unknown {
  let current = obj;
  for (const key of path) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}
