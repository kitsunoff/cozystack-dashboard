"use client";

import { useState } from "react";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { k8sCreate } from "@/lib/k8s/client";
import { endpoints } from "@/lib/k8s/endpoints";
import { cn } from "@/lib/utils";
import type { CustomFormProps } from "../registry";

// OS profiles with visual metadata
const OS_PROFILES = [
  { value: "ubuntu", label: "Ubuntu", icon: "🟠", category: "Linux" },
  { value: "fedora", label: "Fedora", icon: "🔵", category: "Linux" },
  { value: "centos.stream9", label: "CentOS Stream 9", icon: "🟣", category: "Linux" },
  { value: "centos.stream10", label: "CentOS Stream 10", icon: "🟣", category: "Linux" },
  { value: "alpine", label: "Alpine", icon: "🔷", category: "Linux" },
  { value: "opensuse.tumbleweed", label: "openSUSE Tumbleweed", icon: "🟢", category: "Linux" },
  { value: "rhel.9", label: "RHEL 9", icon: "🔴", category: "Enterprise" },
  { value: "rhel.10", label: "RHEL 10", icon: "🔴", category: "Enterprise" },
  { value: "sles", label: "SLES", icon: "🟢", category: "Enterprise" },
  { value: "windows.11", label: "Windows 11", icon: "🪟", category: "Windows" },
  { value: "windows.2k22", label: "Windows Server 2022", icon: "🪟", category: "Windows" },
  { value: "windows.2k25", label: "Windows Server 2025", icon: "🪟", category: "Windows" },
  { value: "cirros", label: "CirrOS", icon: "☁️", category: "Minimal" },
];

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
}: CustomFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [instanceProfile, setInstanceProfile] = useState("ubuntu");
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
      const resource = {
        apiVersion: `${apiGroup}/${apiVersion}`,
        kind,
        metadata: { name: name.trim(), namespace },
        spec: {
          instanceProfile,
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
          disks: disks.filter((d) => d.name),
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
              {RUN_STRATEGIES.map((s) => (
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

      {/* OS Profile */}
      <Section title="Operating System">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {OS_PROFILES.map((os) => (
            <button
              key={os.value}
              type="button"
              onClick={() => setInstanceProfile(os.value)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all",
                instanceProfile === os.value
                  ? "border-foreground bg-accent ring-1 ring-foreground"
                  : "hover:border-foreground/30 hover:bg-accent/50"
              )}
            >
              <span className="text-lg">{os.icon}</span>
              <div>
                <div className="text-sm font-medium">{os.label}</div>
                <div className="text-xs text-muted-foreground">{os.category}</div>
              </div>
            </button>
          ))}
        </div>
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
