"use client";

import type { AppInstance } from "@/lib/k8s/types";

interface InstanceMetricsProps {
  instances: AppInstance[];
}

export function InstanceMetrics({ instances }: InstanceMetricsProps) {
  const total = instances.length;
  const ready = instances.filter((i) =>
    i.status?.conditions?.some((c) => c.type === "Ready" && c.status === "True")
  ).length;
  const notReady = total - ready;

  const metrics = [
    { label: "Total", value: total },
    { label: "Running", value: ready, color: "text-emerald-600" },
    ...(notReady > 0
      ? [{ label: "Not Ready", value: notReady, color: "text-amber-600" }]
      : []),
  ];

  return (
    <div className="flex gap-6">
      {metrics.map((m) => (
        <div key={m.label}>
          <div className={`text-2xl font-semibold tabular-nums ${"color" in m ? m.color : ""}`}>
            {m.value}
          </div>
          <div className="text-sm text-muted-foreground">{m.label}</div>
        </div>
      ))}
    </div>
  );
}
