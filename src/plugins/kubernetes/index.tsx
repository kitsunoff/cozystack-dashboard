/**
 * Kubernetes plugin — tabs, columns, kubeconfig download.
 */

import { registerDetailTabs, registerDetailActions, registerColumns } from "@/components/registry";
import { k8sGet } from "@/lib/k8s/client";
import { Download } from "lucide-react";
import { asTab, defaultStatus, ageColumn } from "../helpers";
import { registerCustomForm } from "@/components/form/registry";

// Tabs
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

// Columns
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

// Actions
registerDetailActions("kuberneteses", [
  {
    key: "download-kubeconfig",
    label: "Kubeconfig",
    icon: Download,
    action: async ({ namespace, instance }) => {
      if (!instance) return;
      const secretName = `kubernetes-${instance.metadata.name}-admin-kubeconfig`;
      const secret = await k8sGet<{ data: Record<string, string> }>(
        `/api/v1/namespaces/${namespace}/secrets/${secretName}`
      );
      const kubeconfig = secret.data["admin.conf"];
      if (!kubeconfig) throw new Error("admin.conf not found in secret");
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

// Custom form
import { KubernetesForm } from "@/components/form/custom/kubernetes-form";
registerCustomForm("kuberneteses", KubernetesForm);
