/**
 * Side-effect import — registers all pluggable components.
 * Import this file once in the app to activate all registrations.
 */

import type { ComponentType } from "react";
import { registerDetailTabs, registerDetailActions } from "./index";
import type { ResourceComponentProps } from "./types";
import { k8sPatch } from "@/lib/k8s/client";
import { endpoints } from "@/lib/k8s/endpoints";
import { Power, PowerOff, RotateCw } from "lucide-react";

// --- Helper ---

const asTab = (C: ComponentType<{ instance: import("@/lib/k8s/types").AppInstance }>) =>
  C as ComponentType<ResourceComponentProps>;

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

// --- VM Instance actions ---

function vmPatchRunStrategy(strategy: string) {
  return async ({ plural, namespace, instance }: {
    plural: string;
    namespace: string;
    instance?: import("@/lib/k8s/types").AppInstance;
  }) => {
    if (!instance) return;
    await k8sPatch(
      endpoints.instance(plural, namespace, instance.metadata.name),
      { spec: { runStrategy: strategy } }
    );
    // Cache invalidation handled by DetailView
  };
}

registerDetailActions("vminstances", [
  {
    key: "start",
    label: "Start",
    icon: Power,
    action: vmPatchRunStrategy("Always"),
  },
  {
    key: "stop",
    label: "Stop",
    icon: PowerOff,
    action: vmPatchRunStrategy("Halted"),
  },
  {
    key: "restart",
    label: "Restart",
    icon: RotateCw,
    action: async ({ plural, namespace, instance }) => {
      if (!instance) return;
      // Restart: set Halted then back to Always
      const path = endpoints.instance(plural, namespace, instance.metadata.name);
      await k8sPatch(path, { spec: { runStrategy: "Halted" } });
      // Short delay for controller to process
      await new Promise((r) => setTimeout(r, 2000));
      await k8sPatch(path, { spec: { runStrategy: "Always" } });
      // Cache invalidation handled by DetailView
    },
  },
]);
