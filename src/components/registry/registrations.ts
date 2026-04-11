/**
 * Side-effect import — registers all pluggable components.
 * Import this file once in the app to activate all registrations.
 */

import type { ComponentType } from "react";
import { registerDetailTabs } from "./index";
import type { ResourceComponentProps } from "./types";

// --- K8s tabs ---
import { K8sOverviewTab } from "@/components/detail/tabs/k8s-overview-tab";
import { K8sControlPlaneTab } from "@/components/detail/tabs/k8s-control-plane-tab";
import { K8sNodeGroupsTab } from "@/components/detail/tabs/k8s-node-groups-tab";
import { K8sAddonsTab } from "@/components/detail/tabs/k8s-addons-tab";
import { YamlTab } from "@/components/detail/tabs/yaml-tab";

const asTab = (C: ComponentType<{ instance: import("@/lib/k8s/types").AppInstance }>) =>
  C as ComponentType<ResourceComponentProps>;

registerDetailTabs("kuberneteses", [
  { key: "overview", label: "Overview", component: asTab(K8sOverviewTab) },
  { key: "control-plane", label: "Control Plane", component: asTab(K8sControlPlaneTab) },
  { key: "node-groups", label: "Node Groups", component: asTab(K8sNodeGroupsTab) },
  { key: "addons", label: "Addons", component: asTab(K8sAddonsTab) },
  { key: "yaml", label: "YAML", component: asTab(YamlTab) },
]);

// Other resource types use default tabs (Overview + YAML) automatically.
// To add custom tabs for a resource, add registerDetailTabs() calls here.
//
// Example:
// registerDetailTabs("vminstances", [
//   { key: "overview", label: "Overview", component: asTab(OverviewTab) },
//   { key: "console", label: "Console", component: asTab(VMConsoleTab) },
//   { key: "yaml", label: "YAML", component: asTab(YamlTab) },
// ]);
