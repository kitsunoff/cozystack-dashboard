"use client";

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
import { WizardShell } from "@/components/form/blocks/wizard-shell";
import { VersionPicker, StoragePicker } from "@/components/form/blocks";
import { useFormContext } from "@/components/form/form-context";
import { k8sCreate, k8sPatch } from "@/lib/k8s/client";
import { endpoints } from "@/lib/k8s/endpoints";
import { cn } from "@/lib/utils";
import type { CustomFormProps } from "../registry";

const RESOURCE_PRESETS = ["nano", "micro", "small", "medium", "large", "xlarge", "2xlarge"];

const INSTANCE_TYPES = [
  { value: "u1.micro", label: "Micro", specs: "1 vCPU / 1 GiB" },
  { value: "u1.small", label: "Small", specs: "1 vCPU / 2 GiB" },
  { value: "u1.medium", label: "Medium", specs: "2 vCPU / 4 GiB" },
  { value: "u1.large", label: "Large", specs: "4 vCPU / 8 GiB" },
  { value: "u1.xlarge", label: "X-Large", specs: "8 vCPU / 16 GiB" },
  { value: "u1.2xlarge", label: "2X-Large", specs: "16 vCPU / 32 GiB" },
];

const DEFAULT_ADDONS = [
  { key: "certManager", label: "Cert Manager", description: "Automatic TLS certificate management", hasValues: true },
  { key: "fluxcd", label: "FluxCD", description: "GitOps continuous delivery", hasValues: true },
  { key: "gatewayAPI", label: "Gateway API", description: "Kubernetes Gateway API support", hasValues: false },
  { key: "gpuOperator", label: "GPU Operator", description: "NVIDIA GPU support", hasValues: true },
  { key: "ingressNginx", label: "Ingress NGINX", description: "HTTP/S ingress controller", hasValues: true },
  { key: "monitoringAgents", label: "Monitoring", description: "Metrics and logging agents", hasValues: true },
  { key: "velero", label: "Velero", description: "Backup and disaster recovery", hasValues: true },
];

export function KubernetesForm({
  plural, namespace, apiGroup, apiVersion, kind, backHref,
  openAPISchema, editName, editValues,
}: CustomFormProps) {
  const schema = openAPISchema ?? {};

  const handleSubmit = async (name: string, values: Record<string, unknown>, isEdit: boolean) => {
    if (isEdit) {
      await k8sPatch(endpoints.instance(plural, namespace, name), { spec: values });
    } else {
      await k8sCreate(endpoints.instances(plural, namespace), {
        apiVersion: `${apiGroup}/${apiVersion}`,
        kind,
        metadata: { name, namespace },
        spec: values,
      });
    }
  };

  return (
    <WizardShell
      schema={schema}
      plural={plural}
      namespace={namespace}
      apiGroup={apiGroup}
      apiVersion={apiVersion}
      kind={kind}
      backHref={backHref}
      submitLabel="Cluster"
      editName={editName}
      existingValues={editValues}
      onSubmit={handleSubmit}
    >
      <Separator />
      <ClusterGeneralSection schema={schema} />
      <Separator />
      <ControlPlaneSection />
      <Separator />
      <NodeGroupsSection />
      <Separator />
      <AddonsSection />
    </WizardShell>
  );
}

// --- Sections ---

function ClusterGeneralSection({ schema }: { schema: Record<string, unknown> }) {
  const { getValue, setValue } = useFormContext();
  const host = (getValue(["host"]) as string) ?? "";

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">Cluster</h3>
      <div className="space-y-2">
        <Label className="text-sm font-medium">Hostname</Label>
        <Input
          value={host}
          onChange={(e) => setValue(["host"], e.target.value)}
          placeholder="Auto-generated if empty"
        />
      </div>
      <VersionPicker schema={schema} />
      <StoragePicker schema={schema} />
    </div>
  );
}

function ControlPlaneSection() {
  const { getValue, setValue } = useFormContext();
  const replicas = (getValue(["controlPlane", "replicas"]) as number) ?? 2;
  const apiPreset = (getValue(["controlPlane", "apiServer", "resourcesPreset"]) as string) ?? "large";
  const ctrlPreset = (getValue(["controlPlane", "controllerManager", "resourcesPreset"]) as string) ?? "micro";
  const schedPreset = (getValue(["controlPlane", "scheduler", "resourcesPreset"]) as string) ?? "micro";

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">Control Plane</h3>
      <div className="space-y-2">
        <Label className="text-sm font-medium">Replicas</Label>
        <div className="flex gap-2">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setValue(["controlPlane", "replicas"], n)}
              className={cn(
                "rounded-lg border px-4 py-2 text-sm font-medium transition-all",
                replicas === n
                  ? "border-foreground bg-accent ring-1 ring-foreground"
                  : "text-muted-foreground hover:border-foreground/30"
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <PresetPicker label="API Server" value={apiPreset} onChange={(v) => setValue(["controlPlane", "apiServer", "resourcesPreset"], v)} />
        <PresetPicker label="Controller" value={ctrlPreset} onChange={(v) => setValue(["controlPlane", "controllerManager", "resourcesPreset"], v)} />
        <PresetPicker label="Scheduler" value={schedPreset} onChange={(v) => setValue(["controlPlane", "scheduler", "resourcesPreset"], v)} />
      </div>
    </div>
  );
}

function NodeGroupsSection() {
  const { getValue, setValue } = useFormContext();
  const nodeGroups = (getValue(["nodeGroups"]) as Record<string, Record<string, unknown>>) ?? {};
  const entries = Object.entries(nodeGroups);

  const addGroup = () => {
    const idx = entries.length;
    const name = `md${idx}`;
    setValue(["nodeGroups", name], {
      instanceType: "u1.medium",
      minReplicas: 0,
      maxReplicas: 5,
      ephemeralStorage: "20Gi",
      resources: {},
      roles: [],
      gpus: [],
    });
  };

  const removeGroup = (name: string) => {
    const updated = { ...nodeGroups };
    delete updated[name];
    setValue(["nodeGroups"], updated);
  };

  const updateGroup = (name: string, key: string, value: unknown) => {
    setValue(["nodeGroups", name, key], value);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">Node Groups</h3>
      {entries.map(([name, ng]) => (
        <div key={name} className="rounded-xl border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">{name}</Badge>
              <span className="text-sm text-muted-foreground">
                {INSTANCE_TYPES.find((t) => t.value === ng.instanceType)?.specs}
              </span>
            </div>
            {entries.length > 1 && (
              <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => removeGroup(name)}>
                Remove
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Instance Type</Label>
              <Select value={(ng.instanceType as string) ?? "u1.medium"} onValueChange={(v) => { if (v) updateGroup(name, "instanceType", v); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INSTANCE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label} — {t.specs}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Ephemeral Storage</Label>
              <Input
                value={(ng.ephemeralStorage as string) ?? "20Gi"}
                onChange={(e) => updateGroup(name, "ephemeralStorage", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Min Replicas</Label>
              <Input type="number" value={(ng.minReplicas as number) ?? 0} onChange={(e) => updateGroup(name, "minReplicas", parseInt(e.target.value) || 0)} min={0} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Max Replicas</Label>
              <Input type="number" value={(ng.maxReplicas as number) ?? 5} onChange={(e) => updateGroup(name, "maxReplicas", parseInt(e.target.value) || 1)} min={1} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Roles</Label>
            <Input
              value={((ng.roles as string[]) ?? []).join(", ")}
              onChange={(e) => updateGroup(name, "roles", e.target.value.split(",").map((r) => r.trim()).filter(Boolean))}
              placeholder="ingress-nginx, gpu-worker"
            />
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addGroup}>+ Add Node Group</Button>
    </div>
  );
}

function AddonsSection() {
  const { getValue, setValue } = useFormContext();
  const addons = (getValue(["addons"]) as Record<string, Record<string, unknown>>) ?? {};

  const toggleAddon = (key: string, hasValues: boolean) => {
    const current = addons[key];
    const enabled = !(current?.enabled ?? false);
    setValue(["addons", key], hasValues
      ? { enabled, valuesOverride: current?.valuesOverride ?? {} }
      : { enabled }
    );
  };

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">Addons</h3>
      <div className="space-y-2">
        {DEFAULT_ADDONS.map((addon) => (
          <div key={addon.key} className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div>
              <div className="text-sm font-medium">{addon.label}</div>
              <div className="text-xs text-muted-foreground">{addon.description}</div>
            </div>
            <Switch
              checked={(addons[addon.key]?.enabled as boolean) ?? false}
              onCheckedChange={() => toggleAddon(addon.key, addon.hasValues)}
            />
          </div>
        ))}
      </div>
      <div className="rounded-lg bg-muted/50 border px-4 py-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Always enabled:</span>{" "}
          Cilium CNI, CoreDNS, Vertical Pod Autoscaler
        </p>
      </div>
    </div>
  );
}

function PresetPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <Select value={value} onValueChange={(v) => { if (v) onChange(v); }}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {RESOURCE_PRESETS.map((p) => (
            <SelectItem key={p} value={p}>{p}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
