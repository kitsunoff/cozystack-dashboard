"use client";

import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import type { AppInstance } from "@/lib/k8s/types";

interface Props {
  instance: AppInstance;
}

const ADDON_META: Record<string, { label: string; description: string; alwaysOn?: boolean }> = {
  certManager: { label: "Cert Manager", description: "Automatic TLS certificate management" },
  cilium: { label: "Cilium", description: "eBPF-based CNI networking", alwaysOn: true },
  coredns: { label: "CoreDNS", description: "Cluster DNS service", alwaysOn: true },
  fluxcd: { label: "FluxCD", description: "GitOps continuous delivery" },
  gatewayAPI: { label: "Gateway API", description: "Kubernetes Gateway API resources" },
  gpuOperator: { label: "GPU Operator", description: "NVIDIA GPU support for workloads" },
  ingressNginx: { label: "Ingress NGINX", description: "HTTP/S ingress controller" },
  monitoringAgents: { label: "Monitoring Agents", description: "Metrics and logging collection" },
  velero: { label: "Velero", description: "Backup and disaster recovery" },
  verticalPodAutoscaler: { label: "Vertical Pod Autoscaler", description: "Automatic resource sizing", alwaysOn: true },
};

export function K8sAddonsTab({ instance }: Props) {
  const addons = instance.spec.addons as Record<string, { enabled?: boolean; valuesOverride?: unknown }> | undefined;

  if (!addons) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No addon configuration
      </p>
    );
  }

  const entries = Object.entries(addons).sort(([a], [b]) => {
    const aOn = ADDON_META[a]?.alwaysOn ? 0 : 1;
    const bOn = ADDON_META[b]?.alwaysOn ? 0 : 1;
    return aOn - bOn || a.localeCompare(b);
  });

  return (
    <div className="space-y-2">
      {entries.map(([key, config]) => {
        const meta = ADDON_META[key] ?? { label: key, description: "" };
        const isEnabled = meta.alwaysOn || config.enabled === true;
        const hasOverrides = !!(
          config.valuesOverride &&
          typeof config.valuesOverride === "object" &&
          Object.keys(config.valuesOverride as object).length > 0
        );

        return (
          <div
            key={key}
            className="flex items-center justify-between rounded-xl border px-5 py-4"
          >
            <div className="flex items-center gap-4">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold ${
                  isEnabled
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isEnabled ? "✓" : "—"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{meta.label}</span>
                  {meta.alwaysOn && (
                    <Badge variant="secondary" className="text-[10px]">
                      always on
                    </Badge>
                  )}
                  {hasOverrides && (
                    <Badge variant="outline" className="text-[10px]">
                      custom values
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {meta.description}
                </p>
              </div>
            </div>
            <Switch
              checked={isEnabled}
              disabled
              aria-label={`${meta.label} status`}
            />
          </div>
        );
      })}
    </div>
  );
}
