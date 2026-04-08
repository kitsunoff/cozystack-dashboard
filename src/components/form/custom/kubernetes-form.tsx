"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { k8sCreate } from "@/lib/k8s/client";
import { endpoints } from "@/lib/k8s/endpoints";
import { cn } from "@/lib/utils";
import type { CustomFormProps } from "../registry";

const K8S_VERSIONS = ["v1.35", "v1.34", "v1.33", "v1.32", "v1.31", "v1.30"];

const RESOURCE_PRESETS = ["nano", "micro", "small", "medium", "large", "xlarge", "2xlarge"];

const INSTANCE_TYPES = [
  { value: "u1.micro", label: "Micro", specs: "1 vCPU / 1 GiB" },
  { value: "u1.small", label: "Small", specs: "1 vCPU / 2 GiB" },
  { value: "u1.medium", label: "Medium", specs: "2 vCPU / 4 GiB" },
  { value: "u1.large", label: "Large", specs: "4 vCPU / 8 GiB" },
  { value: "u1.xlarge", label: "X-Large", specs: "8 vCPU / 16 GiB" },
  { value: "u1.2xlarge", label: "2X-Large", specs: "16 vCPU / 32 GiB" },
];

interface NodeGroup {
  name: string;
  instanceType: string;
  minReplicas: number;
  maxReplicas: number;
  ephemeralStorage: string;
  roles: string[];
}

interface Addon {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  hasValues: boolean;
}

const DEFAULT_ADDONS: Addon[] = [
  { key: "certManager", label: "Cert Manager", description: "Automatic TLS certificate management", enabled: false, hasValues: true },
  { key: "fluxcd", label: "FluxCD", description: "GitOps continuous delivery", enabled: false, hasValues: true },
  { key: "gatewayAPI", label: "Gateway API", description: "Kubernetes Gateway API support", enabled: false, hasValues: false },
  { key: "gpuOperator", label: "GPU Operator", description: "NVIDIA GPU support for workloads", enabled: false, hasValues: true },
  { key: "ingressNginx", label: "Ingress NGINX", description: "HTTP/S ingress controller", enabled: false, hasValues: true },
  { key: "monitoringAgents", label: "Monitoring", description: "Metrics and logging agents", enabled: false, hasValues: true },
  { key: "velero", label: "Velero", description: "Backup and disaster recovery", enabled: false, hasValues: true },
];

export function KubernetesForm({
  plural,
  namespace,
  apiGroup,
  apiVersion,
  kind,
  backHref,
}: CustomFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // General
  const [name, setName] = useState("");
  const [version, setVersion] = useState("v1.35");
  const [host, setHost] = useState("");
  const [storageClass, setStorageClass] = useState("replicated");

  // Control Plane
  const [cpReplicas, setCpReplicas] = useState(2);
  const [apiServerPreset, setApiServerPreset] = useState("large");
  const [controllerPreset, setControllerPreset] = useState("micro");
  const [schedulerPreset, setSchedulerPreset] = useState("micro");

  // Node Groups
  const [nodeGroups, setNodeGroups] = useState<NodeGroup[]>([
    {
      name: "md0",
      instanceType: "u1.medium",
      minReplicas: 0,
      maxReplicas: 10,
      ephemeralStorage: "20Gi",
      roles: ["ingress-nginx"],
    },
  ]);

  // Addons
  const [addons, setAddons] = useState<Addon[]>(DEFAULT_ADDONS);

  const toggleAddon = (key: string) => {
    setAddons((prev) =>
      prev.map((a) => (a.key === key ? { ...a, enabled: !a.enabled } : a))
    );
  };

  const updateNodeGroup = (index: number, updates: Partial<NodeGroup>) => {
    setNodeGroups((prev) =>
      prev.map((ng, i) => (i === index ? { ...ng, ...updates } : ng))
    );
  };

  const addNodeGroup = () => {
    const idx = nodeGroups.length;
    setNodeGroups([
      ...nodeGroups,
      {
        name: `md${idx}`,
        instanceType: "u1.medium",
        minReplicas: 0,
        maxReplicas: 5,
        ephemeralStorage: "20Gi",
        roles: [],
      },
    ]);
  };

  const removeNodeGroup = (index: number) => {
    setNodeGroups(nodeGroups.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      // Build nodeGroups object
      const ngObj: Record<string, unknown> = {};
      nodeGroups.forEach((ng) => {
        ngObj[ng.name] = {
          instanceType: ng.instanceType,
          minReplicas: ng.minReplicas,
          maxReplicas: ng.maxReplicas,
          ephemeralStorage: ng.ephemeralStorage,
          resources: {},
          roles: ng.roles,
          gpus: [],
        };
      });

      // Build addons
      const addonsObj: Record<string, unknown> = {};
      for (const addon of addons) {
        if (addon.hasValues) {
          addonsObj[addon.key] = { enabled: addon.enabled, valuesOverride: {} };
        } else {
          addonsObj[addon.key] = { enabled: addon.enabled };
        }
      }
      // Always-on addons
      addonsObj.cilium = { valuesOverride: {} };
      addonsObj.coredns = { valuesOverride: {} };
      addonsObj.verticalPodAutoscaler = { valuesOverride: {} };

      const resource = {
        apiVersion: `${apiGroup}/${apiVersion}`,
        kind,
        metadata: { name: name.trim(), namespace },
        spec: {
          version,
          host,
          storageClass,
          controlPlane: {
            replicas: cpReplicas,
            apiServer: { resourcesPreset: apiServerPreset, resources: {} },
            controllerManager: { resourcesPreset: controllerPreset, resources: {} },
            scheduler: { resourcesPreset: schedulerPreset, resources: {} },
            konnectivity: { server: { resourcesPreset: "micro", resources: {} } },
          },
          nodeGroups: ngObj,
          addons: addonsObj,
        },
      };

      await k8sCreate(endpoints.instances(plural, namespace), resource);
      router.push(backHref);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create cluster");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* General */}
      <Section title="Cluster">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Cluster Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-cluster"
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Hostname</Label>
            <Input
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="Auto-generated if empty"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Kubernetes Version</Label>
            <div className="flex flex-wrap gap-2">
              {K8S_VERSIONS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVersion(v)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                    version === v
                      ? "border-foreground bg-accent ring-1 ring-foreground"
                      : "text-muted-foreground hover:border-foreground/30"
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Storage Class</Label>
            <Input
              value={storageClass}
              onChange={(e) => setStorageClass(e.target.value)}
            />
          </div>
        </div>
      </Section>

      <Separator />

      {/* Control Plane */}
      <Section title="Control Plane">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Replicas</Label>
            <div className="flex gap-2">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCpReplicas(n)}
                  className={cn(
                    "rounded-lg border px-4 py-2 text-sm font-medium transition-all",
                    cpReplicas === n
                      ? "border-foreground bg-accent ring-1 ring-foreground"
                      : "text-muted-foreground hover:border-foreground/30"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <PresetPicker label="API Server" value={apiServerPreset} onChange={setApiServerPreset} />
          <PresetPicker label="Controller Manager" value={controllerPreset} onChange={setControllerPreset} />
          <PresetPicker label="Scheduler" value={schedulerPreset} onChange={setSchedulerPreset} />
        </div>
      </Section>

      <Separator />

      {/* Node Groups */}
      <Section title="Node Groups">
        {nodeGroups.map((ng, i) => (
          <div key={i} className="rounded-xl border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">{ng.name}</Badge>
                <span className="text-sm text-muted-foreground">
                  {INSTANCE_TYPES.find((t) => t.value === ng.instanceType)?.specs}
                </span>
              </div>
              {nodeGroups.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => removeNodeGroup(i)}
                >
                  Remove
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Group Name</Label>
                <Input
                  value={ng.name}
                  onChange={(e) => updateNodeGroup(i, { name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Instance Type</Label>
                <Select value={ng.instanceType} onValueChange={(v) => { if (v) updateNodeGroup(i, { instanceType: v }); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INSTANCE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label} — {t.specs}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Min Replicas</Label>
                <Input
                  type="number"
                  value={ng.minReplicas}
                  onChange={(e) => updateNodeGroup(i, { minReplicas: parseInt(e.target.value) || 0 })}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Max Replicas</Label>
                <Input
                  type="number"
                  value={ng.maxReplicas}
                  onChange={(e) => updateNodeGroup(i, { maxReplicas: parseInt(e.target.value) || 1 })}
                  min={1}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Ephemeral Storage</Label>
                <Input
                  value={ng.ephemeralStorage}
                  onChange={(e) => updateNodeGroup(i, { ephemeralStorage: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Roles</Label>
              <Input
                value={ng.roles.join(", ")}
                onChange={(e) =>
                  updateNodeGroup(i, {
                    roles: e.target.value
                      .split(",")
                      .map((r) => r.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="ingress-nginx, gpu-worker"
              />
              <p className="text-xs text-muted-foreground">Comma-separated list of roles</p>
            </div>
          </div>
        ))}

        <Button type="button" variant="outline" size="sm" onClick={addNodeGroup}>
          + Add Node Group
        </Button>
      </Section>

      <Separator />

      {/* Addons */}
      <Section title="Addons">
        <div className="space-y-2">
          {addons.map((addon) => (
            <div
              key={addon.key}
              className="flex items-center justify-between rounded-lg border px-4 py-3"
            >
              <div>
                <div className="text-sm font-medium">{addon.label}</div>
                <div className="text-sm text-muted-foreground">{addon.description}</div>
              </div>
              <Switch checked={addon.enabled} onCheckedChange={() => toggleAddon(addon.key)} />
            </div>
          ))}
        </div>

        <div className="rounded-lg bg-muted/50 border px-4 py-3">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Always enabled:</span>{" "}
            Cilium CNI, CoreDNS, Vertical Pod Autoscaler
          </div>
        </div>
      </Section>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create Cluster"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push(backHref)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-base font-semibold mb-4">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function PresetPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <Select value={value} onValueChange={(v) => { if (v) onChange(v); }}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RESOURCE_PRESETS.map((p) => (
            <SelectItem key={p} value={p}>
              {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
