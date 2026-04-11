"use client";

import { useQuery } from "@tanstack/react-query";
import { k8sList, k8sGet, k8sCreate } from "./client";
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
  return useQuery({
    queryKey: ["instances", plural, namespace],
    queryFn: () =>
      k8sList<AppInstance>(endpoints.instances(plural, namespace)),
    enabled: !!plural && !!namespace,
  });
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

interface SelfSubjectRulesReviewResponse {
  status: {
    resourceRules: Array<{
      verbs: string[];
      apiGroups: string[];
      resources: string[];
    }>;
  };
}

function verbsToOpType(verbs: string[]): OpType {
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

function parseRulesReview(
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

// --- K8s Events ---

export function useEvents(namespace: string, name?: string) {
  const fieldParts: string[] = [];
  if (name) fieldParts.push(`involvedObject.name=${name}`);

  const fieldSelector = fieldParts.length > 0 ? fieldParts.join(",") : undefined;

  return useQuery({
    queryKey: ["events", namespace, name ?? ""],
    queryFn: () =>
      k8sList<K8sEvent>(endpoints.events(namespace), { fieldSelector }),
    enabled: !!namespace,
    select: (data) =>
      data.items.sort((a, b) => {
        const ta = a.lastTimestamp || a.eventTime || a.metadata.creationTimestamp || "";
        const tb = b.lastTimestamp || b.eventTime || b.metadata.creationTimestamp || "";
        return tb.localeCompare(ta); // newest first
      }),
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
