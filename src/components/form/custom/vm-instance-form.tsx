"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
import { k8sCreate } from "@/lib/k8s/client";
import { endpoints } from "@/lib/k8s/endpoints";
import { cn } from "@/lib/utils";
import type { CustomFormProps } from "../registry";

// Popular profiles shown as quick-pick cards
const POPULAR_PROFILES = [
  "ubuntu", "fedora", "alpine", "centos.stream10", "rhel.9", "windows.11",
];

// Visual metadata for profiles
const PROFILE_META: Record<string, { label: string; icon: string }> = {
  ubuntu: { label: "Ubuntu", icon: "🟠" },
  fedora: { label: "Fedora", icon: "🔵" },
  "fedora.arm64": { label: "Fedora ARM64", icon: "🔵" },
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
  const exact = PROFILE_META[value];
  if (exact) return exact.label;
  for (const p of PROFILE_PATTERNS) {
    if (p.match.test(value)) {
      const suffix = value.replace(p.match, "").replace(/^\./, "").replace(/\./g, " ");
      return suffix ? `${p.prefix} ${suffix}` : p.prefix;
    }
  }
  return value;
}

function profileIcon(value: string): string {
  const exact = PROFILE_META[value];
  if (exact) return exact.icon;
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

function extractProfileEnum(schema?: Record<string, unknown>): string[] | null {
  if (!schema) return null;
  const props = schema.properties as Record<string, unknown> | undefined;
  if (!props) return null;
  const instanceProfile = props.instanceProfile as Record<string, unknown> | undefined;
  if (!instanceProfile) return null;
  const enumValues = instanceProfile.enum as string[] | undefined;
  if (!enumValues || !Array.isArray(enumValues)) return null;
  return enumValues.filter((v) => v !== "");
}

function extractRunStrategyEnum(schema?: Record<string, unknown>): string[] | null {
  if (!schema) return null;
  const props = schema.properties as Record<string, unknown> | undefined;
  if (!props) return null;
  const runStrategy = props.runStrategy as Record<string, unknown> | undefined;
  if (!runStrategy) return null;
  const enumValues = runStrategy.enum as string[] | undefined;
  if (!enumValues || !Array.isArray(enumValues)) return null;
  return enumValues;
}

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

type BootSource = "preset" | "http" | "disk";

interface DiskEntry {
  name: string;
  bus: string;
}

export function VMInstanceForm({
  plural,
  namespace,
  apiGroup,
  apiVersion,
  kind,
  backHref,
  openAPISchema,
}: CustomFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamic profiles from OpenAPI schema
  const allProfiles = useMemo(
    () => extractProfileEnum(openAPISchema),
    [openAPISchema]
  );

  // Popular profiles that exist in the schema
  const popularProfiles = useMemo(() => {
    if (!allProfiles) return POPULAR_PROFILES;
    return POPULAR_PROFILES.filter((p) => allProfiles.includes(p));
  }, [allProfiles]);

  // All profiles grouped by category (for the dropdown)
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

  // Dynamic run strategies from schema
  const runStrategies = useMemo(() => {
    const enumValues = extractRunStrategyEnum(openAPISchema);
    if (!enumValues) return RUN_STRATEGIES;
    return enumValues.map((v) => ({
      value: v,
      description: RUN_STRATEGIES.find((s) => s.value === v)?.description ?? v,
    }));
  }, [openAPISchema]);

  // Form state
  const [name, setName] = useState("");
  const [bootSource, setBootSource] = useState<BootSource>("preset");
  const [instanceProfile, setInstanceProfile] = useState("ubuntu");
  const [customImageUrl, setCustomImageUrl] = useState("");
  const [existingDiskName, setExistingDiskName] = useState("");
  const [bootDiskSize, setBootDiskSize] = useState("10Gi");
  const [instanceType, setInstanceType] = useState("u1.medium");
  const [runStrategy, setRunStrategy] = useState("Always");
  const [external, setExternal] = useState(false);
  const [externalMethod, setExternalMethod] = useState("PortList");
  const [externalPorts, setExternalPorts] = useState("22");
  const [disks, setDisks] = useState<DiskEntry[]>([]);
  const [sshKeys, setSshKeys] = useState("");
  const [cloudInit, setCloudInit] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const allDisks = [...disks.filter((d) => d.name)];

      // Create boot disk for custom image sources
      if (bootSource === "http" && customImageUrl) {
        const bootDiskName = `${name.trim()}-boot`;
        await k8sCreate(endpoints.instances("vmdisks", namespace), {
          apiVersion: `${apiGroup}/${apiVersion}`,
          kind: "VMDisk",
          metadata: { name: bootDiskName, namespace },
          spec: {
            source: { http: { url: customImageUrl } },
            storage: bootDiskSize,
            storageClass: "replicated",
          },
        });
        allDisks.unshift({ name: bootDiskName, bus: "virtio" });
      } else if (bootSource === "disk" && existingDiskName) {
        allDisks.unshift({ name: existingDiskName, bus: "virtio" });
      }

      const resource = {
        apiVersion: `${apiGroup}/${apiVersion}`,
        kind,
        metadata: { name: name.trim(), namespace },
        spec: {
          ...(bootSource === "preset" && instanceProfile
            ? { instanceProfile }
            : {}),
          instanceType,
          runStrategy,
          external,
          ...(external && {
            externalMethod,
            externalPorts: externalPorts
              .split(",")
              .map((p) => parseInt(p.trim(), 10))
              .filter((p) => !isNaN(p)),
          }),
          disks: allDisks,
          sshKeys: sshKeys
            .split("\n")
            .map((k) => k.trim())
            .filter(Boolean),
          ...(cloudInit && { cloudInit }),
        },
      };

      await k8sCreate(endpoints.instances(plural, namespace), resource);
      router.push(backHref);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create VM");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Name */}
      <Section title="General">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="my-vm"
            required
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Run Strategy</Label>
          <Select value={runStrategy} onValueChange={(v) => { if (v) setRunStrategy(v); }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {runStrategies.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  <span>{s.value}</span>
                  <span className="text-muted-foreground ml-2">— {s.description}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Section>

      <Separator />

      {/* Boot Source */}
      <Section title="Boot Image">
        {/* Source type tabs */}
        <div className="flex gap-1 rounded-lg border p-1 w-fit">
          {([
            { key: "preset", label: "Preset Image" },
            { key: "http", label: "HTTP URL" },
            { key: "disk", label: "Existing Disk" },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setBootSource(tab.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                bootSource === tab.key
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Preset image picker */}
        {bootSource === "preset" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {popularProfiles.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setInstanceProfile(value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 transition-all",
                    instanceProfile === value
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
              <Select value={instanceProfile} onValueChange={(v) => { if (v) setInstanceProfile(v); }}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {profileIcon(instanceProfile)} {profileLabel(instanceProfile)}
                  </SelectValue>
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
        )}

        {/* HTTP URL source */}
        {bootSource === "http" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Image URL</Label>
              <Input
                value={customImageUrl}
                onChange={(e) => setCustomImageUrl(e.target.value)}
                placeholder="https://cloud-images.ubuntu.com/releases/24.04/release/ubuntu-24.04-server-cloudimg-amd64.img"
                type="url"
              />
              <p className="text-xs text-muted-foreground">
                Direct link to a qcow2, raw, or ISO image
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Boot Disk Size</Label>
              <Input
                value={bootDiskSize}
                onChange={(e) => setBootDiskSize(e.target.value)}
                placeholder="10Gi"
              />
            </div>
          </div>
        )}

        {/* Existing disk */}
        {bootSource === "disk" && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">VM Disk Name</Label>
            <Input
              value={existingDiskName}
              onChange={(e) => setExistingDiskName(e.target.value)}
              placeholder="my-boot-disk"
            />
            <p className="text-xs text-muted-foreground">
              Name of an existing VM Disk in this namespace
            </p>
          </div>
        )}
      </Section>

      <Separator />

      {/* Instance Type */}
      <Section title="Instance Type">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {INSTANCE_TYPES.map((it) => (
            <button
              key={it.value}
              type="button"
              onClick={() => setInstanceType(it.value)}
              className={cn(
                "flex flex-col rounded-lg border px-3 py-3 text-left transition-all",
                instanceType === it.value
                  ? "border-foreground bg-accent ring-1 ring-foreground"
                  : "hover:border-foreground/30 hover:bg-accent/50"
              )}
            >
              <div className="text-sm font-medium">{it.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {it.cpu} / {it.ram}
              </div>
              <Badge variant="secondary" className="text-[10px] mt-1.5 w-fit">
                {it.value}
              </Badge>
            </button>
          ))}
        </div>
      </Section>

      <Separator />

      {/* Disks */}
      <Section title="Disks">
        {disks.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No additional disks. The boot disk is created automatically.
          </p>
        )}
        {disks.map((disk, i) => (
          <div key={i} className="flex items-center gap-3">
            <Input
              value={disk.name}
              onChange={(e) => {
                const next = [...disks];
                next[i] = { ...next[i], name: e.target.value };
                setDisks(next);
              }}
              placeholder="disk-name"
              className="flex-1"
            />
            <Select
              value={disk.bus || "virtio"}
              onValueChange={(v) => {
                if (!v) return;
                const next = [...disks];
                next[i] = { ...next[i], bus: v };
                setDisks(next);
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="virtio">virtio</SelectItem>
                <SelectItem value="sata">sata</SelectItem>
                <SelectItem value="scsi">scsi</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => setDisks(disks.filter((_, j) => j !== i))}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setDisks([...disks, { name: "", bus: "virtio" }])}
        >
          + Add Disk
        </Button>
      </Section>

      <Separator />

      {/* Networking */}
      <Section title="Networking">
        <div className="flex items-center justify-between rounded-lg border px-4 py-3">
          <div>
            <Label className="text-sm font-medium">External Access</Label>
            <p className="text-sm text-muted-foreground">
              Expose VM ports outside the cluster
            </p>
          </div>
          <Switch checked={external} onCheckedChange={setExternal} />
        </div>

        {external && (
          <div className="space-y-4 pl-1">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Method</Label>
              <Select value={externalMethod} onValueChange={(v) => { if (v) setExternalMethod(v); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PortList">Port List</SelectItem>
                  <SelectItem value="WholeIP">Whole IP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {externalMethod === "PortList" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Ports</Label>
                <Input
                  value={externalPorts}
                  onChange={(e) => setExternalPorts(e.target.value)}
                  placeholder="22, 80, 443"
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated list of ports to expose
                </p>
              </div>
            )}
          </div>
        )}
      </Section>

      <Separator />

      {/* SSH Keys */}
      <Section title="Authentication">
        <div className="space-y-2">
          <Label className="text-sm font-medium">SSH Public Keys</Label>
          <Textarea
            value={sshKeys}
            onChange={(e) => setSshKeys(e.target.value)}
            rows={3}
            className="font-mono text-sm"
            placeholder="ssh-ed25519 AAAA... user@host"
          />
          <p className="text-xs text-muted-foreground">
            One key per line. These will be added to the VM for SSH access.
          </p>
        </div>
      </Section>

      <Separator />

      {/* Cloud Init */}
      <Section title="Cloud Init" collapsible>
        <div className="space-y-2">
          <Label className="text-sm font-medium">User Data</Label>
          <Textarea
            value={cloudInit}
            onChange={(e) => setCloudInit(e.target.value)}
            rows={6}
            className="font-mono text-sm"
            placeholder={"#cloud-config\npackages:\n  - nginx"}
          />
          <p className="text-xs text-muted-foreground">
            Cloud-init configuration in YAML format
          </p>
        </div>
      </Section>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create VM"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push(backHref)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

// Section wrapper with optional collapse
function Section({
  title,
  children,
  collapsible,
}: {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(!collapsible);

  return (
    <div>
      <button
        type="button"
        className={cn(
          "flex items-center gap-2 mb-4",
          collapsible && "cursor-pointer hover:text-foreground"
        )}
        onClick={() => collapsible && setOpen(!open)}
      >
        <h3 className="text-base font-semibold">{title}</h3>
        {collapsible && (
          <svg
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              open && "rotate-90"
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        )}
      </button>
      {open && <div className="space-y-4">{children}</div>}
    </div>
  );
}
