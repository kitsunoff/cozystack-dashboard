"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import type { AppInstance, WorkloadMonitor, Workload } from "@/lib/k8s/types";
import { useWorkloadMonitors, useWorkloads, useReleasePrefix } from "@/lib/k8s/hooks";
import {
  WORKLOAD_LABELS,
  isMonitorOperational,
  summarizeMonitors,
  groupWorkloadsByMonitor,
  aggregateWorkloadResources,
  formatCpu,
  formatMemory,
  parseMemory,
} from "@/lib/k8s/workload-utils";
import { StatusDot } from "@/plugins/helpers";

interface Props {
  instance: AppInstance;
  plural?: string;
  namespace?: string;
}

export function WorkloadsTab({ instance, plural, namespace }: Props) {
  const ns = namespace ?? instance.metadata.namespace ?? "";
  const instanceName = instance.metadata.name;
  const releasePrefix = useReleasePrefix(plural ?? "");
  const releaseName = `${releasePrefix}${instanceName}`;

  const { data: monitorList, isLoading: monitorsLoading } = useWorkloadMonitors(ns);
  const { data: workloadList, isLoading: workloadsLoading } = useWorkloads(ns);

  const monitors = useMemo(
    () =>
      (monitorList?.items ?? []).filter(
        (m) => m.metadata.name.startsWith(releaseName)
      ),
    [monitorList, releaseName]
  );

  const monitorNames = useMemo(
    () => new Set(monitors.map((m) => m.metadata.name)),
    [monitors]
  );

  const workloads = useMemo(
    () =>
      (workloadList?.items ?? []).filter(
        (w) => monitorNames.has(w.metadata.labels?.[WORKLOAD_LABELS.MONITOR] ?? "")
      ),
    [workloadList, monitorNames]
  );

  const workloadsByMonitor = useMemo(
    () => groupWorkloadsByMonitor(workloads),
    [workloads]
  );

  const isLoading = monitorsLoading || workloadsLoading;

  if (isLoading) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Loading workloads...
      </div>
    );
  }

  if (monitors.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No workload monitors found for this instance
      </p>
    );
  }

  const summary = summarizeMonitors(monitors);
  const totalResources = aggregateWorkloadResources(workloads);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard label="Monitors" value={String(monitors.length)} />
        <SummaryCard
          label="Operational"
          value={`${summary.operational}/${summary.total}`}
          color={
            summary.operational === summary.total
              ? "text-emerald-600"
              : "text-amber-600"
          }
        />
        <SummaryCard
          label="Replicas"
          value={`${summary.availableReplicas}/${summary.totalReplicas}`}
        />
        <SummaryCard
          label="Resources"
          value={`${formatCpu(totalResources.totalCpuMillis)} / ${formatMemory(totalResources.totalMemoryBytes)}`}
        />
      </div>

      {/* Per-monitor cards */}
      {monitors.map((monitor) => (
        <MonitorCard
          key={monitor.metadata.name}
          monitor={monitor}
          workloads={workloadsByMonitor.get(monitor.metadata.name) ?? []}
        />
      ))}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border px-4 py-3 bg-card">
      <div className={`text-lg font-semibold tabular-nums ${color ?? ""}`}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function MonitorCard({
  monitor,
  workloads,
}: {
  monitor: WorkloadMonitor;
  workloads: Workload[];
}) {
  const available = monitor.status?.availableReplicas ?? 0;
  const observed = monitor.status?.observedReplicas ?? 0;
  const desired = monitor.spec.replicas;
  const operational = isMonitorOperational(monitor);

  const resources = aggregateWorkloadResources(workloads);

  return (
    <div className="rounded-xl border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <StatusDot
            color={operational ? "bg-emerald-500" : "bg-amber-500"}
          />
            <span className="text-sm font-medium">
              {monitor.metadata.name}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs font-normal">
            {monitor.spec.kind}
          </Badge>
          <Badge variant="outline" className="text-xs font-normal">
            {monitor.spec.type}
          </Badge>
        </div>
      </div>

      {/* Replica bar */}
      {desired > 0 && (
        <div className="px-5 py-3 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>Replicas</span>
            <span className="tabular-nums">
              {available} / {desired}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                available >= desired ? "bg-emerald-500" : "bg-amber-500"
              }`}
              style={{
                width: `${Math.min((available / desired) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Details grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border-t divide-x">
        <DetailCell label="Available" value={String(available)} />
        <DetailCell label="Observed" value={String(observed)} />
        <DetailCell label="Min Replicas" value={String(monitor.spec.minReplicas)} />
        <DetailCell label="Version" value={monitor.spec.version || "—"} />
      </div>

      {/* Workloads (pods) */}
      {workloads.length > 0 && (
        <div className="border-t">
          <div className="px-5 py-2 bg-muted/20">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Pods ({workloads.length})
            </span>
          </div>
          <div className="divide-y">
            {workloads.map((w) => (
              <div
                key={w.metadata.name}
                className="flex items-center justify-between px-5 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <StatusDot
                    color={
                      w.status?.operational
                        ? "bg-emerald-500"
                        : "bg-amber-500"
                    }
                  />
                  <span className="text-sm font-mono">
                    {w.metadata.name.replace(/^pod-/, "")}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground tabular-nums">
                  <span>{w.status?.resources?.cpu ?? "—"}</span>
                  <span>{w.status?.resources?.memory ? formatMemory(parseMemory(w.status.resources.memory)) : "—"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aggregate resources */}
      {workloads.length > 0 && (
        <div className="grid grid-cols-2 border-t divide-x">
          <DetailCell
            label="Total CPU"
            value={formatCpu(resources.totalCpuMillis)}
          />
          <DetailCell
            label="Total Memory"
            value={formatMemory(resources.totalMemoryBytes)}
          />
        </div>
      )}
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
