"use client";

import { Badge } from "@/components/ui/badge";
import type { AppInstance } from "@/lib/k8s/types";

interface Props {
  instance: AppInstance;
}

interface ComponentSpec {
  resourcesPreset?: string;
  resources?: { cpu?: string; memory?: string };
}

export function K8sControlPlaneTab({ instance }: Props) {
  const cp = instance.spec.controlPlane as {
    replicas?: number;
    apiServer?: ComponentSpec;
    controllerManager?: ComponentSpec;
    scheduler?: ComponentSpec;
    konnectivity?: { server?: ComponentSpec };
  } | undefined;

  if (!cp) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No control plane configuration
      </p>
    );
  }

  const components = [
    { name: "API Server", spec: cp.apiServer, icon: "⚡" },
    { name: "Controller Manager", spec: cp.controllerManager, icon: "🔄" },
    { name: "Scheduler", spec: cp.scheduler, icon: "📋" },
    { name: "Konnectivity", spec: cp.konnectivity?.server, icon: "🔗" },
  ];

  return (
    <div className="space-y-6">
      {/* Replicas */}
      <div className="rounded-xl border px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Control Plane Replicas</div>
            <div className="text-sm text-muted-foreground">
              High availability configuration
            </div>
          </div>
          <div className="flex items-center gap-2">
            {Array.from({ length: cp.replicas ?? 1 }).map((_, i) => (
              <div
                key={i}
                className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center"
              >
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </div>
            ))}
            <span className="text-lg font-semibold ml-2 tabular-nums">
              {cp.replicas ?? 1}
            </span>
          </div>
        </div>
      </div>

      {/* Components */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {components.map(({ name, spec, icon }) => (
          <div key={name} className="rounded-xl border overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 bg-muted/30">
              <span className="text-lg">{icon}</span>
              <span className="text-sm font-medium">{name}</span>
            </div>
            <div className="divide-y">
              <div className="flex justify-between items-center px-5 py-3">
                <span className="text-sm text-muted-foreground">Preset</span>
                <Badge variant="secondary" className="text-xs font-mono">
                  {spec?.resourcesPreset ?? "—"}
                </Badge>
              </div>
              <div className="flex justify-between items-center px-5 py-3">
                <span className="text-sm text-muted-foreground">CPU</span>
                <span className="text-sm font-mono">
                  {spec?.resources?.cpu ?? "preset"}
                </span>
              </div>
              <div className="flex justify-between items-center px-5 py-3">
                <span className="text-sm text-muted-foreground">Memory</span>
                <span className="text-sm font-mono">
                  {spec?.resources?.memory ?? "preset"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
