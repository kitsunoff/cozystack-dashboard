import type { WorkloadMonitor, Workload } from "./types";

export const WORKLOAD_LABELS = {
  APP_NAME: "apps.cozystack.io/application.name",
  APP_KIND: "apps.cozystack.io/application.kind",
  MONITOR: "workloads.cozystack.io/monitor",
} as const;

export function groupMonitorsByInstance(
  monitors: WorkloadMonitor[]
): Map<string, WorkloadMonitor[]> {
  const map = new Map<string, WorkloadMonitor[]>();
  for (const m of monitors) {
    const name = m.metadata.labels?.[WORKLOAD_LABELS.APP_NAME];
    if (!name) continue;
    const list = map.get(name) ?? [];
    list.push(m);
    map.set(name, list);
  }
  return map;
}

export interface WorkloadSummary {
  total: number;
  operational: number;
  totalReplicas: number;
  availableReplicas: number;
}

export function summarizeMonitors(monitors: WorkloadMonitor[]): WorkloadSummary {
  let operational = 0;
  let totalReplicas = 0;
  let availableReplicas = 0;
  for (const m of monitors) {
    if (m.status?.operational) operational++;
    totalReplicas += m.status?.observedReplicas ?? 0;
    availableReplicas += m.status?.availableReplicas ?? 0;
  }
  return { total: monitors.length, operational, totalReplicas, availableReplicas };
}

export function groupWorkloadsByMonitor(
  workloads: Workload[]
): Map<string, Workload[]> {
  const map = new Map<string, Workload[]>();
  for (const w of workloads) {
    const monitorName = w.metadata.labels?.[WORKLOAD_LABELS.MONITOR];
    if (!monitorName) continue;
    const list = map.get(monitorName) ?? [];
    list.push(w);
    map.set(monitorName, list);
  }
  return map;
}

export interface ResourceSummary {
  totalCpuMillis: number;
  totalMemoryBytes: number;
}

export function aggregateWorkloadResources(workloads: Workload[]): ResourceSummary {
  let totalCpuMillis = 0;
  let totalMemoryBytes = 0;
  for (const w of workloads) {
    totalCpuMillis += parseCpu(w.status?.resources?.cpu ?? "0");
    totalMemoryBytes += parseMemory(w.status?.resources?.memory ?? "0");
  }
  return { totalCpuMillis, totalMemoryBytes };
}

export function parseCpu(cpu: string): number {
  if (cpu.endsWith("m")) return parseInt(cpu, 10) || 0;
  return (parseFloat(cpu) || 0) * 1000;
}

const memoryUnits: Record<string, number> = {
  Ti: 1024 ** 4,
  Gi: 1024 ** 3,
  Mi: 1024 ** 2,
  Ki: 1024,
  T: 1000 ** 4,
  G: 1000 ** 3,
  M: 1000 ** 2,
  K: 1000,
};

export function parseMemory(mem: string): number {
  for (const [suffix, multiplier] of Object.entries(memoryUnits)) {
    if (mem.endsWith(suffix)) {
      return (parseFloat(mem) || 0) * multiplier;
    }
  }
  return parseFloat(mem) || 0;
}

export function formatCpu(millis: number): string {
  if (millis >= 1000) return `${(millis / 1000).toFixed(1)} cores`;
  return `${millis}m`;
}

export function formatMemory(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} Gi`;
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} Mi`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} Ki`;
  return `${bytes} B`;
}
