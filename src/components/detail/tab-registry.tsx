"use client";

import type { TabDef } from "./detail-view";
import type { AppInstance } from "@/lib/k8s/types";
import { OverviewTab } from "./tabs/overview-tab";
import { YamlTab } from "./tabs/yaml-tab";
import { K8sNodeGroupsTab } from "./tabs/k8s-node-groups-tab";
import { K8sAddonsTab } from "./tabs/k8s-addons-tab";
import { K8sControlPlaneTab } from "./tabs/k8s-control-plane-tab";

export function getTabsForResource(
  plural: string,
  instance: AppInstance
): TabDef[] {
  switch (plural) {
    case "kuberneteses":
      return [
        {
          key: "overview",
          label: "Overview",
          content: <K8sOverview instance={instance} />,
        },
        {
          key: "control-plane",
          label: "Control Plane",
          content: <K8sControlPlaneTab instance={instance} />,
        },
        {
          key: "node-groups",
          label: "Node Groups",
          content: <K8sNodeGroupsTab instance={instance} />,
        },
        {
          key: "addons",
          label: "Addons",
          content: <K8sAddonsTab instance={instance} />,
        },
        { key: "yaml", label: "YAML", content: <YamlTab instance={instance} /> },
      ];

    default:
      return [
        {
          key: "overview",
          label: "Overview",
          content: <OverviewTab instance={instance} />,
        },
        { key: "yaml", label: "YAML", content: <YamlTab instance={instance} /> },
      ];
  }
}

// K8s overview is a summary combining key info from all sections
import { Badge } from "@/components/ui/badge";

function K8sOverview({ instance }: { instance: AppInstance }) {
  const spec = instance.spec;
  const cp = spec.controlPlane as { replicas?: number } | undefined;
  const nodeGroups = spec.nodeGroups as Record<string, { instanceType?: string; minReplicas?: number; maxReplicas?: number }> | undefined;
  const addons = spec.addons as Record<string, { enabled?: boolean }> | undefined;

  const ngEntries = nodeGroups ? Object.entries(nodeGroups) : [];
  const totalMaxNodes = ngEntries.reduce((sum, [, ng]) => sum + (ng.maxReplicas ?? 0), 0);
  const enabledAddons = addons
    ? Object.entries(addons).filter(([, v]) => v.enabled).length
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard label="Version" value={String(spec.version ?? "—")} />
        <SummaryCard label="CP Replicas" value={String(cp?.replicas ?? "—")} />
        <SummaryCard label="Node Groups" value={String(ngEntries.length)} />
        <SummaryCard label="Max Nodes" value={String(totalMaxNodes)} />
      </div>

      {/* Quick info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Node groups summary */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Node Groups
          </h3>
          <div className="rounded-xl border divide-y">
            {ngEntries.map(([name, ng]) => (
              <div key={name} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono font-medium">{name}</span>
                  {ng.instanceType && (
                    <Badge variant="secondary" className="text-xs font-normal">
                      {ng.instanceType}
                    </Badge>
                  )}
                </div>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {ng.minReplicas ?? 0}–{ng.maxReplicas ?? 0} nodes
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Cluster info */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Cluster Info
          </h3>
          <div className="rounded-xl border divide-y">
            <InfoRow label="Host" value={String(spec.host || "auto-generated")} mono={!!spec.host} />
            <InfoRow label="Storage Class" value={String(spec.storageClass ?? "default")} />
            <InfoRow label="Addons Enabled" value={`${enabledAddons} of ${Object.keys(addons ?? {}).length}`} />
          </div>
        </div>
      </div>

      {/* Conditions */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Conditions
        </h3>
        <div className="rounded-xl border divide-y">
          {(instance.status?.conditions ?? []).map((c) => (
            <div key={c.type} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    c.status === "True" ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
                <span className="text-sm font-medium">{c.type}</span>
              </div>
              <Badge
                variant={c.status === "True" ? "secondary" : "destructive"}
                className="text-xs"
              >
                {c.status}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border px-4 py-3">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
