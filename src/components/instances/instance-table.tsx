"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { AppInstance } from "@/lib/k8s/types";

interface ColumnDef {
  key: string;
  label: string;
  render: (instance: AppInstance) => React.ReactNode;
}

// Per-resource column definitions
function getColumns(plural: string): ColumnDef[] {
  const base: ColumnDef[] = [
    {
      key: "status",
      label: "Status",
      render: (i) => <StatusBadge conditions={i.status?.conditions} />,
    },
  ];

  const age: ColumnDef = {
    key: "age",
    label: "Age",
    render: (i) => (
      <span className="text-sm text-muted-foreground">
        {formatAge(i.metadata.creationTimestamp)}
      </span>
    ),
  };

  switch (plural) {
    case "kuberneteses":
      return [
        ...base,
        { key: "version", label: "Version", render: (i) => <Badge variant="secondary" className="text-xs font-mono">{String(i.spec.version ?? "—")}</Badge> },
        { key: "cp", label: "Control Plane", render: (i) => {
          const cp = i.spec.controlPlane as { replicas?: number } | undefined;
          return <span className="text-sm tabular-nums">{cp?.replicas ?? "—"} replicas</span>;
        }},
        { key: "nodes", label: "Node Groups", render: (i) => {
          const ng = i.spec.nodeGroups as Record<string, { instanceType?: string; maxReplicas?: number }> | undefined;
          if (!ng) return <span className="text-sm text-muted-foreground">—</span>;
          const groups = Object.entries(ng);
          return (
            <div className="flex gap-1.5">
              {groups.map(([name, g]) => (
                <Badge key={name} variant="outline" className="text-xs font-normal">
                  {name}: {g.instanceType ?? "?"} (max {g.maxReplicas ?? "?"})
                </Badge>
              ))}
            </div>
          );
        }},
        { key: "host", label: "Host", render: (i) => {
          const host = i.spec.host as string | undefined;
          return host ? <span className="text-sm font-mono text-muted-foreground">{host}</span> : <span className="text-sm text-muted-foreground/50">auto</span>;
        }},
        age,
      ];

    case "vminstances":
      return [
        ...base,
        { key: "profile", label: "OS", render: (i) => <Badge variant="secondary" className="text-xs">{String(i.spec.instanceProfile ?? "—")}</Badge> },
        { key: "type", label: "Type", render: (i) => <span className="text-sm font-mono">{String(i.spec.instanceType ?? "—")}</span> },
        { key: "strategy", label: "Strategy", render: (i) => <span className="text-sm text-muted-foreground">{String(i.spec.runStrategy ?? "—")}</span> },
        { key: "external", label: "External", render: (i) => {
          if (!i.spec.external) return <span className="text-sm text-muted-foreground/50">off</span>;
          const ports = i.spec.externalPorts as number[] | undefined;
          return <Badge variant="outline" className="text-xs font-normal">{ports?.join(", ") ?? "all"}</Badge>;
        }},
        age,
      ];

    case "vmdisks":
      return [
        ...base,
        { key: "source", label: "Source", render: (i) => {
          const src = i.spec.source as { image?: { name: string }; http?: { url: string } } | undefined;
          if (src?.image) return <Badge variant="secondary" className="text-xs">{src.image.name}</Badge>;
          if (src?.http) return <span className="text-sm font-mono text-muted-foreground truncate max-w-[200px] inline-block">{src.http.url}</span>;
          return <span className="text-sm text-muted-foreground/50">empty</span>;
        }},
        { key: "storage", label: "Size", render: (i) => <span className="text-sm tabular-nums">{String(i.spec.storage ?? "—")}</span> },
        { key: "optical", label: "Type", render: (i) => i.spec.optical ? <Badge variant="outline" className="text-xs">optical</Badge> : <span className="text-sm text-muted-foreground">disk</span> },
        age,
      ];

    default:
      return [
        ...base,
        { key: "replicas", label: "Replicas", render: (i) => <span className="text-sm tabular-nums">{String(i.spec.replicas ?? "—")}</span> },
        { key: "preset", label: "Preset", render: (i) => i.spec.resourcesPreset ? <Badge variant="secondary" className="text-xs font-normal">{String(i.spec.resourcesPreset)}</Badge> : <span className="text-sm text-muted-foreground">—</span> },
        { key: "storage", label: "Storage", render: (i) => <span className="text-sm tabular-nums text-muted-foreground">{String(i.spec.size ?? "—")}</span> },
        age,
      ];
  }
}

interface InstanceTableProps {
  instances: AppInstance[] | undefined;
  plural: string;
  namespace: string;
  isLoading: boolean;
  appName?: string;
}

export function InstanceTable({
  instances,
  plural,
  namespace,
  isLoading,
  appName,
}: InstanceTableProps) {
  const [search, setSearch] = useState("");
  const columns = getColumns(plural);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!instances || instances.length === 0) {
    return (
      <div className="rounded-xl border border-dashed py-16 text-center">
        <div className="text-4xl mb-3">📦</div>
        <div className="text-base font-medium mb-1">
          No {appName ?? plural} instances yet
        </div>
        <div className="text-sm text-muted-foreground mb-4">
          Create your first instance to get started
        </div>
        <Link href={`/apps/${plural}/new?namespace=${namespace}`}>
          <Button size="sm">Create {appName ?? "Instance"}</Button>
        </Link>
      </div>
    );
  }

  const filtered = search
    ? instances.filter((i) =>
        i.metadata.name.toLowerCase().includes(search.toLowerCase())
      )
    : instances;

  return (
    <div className="space-y-3">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter instances..."
          className="h-9 w-full max-w-xs rounded-md border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/30">
              <TableHead className="text-sm font-medium">Name</TableHead>
              {columns.map((col) => (
                <TableHead key={col.key} className="text-sm font-medium">
                  {col.label}
                </TableHead>
              ))}
              <TableHead className="text-sm font-medium w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((instance) => (
              <TableRow key={instance.metadata.name} className="group">
                <TableCell className="py-3">
                  <Link
                    href={`/apps/${plural}/${instance.metadata.name}?namespace=${namespace}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {instance.metadata.name}
                  </Link>
                </TableCell>
                {columns.map((col) => (
                  <TableCell key={col.key} className="py-3">
                    {col.render(instance)}
                  </TableCell>
                ))}
                <TableCell className="py-3">
                  <RowActions />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function RowActions() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 rounded-md hover:bg-accent flex items-center justify-center"
      >
        <svg className="h-4 w-4 text-muted-foreground" fill="currentColor" viewBox="0 0 16 16">
          <circle cx="8" cy="3" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="13" r="1.5" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-50 w-36 rounded-lg border bg-card shadow-md py-1">
            <button className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent transition-colors">
              View YAML
            </button>
            <button className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent transition-colors">
              Edit
            </button>
            <div className="border-t my-1" />
            <button className="w-full px-3 py-1.5 text-sm text-left text-destructive hover:bg-destructive/10 transition-colors">
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function StatusBadge({
  conditions,
}: {
  conditions?: { type: string; status: string }[];
}) {
  const ready = conditions?.find((c) => c.type === "Ready");
  if (!ready) {
    return <Badge variant="secondary" className="text-xs">Unknown</Badge>;
  }
  return ready.status === "True" ? (
    <div className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full bg-emerald-500" />
      <span className="text-sm text-emerald-700 dark:text-emerald-400">Ready</span>
    </div>
  ) : (
    <div className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full bg-amber-500" />
      <span className="text-sm text-amber-700 dark:text-amber-400">Not Ready</span>
    </div>
  );
}

function formatAge(timestamp?: string): string {
  if (!timestamp) return "—";
  const diff = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
