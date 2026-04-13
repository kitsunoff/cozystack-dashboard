"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
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
import { k8sDelete } from "@/lib/k8s/client";
import { endpoints } from "@/lib/k8s/endpoints";
import { LiveAge } from "@/components/ui/live-age";
import { getColumns } from "@/components/registry";
import type { ColumnDef } from "@/components/registry";

// Activate registrations
import "@/components/registry/registrations";

// --- Default columns for unregistered resources ---

function defaultStatusRender(i: AppInstance) {
  const ready = i.status?.conditions?.find((c) => c.type === "Ready");
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

const defaultColumns: ColumnDef[] = [
  { key: "status", label: "Status", render: defaultStatusRender },
  { key: "replicas", label: "Replicas", render: (i) => <span className="text-sm tabular-nums">{String(i.spec.replicas ?? "—")}</span> },
  { key: "preset", label: "Preset", render: (i) => i.spec.resourcesPreset ? <Badge variant="secondary" className="text-xs font-normal">{String(i.spec.resourcesPreset)}</Badge> : <span className="text-sm text-muted-foreground">—</span> },
  { key: "storage", label: "Storage", render: (i) => <span className="text-sm tabular-nums text-muted-foreground">{String(i.spec.size ?? "—")}</span> },
  { key: "age", label: "Age", render: (i) => <LiveAge timestamp={i.metadata.creationTimestamp} className="text-sm text-muted-foreground" /> },
];

function resolveColumns(plural: string): ColumnDef[] {
  return getColumns(plural) ?? defaultColumns;
}

// --- Table ---

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
  const columns = resolveColumns(plural);

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
        <Link href={`/${namespace}/${plural}/new`}>
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
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search instances..."
          className="h-9 w-full rounded-lg border bg-transparent pl-9 pr-3 text-sm outline-none transition-colors focus:border-ring"
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
                    href={`/${namespace}/${plural}/${instance.metadata.name}`}
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
                  <RowActions
                    plural={plural}
                    namespace={namespace}
                    name={instance.metadata.name}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// --- Row Actions ---

function RowActions({
  plural,
  namespace,
  name,
}: {
  plural: string;
  namespace: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleOpen = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.right - 176 });
    }
    setOpen(!open);
    setConfirmDelete(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await k8sDelete(endpoints.instance(plural, namespace, name));
      setOpen(false);
      // Watch will pick up the deletionTimestamp → status shows "Deleting"
      // Then DELETED event will remove the row
    } catch {
      setDeleting(false);
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleOpen}
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
          <div
            className="fixed z-50 w-44 rounded-lg border bg-popover text-popover-foreground shadow-lg py-1"
            style={{ top: pos.top, left: pos.left }}
          >
            <button
              onClick={() => {
                setOpen(false);
                router.push(`/${namespace}/${plural}/${name}`);
              }}
              className="flex w-full px-3 py-1.5 text-sm text-left hover:bg-accent rounded-sm transition-colors"
            >
              View Details
            </button>
            <button
              onClick={() => {
                setOpen(false);
                router.push(`/${namespace}/${plural}/${name}/edit`);
              }}
              className="flex w-full px-3 py-1.5 text-sm text-left hover:bg-accent rounded-sm transition-colors"
            >
              Edit
            </button>
            <div className="mx-1 my-1 h-px bg-border" />
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex w-full px-3 py-1.5 text-sm text-left text-destructive hover:bg-destructive/10 rounded-sm transition-colors"
            >
              {deleting ? "Deleting..." : confirmDelete ? "Confirm Delete" : "Delete"}
            </button>
          </div>
        </>
      )}
    </>
  );
}
