/**
 * Side-effect import — registers all pluggable components.
 * Import this file once in the app to activate all registrations.
 */

import React from "react";
import type { ComponentType } from "react";
import { registerDetailTabs, registerDetailActions, registerColumns, registerStatusRenderer } from "./index";
import type { ResourceComponentProps, ColumnDef } from "./types";
import type { AppInstance } from "@/lib/k8s/types";
import { k8sPatch } from "@/lib/k8s/client";
import { endpoints } from "@/lib/k8s/endpoints";
import { Power, PowerOff, RotateCw } from "lucide-react";
import { formatAge } from "@/lib/utils";

// --- Helpers ---

const asTab = (C: ComponentType<{ instance: AppInstance }>) =>
  C as ComponentType<ResourceComponentProps>;

function badge(text: string, variant: "secondary" | "outline" = "secondary", mono = false) {
  return React.createElement("span", {
    className: `inline-flex items-center rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium ${
      variant === "secondary"
        ? "bg-secondary text-secondary-foreground"
        : "border-border text-foreground"
    } ${mono ? "font-mono" : ""}`,
  }, text);
}

function muted(text: string) {
  return React.createElement("span", { className: "text-sm text-muted-foreground" }, text);
}

function mono(text: string) {
  return React.createElement("span", { className: "text-sm font-mono" }, text);
}

function tabular(text: string) {
  return React.createElement("span", { className: "text-sm tabular-nums" }, text);
}

// --- Status renderers ---

function defaultStatus(i: AppInstance) {
  const ready = i.status?.conditions?.find((c) => c.type === "Ready");
  if (!ready) return badge("Unknown", "secondary");
  return ready.status === "True"
    ? React.createElement("div", { className: "flex items-center gap-1.5" },
        React.createElement("span", { className: "h-2 w-2 rounded-full bg-emerald-500" }),
        React.createElement("span", { className: "text-sm text-emerald-700 dark:text-emerald-400" }, "Ready"))
    : React.createElement("div", { className: "flex items-center gap-1.5" },
        React.createElement("span", { className: "h-2 w-2 rounded-full bg-amber-500" }),
        React.createElement("span", { className: "text-sm text-amber-700 dark:text-amber-400" }, "Not Ready"));
}

function vmStatus(i: AppInstance) {
  const ready = i.status?.conditions?.find((c) => c.type === "Ready");
  const strategy = i.spec.runStrategy as string | undefined;

  if (strategy === "Halted") {
    return React.createElement("div", { className: "flex items-center gap-1.5" },
      React.createElement("span", { className: "h-2 w-2 rounded-full bg-gray-400" }),
      React.createElement("span", { className: "text-sm text-muted-foreground" }, "Stopped"));
  }
  if (ready?.status === "True") {
    return React.createElement("div", { className: "flex items-center gap-1.5" },
      React.createElement("span", { className: "h-2 w-2 rounded-full bg-emerald-500" }),
      React.createElement("span", { className: "text-sm text-emerald-700 dark:text-emerald-400" }, "Running"));
  }
  if (ready?.reason === "UpgradeSucceeded" || ready?.reason === "InstallSucceeded") {
    return React.createElement("div", { className: "flex items-center gap-1.5" },
      React.createElement("span", { className: "h-2 w-2 rounded-full bg-blue-500 animate-pulse" }),
      React.createElement("span", { className: "text-sm text-blue-700 dark:text-blue-400" }, "Starting"));
  }
  return React.createElement("div", { className: "flex items-center gap-1.5" },
    React.createElement("span", { className: "h-2 w-2 rounded-full bg-amber-500" }),
    React.createElement("span", { className: "text-sm text-amber-700 dark:text-amber-400" }, ready?.reason ?? "Not Ready"));
}

// --- Common column fragments ---

const ageColumn: ColumnDef = {
  key: "age",
  label: "Age",
  render: (i) => muted(formatAge(i.metadata.creationTimestamp)),
};

// --- K8s tabs ---

import { K8sOverviewTab } from "@/components/detail/tabs/k8s-overview-tab";
import { K8sControlPlaneTab } from "@/components/detail/tabs/k8s-control-plane-tab";
import { K8sNodeGroupsTab } from "@/components/detail/tabs/k8s-node-groups-tab";
import { K8sAddonsTab } from "@/components/detail/tabs/k8s-addons-tab";
import { YamlTab } from "@/components/detail/tabs/yaml-tab";

registerDetailTabs("kuberneteses", [
  { key: "overview", label: "Overview", component: asTab(K8sOverviewTab) },
  { key: "control-plane", label: "Control Plane", component: asTab(K8sControlPlaneTab) },
  { key: "node-groups", label: "Node Groups", component: asTab(K8sNodeGroupsTab) },
  { key: "addons", label: "Addons", component: asTab(K8sAddonsTab) },
  { key: "yaml", label: "YAML", component: asTab(YamlTab) },
]);

// --- Columns: Kubernetes ---

registerColumns("kuberneteses", [
  { key: "status", label: "Status", render: defaultStatus },
  { key: "version", label: "Version", render: (i) => badge(String(i.spec.version ?? "—"), "secondary", true) },
  { key: "cp", label: "Control Plane", render: (i) => {
    const cp = i.spec.controlPlane as { replicas?: number } | undefined;
    return tabular(`${cp?.replicas ?? "—"} replicas`);
  }},
  { key: "nodes", label: "Node Groups", render: (i) => {
    const ng = i.spec.nodeGroups as Record<string, { maxReplicas?: number }> | undefined;
    return tabular(ng ? `${Object.keys(ng).length} groups` : "—");
  }},
  ageColumn,
]);

// --- Columns: VM Instance ---

registerColumns("vminstances", [
  { key: "status", label: "Status", render: vmStatus },
  { key: "profile", label: "OS", render: (i) => badge(String(i.spec.instanceProfile ?? "—")) },
  { key: "type", label: "Type", render: (i) => mono(String(i.spec.instanceType ?? "—")) },
  { key: "strategy", label: "Strategy", render: (i) => muted(String(i.spec.runStrategy ?? "—")) },
  ageColumn,
]);

// --- Columns: VM Disk ---

registerColumns("vmdisks", [
  { key: "status", label: "Status", render: defaultStatus },
  { key: "source", label: "Source", render: (i) => {
    const src = i.spec.source as { image?: { name: string }; http?: { url: string } } | undefined;
    if (src?.image) return badge(src.image.name);
    if (src?.http) return mono(src.http.url);
    return muted("empty");
  }},
  { key: "storage", label: "Size", render: (i) => tabular(String(i.spec.storage ?? "—")) },
  ageColumn,
]);

// --- Status renderers ---

registerStatusRenderer("vminstances", vmStatus);

// --- VM Instance actions ---

function vmPatchRunStrategy(strategy: string) {
  return async ({ plural, namespace, instance }: {
    plural: string;
    namespace: string;
    instance?: AppInstance;
  }) => {
    if (!instance) return;
    await k8sPatch(
      endpoints.instance(plural, namespace, instance.metadata.name),
      { spec: { runStrategy: strategy } }
    );
  };
}

registerDetailActions("vminstances", [
  { key: "start", label: "Start", icon: Power, action: vmPatchRunStrategy("Always") },
  { key: "stop", label: "Stop", icon: PowerOff, action: vmPatchRunStrategy("Halted") },
  {
    key: "restart",
    label: "Restart",
    icon: RotateCw,
    action: async ({ plural, namespace, instance }) => {
      if (!instance) return;
      const path = endpoints.instance(plural, namespace, instance.metadata.name);
      await k8sPatch(path, { spec: { runStrategy: "Halted" } });
      await new Promise((r) => setTimeout(r, 2000));
      await k8sPatch(path, { spec: { runStrategy: "Always" } });
    },
  },
]);
