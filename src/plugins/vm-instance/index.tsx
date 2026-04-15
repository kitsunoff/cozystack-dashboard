/**
 * VM Instance plugin — columns, status, start/stop/restart actions, custom form.
 */

import { registerDetailActions, registerDetailTabs, registerColumns, registerStatusRenderer } from "@/components/registry";
import type { AppInstance } from "@/lib/k8s/types";
import { k8sPatch } from "@/lib/k8s/client";
import { endpoints } from "@/lib/k8s/endpoints";
import { Power, PowerOff, RotateCw } from "lucide-react";
import { StatusRow, asTab, ageColumn } from "../helpers";
import { registerCustomForm } from "@/components/form/registry";
import { OverviewTab } from "@/components/detail/tabs/overview-tab";
import { SecretsTab } from "@/components/detail/tabs/secrets-tab";
import { WorkloadsTab } from "@/components/detail/tabs/workloads-tab";
import { YamlTab } from "@/components/detail/tabs/yaml-tab";
import { VmConsoleTab } from "./tabs/console-tab";

// Status
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

registerStatusRenderer("vminstances", vmStatus);

// Tabs
registerDetailTabs("vminstances", [
  { key: "overview", label: "Overview", component: asTab(OverviewTab) },
  { key: "console", label: "Console", component: asTab(VmConsoleTab) },
  { key: "workloads", label: "Workloads", component: asTab(WorkloadsTab) },
  { key: "secrets", label: "Secrets", component: SecretsTab },
  { key: "yaml", label: "YAML", component: asTab(YamlTab) },
]);

// Columns
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

// Actions
function vmPatchRunStrategy(strategy: string) {
  return async ({ plural, namespace, instance }: { plural: string; namespace: string; instance?: AppInstance }) => {
    if (!instance) return;
    await k8sPatch(endpoints.instance(plural, namespace, instance.metadata.name), { spec: { runStrategy: strategy } });
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

// Custom form
import { VMInstanceForm } from "./form";
registerCustomForm("vminstances", VMInstanceForm);
