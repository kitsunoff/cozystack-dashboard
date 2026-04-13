import type { ComponentType } from "react";
import type { AppInstance } from "@/lib/k8s/types";
import type { ResourceComponentProps, ColumnDef } from "@/components/registry/types";
import { LiveAge } from "@/components/ui/live-age";

export const asTab = (C: ComponentType<{ instance: AppInstance }>) =>
  C as ComponentType<ResourceComponentProps>;

export function StatusDot({ color, pulse }: { color: string; pulse?: boolean }) {
  return <span className={`h-2 w-2 rounded-full ${color} ${pulse ? "animate-pulse" : ""}`} />;
}

export function StatusRow({ dotColor, textColor, label, pulse }: { dotColor: string; textColor: string; label: string; pulse?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <StatusDot color={dotColor} pulse={pulse} />
      <span className={`text-sm ${textColor}`}>{label}</span>
    </div>
  );
}

export function defaultStatus(i: AppInstance) {
  if (i.metadata.deletionTimestamp) {
    return <StatusRow dotColor="bg-red-500" textColor="text-red-700 dark:text-red-400" label="Deleting" pulse />;
  }
  const ready = i.status?.conditions?.find((c) => c.type === "Ready");
  if (!ready) {
    return <span className="inline-flex items-center rounded-4xl bg-secondary text-secondary-foreground px-2 py-0.5 text-xs font-medium">Unknown</span>;
  }
  return ready.status === "True"
    ? <StatusRow dotColor="bg-emerald-500" textColor="text-emerald-700 dark:text-emerald-400" label="Ready" />
    : <StatusRow dotColor="bg-amber-500" textColor="text-amber-700 dark:text-amber-400" label="Not Ready" />;
}

export const ageColumn: ColumnDef = {
  key: "age",
  label: "Age",
  render: (i) => <LiveAge timestamp={i.metadata.creationTimestamp} className="text-sm text-muted-foreground" />,
};
