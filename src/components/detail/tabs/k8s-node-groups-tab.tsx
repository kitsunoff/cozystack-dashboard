"use client";

import { Badge } from "@/components/ui/badge";
import type { AppInstance } from "@/lib/k8s/types";

interface Props {
  instance: AppInstance;
}

interface NodeGroupSpec {
  instanceType?: string;
  minReplicas?: number;
  maxReplicas?: number;
  ephemeralStorage?: string;
  roles?: string[];
  resources?: { cpu?: string; memory?: string };
  gpus?: { name: string }[];
}

export function K8sNodeGroupsTab({ instance }: Props) {
  const nodeGroups = instance.spec.nodeGroups as
    | Record<string, NodeGroupSpec>
    | undefined;

  if (!nodeGroups || Object.keys(nodeGroups).length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No node groups configured
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(nodeGroups).map(([name, ng]) => (
        <div key={name} className="rounded-xl border overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground/5 text-sm font-bold font-mono">
                {name}
              </div>
              <div>
                <div className="text-sm font-medium">{ng.instanceType ?? "custom"}</div>
                <div className="text-xs text-muted-foreground">
                  {ng.minReplicas ?? 0}–{ng.maxReplicas ?? 0} nodes (autoscaling)
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {ng.roles?.map((role) => (
                <Badge key={role} variant="outline" className="text-xs font-normal">
                  {role}
                </Badge>
              ))}
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 border-t divide-x">
            <DetailCell label="Min Replicas" value={String(ng.minReplicas ?? 0)} />
            <DetailCell label="Max Replicas" value={String(ng.maxReplicas ?? 0)} />
            <DetailCell label="Ephemeral" value={ng.ephemeralStorage ?? "—"} />
            <DetailCell
              label="GPUs"
              value={
                ng.gpus && ng.gpus.length > 0
                  ? ng.gpus.map((g) => g.name).join(", ")
                  : "none"
              }
            />
          </div>

          {/* Custom resources if set */}
          {ng.resources && (ng.resources.cpu || ng.resources.memory) && (
            <div className="grid grid-cols-2 border-t divide-x">
              <DetailCell label="CPU" value={ng.resources.cpu ?? "—"} />
              <DetailCell label="Memory" value={ng.resources.memory ?? "—"} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium font-mono mt-0.5">{value}</div>
    </div>
  );
}
