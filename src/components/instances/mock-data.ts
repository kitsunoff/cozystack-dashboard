import type { AppInstance } from "@/lib/k8s/types";

export function generateMockInstances(
  plural: string,
  kind: string,
  namespace: string
): AppInstance[] {
  const now = Date.now();
  const hour = 3600_000;
  const day = 24 * hour;

  const presets: Record<
    string,
    { names: string[]; specs: Record<string, unknown>[]; ages: number[] }
  > = {
    postgreses: {
      names: ["pg-main", "pg-analytics", "pg-staging"],
      specs: [
        { replicas: 3, version: "16.4", resourcesPreset: "large", size: "50Gi" },
        { replicas: 2, version: "16.4", resourcesPreset: "medium", size: "100Gi" },
        { replicas: 1, version: "15.8", resourcesPreset: "small", size: "10Gi" },
      ],
      ages: [45 * day, 12 * day, 3 * hour],
    },
    redises: {
      names: ["cache-prod", "sessions", "cache-staging"],
      specs: [
        { replicas: 3, version: "7.2", resourcesPreset: "medium", size: "8Gi" },
        { replicas: 2, version: "7.2", resourcesPreset: "small", size: "4Gi" },
        { replicas: 1, version: "7.0", resourcesPreset: "small", size: "2Gi" },
      ],
      ages: [60 * day, 14 * day, 1 * day],
    },
    mongodbs: {
      names: ["mongo-prod", "mongo-dev"],
      specs: [
        { replicas: 3, version: "7.0", resourcesPreset: "large", size: "100Gi" },
        { replicas: 1, version: "7.0", resourcesPreset: "small", size: "10Gi" },
      ],
      ages: [30 * day, 5 * day],
    },
    kafkas: {
      names: ["events-prod", "logs"],
      specs: [
        { replicas: 3, version: "3.7", resourcesPreset: "xlarge", size: "200Gi" },
        { replicas: 1, version: "3.7", resourcesPreset: "medium", size: "50Gi" },
      ],
      ages: [90 * day, 20 * day],
    },
    kuberneteses: {
      names: ["prod", "staging", "dev", "ml-training"],
      specs: [
        {
          version: "v1.35",
          host: "prod.k8s.example.com",
          storageClass: "replicated",
          controlPlane: { replicas: 3 },
          nodeGroups: {
            md0: { instanceType: "u1.xlarge", minReplicas: 3, maxReplicas: 20, roles: ["ingress-nginx"] },
            gpu: { instanceType: "u1.2xlarge", minReplicas: 0, maxReplicas: 4, roles: ["gpu-worker"] },
          },
        },
        {
          version: "v1.34",
          host: "staging.k8s.example.com",
          storageClass: "replicated",
          controlPlane: { replicas: 2 },
          nodeGroups: {
            md0: { instanceType: "u1.medium", minReplicas: 1, maxReplicas: 5, roles: ["ingress-nginx"] },
          },
        },
        {
          version: "v1.35",
          host: "",
          storageClass: "replicated",
          controlPlane: { replicas: 1 },
          nodeGroups: {
            md0: { instanceType: "u1.small", minReplicas: 1, maxReplicas: 3, roles: [] },
          },
        },
        {
          version: "v1.34",
          host: "ml.k8s.example.com",
          storageClass: "replicated",
          controlPlane: { replicas: 2 },
          nodeGroups: {
            md0: { instanceType: "u1.large", minReplicas: 2, maxReplicas: 8, roles: [] },
            gpu: { instanceType: "u1.2xlarge", minReplicas: 2, maxReplicas: 16, roles: ["gpu-worker"] },
          },
        },
      ],
      ages: [120 * day, 45 * day, 2 * day, 7 * day],
    },
    vminstances: {
      names: ["web-server-01", "db-server", "bastion", "ci-runner"],
      specs: [
        { instanceProfile: "ubuntu", instanceType: "u1.large", runStrategy: "Always", external: true, externalPorts: [22, 80, 443] },
        { instanceProfile: "ubuntu", instanceType: "u1.xlarge", runStrategy: "Always", external: false },
        { instanceProfile: "alpine", instanceType: "u1.micro", runStrategy: "Always", external: true, externalPorts: [22] },
        { instanceProfile: "ubuntu", instanceType: "u1.medium", runStrategy: "RerunOnFailure", external: false },
      ],
      ages: [60 * day, 30 * day, 90 * day, 5 * day],
    },
    vmdisks: {
      names: ["ubuntu-boot", "data-vol-01", "backup-store", "windows-iso"],
      specs: [
        { source: { image: { name: "ubuntu" } }, storage: "20Gi", storageClass: "replicated", optical: false },
        { source: {}, storage: "100Gi", storageClass: "replicated", optical: false },
        { source: {}, storage: "500Gi", storageClass: "replicated", optical: false },
        { source: { http: { url: "https://example.com/win11.iso" } }, storage: "6Gi", storageClass: "replicated", optical: true },
      ],
      ages: [60 * day, 30 * day, 14 * day, 2 * day],
    },
    clickhouses: {
      names: ["analytics", "logs-ch"],
      specs: [
        { replicas: 3, resourcesPreset: "xlarge", size: "500Gi" },
        { replicas: 2, resourcesPreset: "large", size: "200Gi" },
      ],
      ages: [90 * day, 21 * day],
    },
    foundationdbs: {
      names: ["fdb-prod"],
      specs: [
        { cluster: { version: "7.3.63", redundancyMode: "double", storageEngine: "ssd-2", processCounts: { storage: 3, stateless: -1 } }, resourcesPreset: "medium", storage: { size: "16Gi" } },
      ],
      ages: [14 * day],
    },
    natses: {
      names: ["nats-core", "nats-edge"],
      specs: [
        { replicas: 3, resourcesPreset: "medium", size: "10Gi" },
        { replicas: 1, resourcesPreset: "small", size: "5Gi" },
      ],
      ages: [50 * day, 3 * day],
    },
    rabbitmqs: {
      names: ["mq-prod", "mq-dev"],
      specs: [
        { replicas: 3, resourcesPreset: "medium", size: "20Gi" },
        { replicas: 1, resourcesPreset: "small", size: "5Gi" },
      ],
      ages: [80 * day, 10 * day],
    },
    mariadbs: {
      names: ["legacy-app-db"],
      specs: [
        { replicas: 2, version: "11.4", resourcesPreset: "medium", size: "50Gi" },
      ],
      ages: [200 * day],
    },
  };

  const preset = presets[plural];
  if (!preset) {
    return [{
      apiVersion: "apps.cozystack.io/v1alpha1",
      kind,
      metadata: { name: "demo-1", namespace, creationTimestamp: new Date(now - 3 * day).toISOString(), uid: "mock-demo-1", resourceVersion: "1" },
      spec: { replicas: 1, resourcesPreset: "small", size: "10Gi" },
      status: { conditions: [{ type: "Ready", status: "True", reason: "ReconciliationSucceeded", message: "", lastTransitionTime: new Date(now - 3 * day).toISOString() }] },
    }];
  }

  return preset.names.map((name, i) => {
    const age = preset.ages[i] ?? 1 * day;
    const isReady = i === preset.names.length - 1 ? Math.random() > 0.3 : true;
    return {
      apiVersion: "apps.cozystack.io/v1alpha1",
      kind,
      metadata: {
        name,
        namespace,
        creationTimestamp: new Date(now - age).toISOString(),
        uid: `mock-${name}`,
        resourceVersion: "1",
      },
      spec: preset.specs[i] ?? preset.specs[0],
      status: {
        conditions: [
          {
            type: "Ready",
            status: isReady ? "True" : "False",
            reason: isReady ? "ReconciliationSucceeded" : "Reconciling",
            message: isReady ? "" : "Waiting for pods to become ready",
            lastTransitionTime: new Date(now - (isReady ? age : 5 * 60_000)).toISOString(),
          },
        ],
      },
    };
  });
}

export interface ActivityEvent {
  id: string;
  type: "created" | "updated" | "scaled" | "backup" | "error" | "upgrade" | "addon";
  instance: string;
  message: string;
  timestamp: string;
}

export function generateMockActivity(plural: string): ActivityEvent[] {
  const now = Date.now();
  const min = 60_000;
  const hour = 60 * min;
  const day = 24 * hour;

  const activityMap: Record<string, ActivityEvent[]> = {
    kuberneteses: [
      { id: "1", type: "upgrade", instance: "prod", message: "Upgraded Kubernetes v1.34 → v1.35", timestamp: new Date(now - 2 * hour).toISOString() },
      { id: "2", type: "scaled", instance: "prod", message: "Node group md0 autoscaled 3 → 7 nodes", timestamp: new Date(now - 5 * hour).toISOString() },
      { id: "3", type: "addon", instance: "staging", message: "Enabled cert-manager addon", timestamp: new Date(now - 1 * day).toISOString() },
      { id: "4", type: "created", instance: "dev", message: "Cluster created", timestamp: new Date(now - 2 * day).toISOString() },
      { id: "5", type: "scaled", instance: "ml-training", message: "Node group gpu scaled 0 → 2 nodes", timestamp: new Date(now - 3 * day).toISOString() },
      { id: "6", type: "error", instance: "staging", message: "API server OOM, restarted automatically", timestamp: new Date(now - 5 * day).toISOString() },
    ],
    vminstances: [
      { id: "1", type: "created", instance: "ci-runner", message: "VM created with ubuntu profile", timestamp: new Date(now - 5 * day).toISOString() },
      { id: "2", type: "updated", instance: "web-server-01", message: "External ports updated: added 443", timestamp: new Date(now - 1 * day).toISOString() },
      { id: "3", type: "error", instance: "ci-runner", message: "VM crashed, restarted by RerunOnFailure", timestamp: new Date(now - 3 * day).toISOString() },
      { id: "4", type: "updated", instance: "bastion", message: "SSH keys rotated", timestamp: new Date(now - 7 * day).toISOString() },
    ],
    vmdisks: [
      { id: "1", type: "created", instance: "windows-iso", message: "Disk created from HTTP source", timestamp: new Date(now - 2 * day).toISOString() },
      { id: "2", type: "updated", instance: "data-vol-01", message: "Expanded 50Gi → 100Gi", timestamp: new Date(now - 7 * day).toISOString() },
      { id: "3", type: "created", instance: "backup-store", message: "Empty disk created", timestamp: new Date(now - 14 * day).toISOString() },
    ],
    postgreses: [
      { id: "1", type: "scaled", instance: "pg-main", message: "Scaled replicas 2 → 3", timestamp: new Date(now - 12 * min).toISOString() },
      { id: "2", type: "backup", instance: "pg-main", message: "Backup completed (2.3 GiB)", timestamp: new Date(now - 2 * hour).toISOString() },
      { id: "3", type: "updated", instance: "pg-analytics", message: "Configuration updated", timestamp: new Date(now - 5 * hour).toISOString() },
      { id: "4", type: "created", instance: "pg-staging", message: "Instance created", timestamp: new Date(now - 3 * hour).toISOString() },
      { id: "5", type: "error", instance: "pg-main", message: "Replication lag exceeded 10s, recovered", timestamp: new Date(now - 3 * day).toISOString() },
    ],
    redises: [
      { id: "1", type: "updated", instance: "cache-prod", message: "Memory limit increased to 8Gi", timestamp: new Date(now - 6 * hour).toISOString() },
      { id: "2", type: "backup", instance: "sessions", message: "RDB snapshot completed", timestamp: new Date(now - 1 * day).toISOString() },
      { id: "3", type: "created", instance: "cache-staging", message: "Instance created", timestamp: new Date(now - 1 * day).toISOString() },
    ],
  };

  const fallback: ActivityEvent[] = [
    { id: "1", type: "created", instance: "demo-1", message: "Instance created", timestamp: new Date(now - 3 * day).toISOString() },
    { id: "2", type: "updated", instance: "demo-1", message: "Configuration updated", timestamp: new Date(now - 1 * day).toISOString() },
  ];

  return activityMap[plural] ?? fallback;
}
