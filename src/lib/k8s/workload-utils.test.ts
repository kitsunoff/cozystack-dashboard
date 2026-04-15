import { describe, it, expect } from "vitest";
import type { WorkloadMonitor, Workload, ObjectMeta } from "./types";
import {
  WORKLOAD_LABELS,
  groupMonitorsByInstance,
  summarizeMonitors,
  groupWorkloadsByMonitor,
  aggregateWorkloadResources,
  parseCpu,
  parseMemory,
  formatCpu,
  formatMemory,
} from "./workload-utils";

function makeMeta(name: string, labels?: Record<string, string>): ObjectMeta {
  return {
    name,
    namespace: "tenant-root",
    creationTimestamp: "2026-01-01T00:00:00Z",
    uid: `uid-${name}`,
    resourceVersion: "1",
    labels,
  };
}

function makeMonitor(
  name: string,
  instanceName: string,
  opts?: {
    operational?: boolean;
    available?: number;
    observed?: number;
    replicas?: number;
  }
): WorkloadMonitor {
  return {
    apiVersion: "cozystack.io/v1alpha1",
    kind: "WorkloadMonitor",
    metadata: makeMeta(name, {
      [WORKLOAD_LABELS.APP_NAME]: instanceName,
      [WORKLOAD_LABELS.APP_KIND]: "TestKind",
    }),
    spec: {
      kind: "test",
      type: "test",
      version: "0.0.1",
      replicas: opts?.replicas ?? 1,
      minReplicas: 1,
      selector: {},
    },
    status: {
      availableReplicas: opts?.available ?? 1,
      observedReplicas: opts?.observed ?? 1,
      operational: opts?.operational,
    },
  };
}

function makeWorkload(
  name: string,
  monitorName: string,
  instanceName: string,
  cpu: string,
  memory: string,
  operational = true
): Workload {
  return {
    apiVersion: "cozystack.io/v1alpha1",
    kind: "Workload",
    metadata: makeMeta(name, {
      [WORKLOAD_LABELS.APP_NAME]: instanceName,
      [WORKLOAD_LABELS.MONITOR]: monitorName,
    }),
    status: {
      kind: "test",
      type: "test",
      operational,
      resources: { cpu, memory },
    },
  };
}

// --- groupMonitorsByInstance ---

describe("groupMonitorsByInstance", () => {
  it("returns empty map for empty array", () => {
    expect(groupMonitorsByInstance([])).toEqual(new Map());
  });

  it("groups monitors by instance name label", () => {
    const monitors = [
      makeMonitor("alerta", "monitoring"),
      makeMonitor("alerta-db", "monitoring"),
      makeMonitor("etcd", "etcd"),
    ];
    const result = groupMonitorsByInstance(monitors);
    expect(result.size).toBe(2);
    expect(result.get("monitoring")).toHaveLength(2);
    expect(result.get("etcd")).toHaveLength(1);
  });

  it("skips monitors without the application name label", () => {
    const noLabel: WorkloadMonitor = {
      apiVersion: "cozystack.io/v1alpha1",
      kind: "WorkloadMonitor",
      metadata: makeMeta("orphan"),
      spec: { kind: "x", type: "x", version: "0", replicas: 1, minReplicas: 0, selector: {} },
    };
    const result = groupMonitorsByInstance([noLabel]);
    expect(result.size).toBe(0);
  });
});

// --- summarizeMonitors ---

describe("summarizeMonitors", () => {
  it("returns zeroes for empty array", () => {
    expect(summarizeMonitors([])).toEqual({
      total: 0,
      operational: 0,
      totalReplicas: 0,
      availableReplicas: 0,
    });
  });

  it("counts all operational", () => {
    const monitors = [
      makeMonitor("a", "inst", { operational: true, available: 2, observed: 2 }),
      makeMonitor("b", "inst", { operational: true, available: 3, observed: 3 }),
    ];
    const result = summarizeMonitors(monitors);
    expect(result).toEqual({
      total: 2,
      operational: 2,
      totalReplicas: 5,
      availableReplicas: 5,
    });
  });

  it("counts mixed operational", () => {
    const monitors = [
      makeMonitor("a", "inst", { operational: true, available: 1, observed: 1 }),
      makeMonitor("b", "inst", { operational: false, available: 0, observed: 2 }),
      makeMonitor("c", "inst", { available: 1, observed: 1 }),
    ];
    const result = summarizeMonitors(monitors);
    expect(result.total).toBe(3);
    expect(result.operational).toBe(1);
    expect(result.totalReplicas).toBe(4);
    expect(result.availableReplicas).toBe(2);
  });

  it("handles monitors without status", () => {
    const noStatus: WorkloadMonitor = {
      apiVersion: "cozystack.io/v1alpha1",
      kind: "WorkloadMonitor",
      metadata: makeMeta("x", { [WORKLOAD_LABELS.APP_NAME]: "inst" }),
      spec: { kind: "x", type: "x", version: "0", replicas: 1, minReplicas: 0, selector: {} },
    };
    const result = summarizeMonitors([noStatus]);
    expect(result).toEqual({ total: 1, operational: 0, totalReplicas: 0, availableReplicas: 0 });
  });
});

// --- groupWorkloadsByMonitor ---

describe("groupWorkloadsByMonitor", () => {
  it("returns empty map for empty array", () => {
    expect(groupWorkloadsByMonitor([])).toEqual(new Map());
  });

  it("groups workloads by monitor label", () => {
    const workloads = [
      makeWorkload("pod-a-1", "alerta", "monitoring", "100m", "256Mi"),
      makeWorkload("pod-a-2", "alerta", "monitoring", "100m", "256Mi"),
      makeWorkload("pod-db-1", "alerta-db", "monitoring", "200m", "512Mi"),
    ];
    const result = groupWorkloadsByMonitor(workloads);
    expect(result.size).toBe(2);
    expect(result.get("alerta")).toHaveLength(2);
    expect(result.get("alerta-db")).toHaveLength(1);
  });

  it("skips workloads without monitor label", () => {
    const noLabel: Workload = {
      apiVersion: "cozystack.io/v1alpha1",
      kind: "Workload",
      metadata: makeMeta("orphan"),
      status: { kind: "x", type: "x", operational: true, resources: { cpu: "0", memory: "0" } },
    };
    const result = groupWorkloadsByMonitor([noLabel]);
    expect(result.size).toBe(0);
  });
});

// --- aggregateWorkloadResources ---

describe("aggregateWorkloadResources", () => {
  it("returns zeroes for empty array", () => {
    expect(aggregateWorkloadResources([])).toEqual({
      totalCpuMillis: 0,
      totalMemoryBytes: 0,
    });
  });

  it("sums cpu and memory from multiple workloads", () => {
    const workloads = [
      makeWorkload("a", "m", "inst", "100m", "256Mi"),
      makeWorkload("b", "m", "inst", "200m", "512Mi"),
    ];
    const result = aggregateWorkloadResources(workloads);
    expect(result.totalCpuMillis).toBe(300);
    expect(result.totalMemoryBytes).toBe(768 * 1024 * 1024);
  });

  it("handles workloads without status", () => {
    const noStatus: Workload = {
      apiVersion: "cozystack.io/v1alpha1",
      kind: "Workload",
      metadata: makeMeta("x"),
    };
    const result = aggregateWorkloadResources([noStatus]);
    expect(result.totalCpuMillis).toBe(0);
    expect(result.totalMemoryBytes).toBe(0);
  });
});

// --- parseCpu ---

describe("parseCpu", () => {
  it("parses millicores", () => {
    expect(parseCpu("100m")).toBe(100);
    expect(parseCpu("500m")).toBe(500);
  });

  it("parses whole cores", () => {
    expect(parseCpu("2")).toBe(2000);
    expect(parseCpu("0.5")).toBe(500);
  });

  it("handles zero and empty", () => {
    expect(parseCpu("0")).toBe(0);
    expect(parseCpu("0m")).toBe(0);
    expect(parseCpu("")).toBe(0);
  });
});

// --- parseMemory ---

describe("parseMemory", () => {
  it("parses Mi suffix", () => {
    expect(parseMemory("256Mi")).toBe(256 * 1024 * 1024);
    expect(parseMemory("512Mi")).toBe(512 * 1024 * 1024);
  });

  it("parses Gi suffix", () => {
    expect(parseMemory("1Gi")).toBe(1024 * 1024 * 1024);
    expect(parseMemory("2Gi")).toBe(2 * 1024 * 1024 * 1024);
  });

  it("parses Ki suffix", () => {
    expect(parseMemory("1024Ki")).toBe(1024 * 1024);
  });

  it("parses decimal SI suffixes", () => {
    expect(parseMemory("1G")).toBe(1000 * 1000 * 1000);
    expect(parseMemory("500M")).toBe(500 * 1000 * 1000);
  });

  it("parses bare bytes", () => {
    expect(parseMemory("1073741824")).toBe(1073741824);
  });

  it("handles zero and empty", () => {
    expect(parseMemory("0")).toBe(0);
    expect(parseMemory("")).toBe(0);
  });
});

// --- formatCpu ---

describe("formatCpu", () => {
  it("formats millicores", () => {
    expect(formatCpu(100)).toBe("100m");
    expect(formatCpu(500)).toBe("500m");
  });

  it("formats cores when >= 1000m", () => {
    expect(formatCpu(1000)).toBe("1.0 cores");
    expect(formatCpu(2500)).toBe("2.5 cores");
  });

  it("formats zero", () => {
    expect(formatCpu(0)).toBe("0m");
  });
});

// --- formatMemory ---

describe("formatMemory", () => {
  it("formats Gi", () => {
    expect(formatMemory(1024 ** 3)).toBe("1.0 Gi");
    expect(formatMemory(2.5 * 1024 ** 3)).toBe("2.5 Gi");
  });

  it("formats Mi", () => {
    expect(formatMemory(256 * 1024 * 1024)).toBe("256 Mi");
    expect(formatMemory(512 * 1024 * 1024)).toBe("512 Mi");
  });

  it("formats Ki", () => {
    expect(formatMemory(512 * 1024)).toBe("512 Ki");
  });

  it("formats bytes", () => {
    expect(formatMemory(100)).toBe("100 B");
  });

  it("formats zero", () => {
    expect(formatMemory(0)).toBe("0 B");
  });
});
