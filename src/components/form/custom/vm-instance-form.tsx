"use client";

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { WizardShell } from "@/components/form/blocks/wizard-shell";
import { ExternalToggle } from "@/components/form/blocks";
import { useFormContext } from "@/components/form/form-context";
import { k8sCreate, k8sPatch } from "@/lib/k8s/client";
import { endpoints } from "@/lib/k8s/endpoints";
import { cn } from "@/lib/utils";
import type { CustomFormProps } from "../registry";

// --- Schema helpers ---

function extractEnum(schema: Record<string, unknown> | undefined, key: string): string[] | null {
  if (!schema) return null;
  const props = schema.properties as Record<string, Record<string, unknown>> | undefined;
  const prop = props?.[key];
  const e = prop?.enum as string[] | undefined;
  return e?.filter((v) => v !== "") ?? null;
}

// --- Profile display ---

const POPULAR_PROFILES = ["ubuntu", "fedora", "alpine", "centos.stream10", "rhel.9", "windows.11"];

const PROFILE_META: Record<string, { label: string; icon: string }> = {
  ubuntu: { label: "Ubuntu", icon: "🟠" },
  fedora: { label: "Fedora", icon: "🔵" },
  alpine: { label: "Alpine", icon: "🔷" },
  cirros: { label: "CirrOS", icon: "☁️" },
  sles: { label: "SLES", icon: "🟢" },
};

const PROFILE_PATTERNS: Array<{ match: RegExp; icon: string; prefix: string }> = [
  { match: /^centos/, icon: "🟣", prefix: "CentOS" },
  { match: /^opensuse/, icon: "🟢", prefix: "openSUSE" },
  { match: /^rhel/, icon: "🔴", prefix: "RHEL" },
  { match: /^windows\.2k/, icon: "🪟", prefix: "Win Server" },
  { match: /^windows/, icon: "🪟", prefix: "Windows" },
];

function profileLabel(value: string): string {
  if (PROFILE_META[value]) return PROFILE_META[value].label;
  for (const p of PROFILE_PATTERNS) {
    if (p.match.test(value)) {
      const suffix = value.replace(p.match, "").replace(/^\./, "").replace(/\./g, " ");
      return suffix ? `${p.prefix} ${suffix}` : p.prefix;
    }
  }
  return value;
}

function profileIcon(value: string): string {
  if (PROFILE_META[value]) return PROFILE_META[value].icon;
  for (const p of PROFILE_PATTERNS) {
    if (p.match.test(value)) return p.icon;
  }
  return "💿";
}

function profileCategory(value: string): string {
  if (/^(ubuntu|fedora|alpine|centos|opensuse)/.test(value)) return "Linux";
  if (/^(rhel|sles)/.test(value)) return "Enterprise";
  if (/^windows/.test(value)) return "Windows";
  if (value === "cirros") return "Minimal";
  return "Other";
}

// --- Instance types ---

const INSTANCE_TYPES = [
  { value: "u1.micro", label: "Micro", cpu: "1 vCPU", ram: "1 GiB" },
  { value: "u1.small", label: "Small", cpu: "1 vCPU", ram: "2 GiB" },
  { value: "u1.medium", label: "Medium", cpu: "2 vCPU", ram: "4 GiB" },
  { value: "u1.large", label: "Large", cpu: "4 vCPU", ram: "8 GiB" },
  { value: "u1.xlarge", label: "X-Large", cpu: "8 vCPU", ram: "16 GiB" },
  { value: "u1.2xlarge", label: "2X-Large", cpu: "16 vCPU", ram: "32 GiB" },
];

const RUN_STRATEGIES = [
  { value: "Always", description: "Always running" },
  { value: "Halted", description: "Stopped" },
  { value: "Manual", description: "Manual control" },
  { value: "RerunOnFailure", description: "Restart on failure" },
  { value: "Once", description: "Run once" },
];

// --- Main form ---

export function VMInstanceForm({
  plural, namespace, apiGroup, apiVersion, kind, backHref,
  openAPISchema, editName, editValues,
}: CustomFormProps) {
  const schema = openAPISchema ?? {};

  const handleSubmit = async (name: string, values: Record<string, unknown>, isEdit: boolean) => {
    if (isEdit) {
      await k8sPatch(
        endpoints.instance(plural, namespace, name),
        { spec: values }
      );
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
      submitLabel="VM Instance"
      editName={editName}
      existingValues={editValues}
      onSubmit={handleSubmit}
    >
      <Separator />
      <RunStrategyPicker schema={schema} />
      <Separator />
      <BootImageSection schema={schema} />
      <Separator />
      <InstanceTypePicker />
      <Separator />
      <ExternalToggle schema={schema} />
      <Separator />
      <ExternalConfig schema={schema} />
      <Separator />
      <SSHKeysSection />
      <Separator />
      <CloudInitSection />
    </WizardShell>
  );
}

// --- Inner sections using FormContext ---

function RunStrategyPicker({ schema }: { schema: Record<string, unknown> }) {
  const strategies = extractEnum(schema, "runStrategy") ?? RUN_STRATEGIES.map((s) => s.value);
  const { getValue, setValue } = useFormContext();
  const current = (getValue(["runStrategy"]) as string) ?? "Always";

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Run Strategy</Label>
      <div className="flex flex-wrap gap-2">
        {strategies.map((v) => {
          const desc = RUN_STRATEGIES.find((s) => s.value === v)?.description;
          return (
            <button
              key={v}
              type="button"
              onClick={() => setValue(["runStrategy"], v)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
                current === v
                  ? "border-foreground bg-accent ring-1 ring-foreground"
                  : "hover:border-foreground/30 hover:bg-accent/50"
              )}
            >
              {v}{desc && <span className="text-muted-foreground ml-1">— {desc}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BootImageSection({ schema }: { schema: Record<string, unknown> }) {
  const { getValue, setValue } = useFormContext();
  const profile = (getValue(["instanceProfile"]) as string) ?? "ubuntu";

  const allProfiles = useMemo(() => extractEnum(schema, "instanceProfile"), [schema]);
  const popularProfiles = useMemo(() => {
    if (!allProfiles) return POPULAR_PROFILES;
    return POPULAR_PROFILES.filter((p) => allProfiles.includes(p));
  }, [allProfiles]);
  const groupedProfiles = useMemo(() => {
    const profiles = allProfiles ?? POPULAR_PROFILES;
    const groups = new Map<string, string[]>();
    for (const p of profiles) {
      const cat = profileCategory(p);
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(p);
    }
    return groups;
  }, [allProfiles]);

  return (
    <div className="space-y-4">
      <label className="text-sm font-medium">Boot Image</label>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {popularProfiles.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setValue(["instanceProfile"], value)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 transition-all",
              profile === value
                ? "border-foreground bg-accent ring-1 ring-foreground"
                : "hover:border-foreground/30 hover:bg-accent/50"
            )}
          >
            <span className="text-xl">{profileIcon(value)}</span>
            <span className="text-xs font-medium text-center">{profileLabel(value)}</span>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">All images</Label>
        <Select value={profile} onValueChange={(v) => { if (v) setValue(["instanceProfile"], v); }}>
          <SelectTrigger className="w-full">
            <SelectValue>{profileIcon(profile)} {profileLabel(profile)}</SelectValue>
          </SelectTrigger>
          <SelectContent side="bottom" alignItemWithTrigger={false} className="max-h-72">
            {Array.from(groupedProfiles.entries()).map(([category, profiles]) => (
              <SelectGroup key={category}>
                <SelectLabel>{category}</SelectLabel>
                {profiles.map((value) => (
                  <SelectItem key={value} value={value}>
                    {profileIcon(value)} {profileLabel(value)}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function InstanceTypePicker() {
  const { getValue, setValue } = useFormContext();
  const current = (getValue(["instanceType"]) as string) ?? "u1.medium";

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Instance Type</label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {INSTANCE_TYPES.map((it) => (
          <button
            key={it.value}
            type="button"
            onClick={() => setValue(["instanceType"], it.value)}
            className={cn(
              "flex flex-col rounded-lg border px-3 py-3 text-left transition-all",
              current === it.value
                ? "border-foreground bg-accent ring-1 ring-foreground"
                : "hover:border-foreground/30 hover:bg-accent/50"
            )}
          >
            <span className="text-sm font-medium">{it.label}</span>
            <span className="text-xs text-muted-foreground mt-0.5">{it.cpu} / {it.ram}</span>
            <Badge variant="secondary" className="text-[10px] mt-1.5 w-fit">{it.value}</Badge>
          </button>
        ))}
      </div>
    </div>
  );
}

function ExternalConfig({ schema }: { schema: Record<string, unknown> }) {
  const { getValue, setValue } = useFormContext();
  const external = (getValue(["external"]) as boolean) ?? false;
  if (!external) return null;

  const method = (getValue(["externalMethod"]) as string) ?? "PortList";
  const ports = (getValue(["externalPorts"]) as number[]) ?? [22];
  const portsStr = ports.join(", ");

  return (
    <div className="space-y-4 pl-1">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Method</Label>
        <Select value={method} onValueChange={(v) => { if (v) setValue(["externalMethod"], v); }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="PortList">Port List</SelectItem>
            <SelectItem value="WholeIP">Whole IP</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {method === "PortList" && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Ports</Label>
          <Input
            value={portsStr}
            onChange={(e) => {
              const parsed = e.target.value.split(",").map((p) => parseInt(p.trim(), 10)).filter((p) => !isNaN(p));
              setValue(["externalPorts"], parsed);
            }}
            placeholder="22, 80, 443"
          />
        </div>
      )}
    </div>
  );
}

function SSHKeysSection() {
  const { getValue, setValue } = useFormContext();
  const keys = (getValue(["sshKeys"]) as string[]) ?? [];
  const keysStr = keys.join("\n");

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">SSH Public Keys</Label>
      <Textarea
        value={keysStr}
        onChange={(e) => setValue(["sshKeys"], e.target.value.split("\n").map((k) => k.trim()).filter(Boolean))}
        rows={3}
        className="font-mono text-sm"
        placeholder="ssh-ed25519 AAAA... user@host"
      />
      <p className="text-xs text-muted-foreground">One key per line</p>
    </div>
  );
}

function CloudInitSection() {
  const { getValue, setValue } = useFormContext();
  const cloudInit = (getValue(["cloudInit"]) as string) ?? "";

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Cloud Init</Label>
      <Textarea
        value={cloudInit}
        onChange={(e) => setValue(["cloudInit"], e.target.value)}
        rows={6}
        className="font-mono text-sm"
        placeholder={"#cloud-config\npackages:\n  - nginx"}
      />
      <p className="text-xs text-muted-foreground">Cloud-init configuration in YAML format</p>
    </div>
  );
}
