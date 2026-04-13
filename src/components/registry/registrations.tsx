/**
 * Side-effect import — registers all pluggable components.
 * Import this file once in the app to activate all registrations.
 */

import type { ComponentType } from "react";
import { registerDetailTabs, registerDetailActions, registerColumns, registerStatusRenderer } from "./index";
import type { ResourceComponentProps, ColumnDef } from "./types";
import type { AppInstance } from "@/lib/k8s/types";
import { k8sPatch, k8sGet } from "@/lib/k8s/client";
import { endpoints } from "@/lib/k8s/endpoints";
import { Power, PowerOff, RotateCw, Download } from "lucide-react";
import { LiveAge } from "@/components/ui/live-age";

// --- Helpers ---

const asTab = (C: ComponentType<{ instance: AppInstance }>) =>
  C as ComponentType<ResourceComponentProps>;

function StatusDot({ color, pulse }: { color: string; pulse?: boolean }) {
  return <span className={`h-2 w-2 rounded-full ${color} ${pulse ? "animate-pulse" : ""}`} />;
}

function StatusLabel({ color, children }: { color: string; children: string }) {
  return <span className={`text-sm ${color}`}>{children}</span>;
}

function StatusRow({ dotColor, textColor, label, pulse }: { dotColor: string; textColor: string; label: string; pulse?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <StatusDot color={dotColor} pulse={pulse} />
      <StatusLabel color={textColor}>{label}</StatusLabel>
    </div>
  );
}

// --- Status renderers ---

function defaultStatus(i: AppInstance) {
  if (i.metadata.deletionTimestamp) {
    return <StatusRow dotColor="bg-red-500" textColor="text-red-700 dark:text-red-400" label="Deleting" pulse />;
  }
  const ready = i.status?.conditions?.find((c) => c.type === "Ready");
  if (!ready) {
    return <span className="inline-flex items-center rounded-4xl bg-secondary text-secondary-foreground px-2 py-0.5 text-xs font-medium">Unknown</span>;
  }
  return ready.status === "True"
    ? <StatusRow dotColor="bg-emerald-500" textColor="text-emerald-700 dark:text-emerald-400" label="Ready" />
    : <StatusRow dotColor="bg-amber-500" textColor="text-amber-700 dark:text-amber-400" label="Not Ready" />;
}

function vmStatus(i: AppInstance) {
  if (i.metadata.deletionTimestamp) {
    return <StatusRow dotColor="bg-red-500" textColor="text-red-700 dark:text-red-400" label="Deleting" pulse />;
  }
  const ready = i.status?.conditions?.find((c) => c.type === "Ready");
  const strategy = i.spec.runStrategy as string | undefined;

  if (strategy === "Halted") {
    return <StatusRow dotColor="bg-gray-400" textColor="text-muted-foreground" label="Stopped" />;
  }
  if (ready?.status === "True") {
    return <StatusRow dotColor="bg-emerald-500" textColor="text-emerald-700 dark:text-emerald-400" label="Running" />;
  }
  if (ready?.reason === "UpgradeSucceeded" || ready?.reason === "InstallSucceeded") {
    return <StatusRow dotColor="bg-blue-500" textColor="text-blue-700 dark:text-blue-400" label="Starting" pulse />;
  }
  return <StatusRow dotColor="bg-amber-500" textColor="text-amber-700 dark:text-amber-400" label={ready?.reason ?? "Not Ready"} />;
}

// --- Common column fragments ---

const ageColumn: ColumnDef = {
  key: "age",
  label: "Age",
  render: (i) => <LiveAge timestamp={i.metadata.creationTimestamp} className="text-sm text-muted-foreground" />,
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
  { key: "version", label: "Version", render: (i) => (
    <span className="inline-flex items-center rounded-4xl bg-secondary text-secondary-foreground px-2 py-0.5 text-xs font-medium font-mono">
      {String(i.spec.version ?? "—")}
    </span>
  )},
  { key: "cp", label: "Control Plane", render: (i) => {
    const cp = i.spec.controlPlane as { replicas?: number } | undefined;
    return <span className="text-sm tabular-nums">{cp?.replicas ?? "—"} replicas</span>;
  }},
  { key: "nodes", label: "Node Groups", render: (i) => {
    const ng = i.spec.nodeGroups as Record<string, unknown> | undefined;
    return <span className="text-sm tabular-nums">{ng ? `${Object.keys(ng).length} groups` : "—"}</span>;
  }},
  ageColumn,
]);

// --- Columns: VM Instance ---

registerColumns("vminstances", [
  { key: "status", label: "Status", render: vmStatus },
  { key: "profile", label: "OS", render: (i) => (
    <span className="inline-flex items-center rounded-4xl bg-secondary text-secondary-foreground px-2 py-0.5 text-xs font-medium">
      {String(i.spec.instanceProfile ?? "—")}
    </span>
  )},
  { key: "type", label: "Type", render: (i) => <span className="text-sm font-mono">{String(i.spec.instanceType ?? "—")}</span> },
  { key: "strategy", label: "Strategy", render: (i) => <span className="text-sm text-muted-foreground">{String(i.spec.runStrategy ?? "—")}</span> },
  ageColumn,
]);

// --- Columns: VM Disk ---

registerColumns("vmdisks", [
  { key: "status", label: "Status", render: defaultStatus },
  { key: "source", label: "Source", render: (i) => {
    const src = i.spec.source as { image?: { name: string }; http?: { url: string } } | undefined;
    if (src?.image) return (
      <span className="inline-flex items-center rounded-4xl bg-secondary text-secondary-foreground px-2 py-0.5 text-xs font-medium">
        {src.image.name}
      </span>
    );
    if (src?.http) return <span className="text-sm font-mono">{src.http.url}</span>;
    return <span className="text-sm text-muted-foreground">empty</span>;
  }},
  { key: "storage", label: "Size", render: (i) => <span className="text-sm tabular-nums">{String(i.spec.storage ?? "—")}</span> },
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

// --- Kubernetes actions ---

registerDetailActions("kuberneteses", [
  {
    key: "download-kubeconfig",
    label: "Kubeconfig",
    icon: Download,
    action: async ({ namespace, instance }) => {
      if (!instance) return;
      const secretName = `kubernetes-${instance.metadata.name}-admin-kubeconfig`;
      const secret = await k8sGet<{
        data: Record<string, string>;
      }>(`/api/v1/namespaces/${namespace}/secrets/${secretName}`);

      const kubeconfig = secret.data["admin.conf"];
      if (!kubeconfig) throw new Error("admin.conf not found in secret");

      // Decode base64 and trigger download
      const decoded = atob(kubeconfig);
      const blob = new Blob([decoded], { type: "application/yaml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${instance.metadata.name}-kubeconfig.yaml`;
      a.click();
      URL.revokeObjectURL(url);
    },
  },
]);
