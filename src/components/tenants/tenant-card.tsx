"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { NamespaceInfo, ResourcePermission, OpType } from "@/lib/k8s/hooks";
import { useTenantPermissions } from "@/lib/k8s/hooks";
import { cn } from "@/lib/utils";

interface TenantCardProps {
  namespace: NamespaceInfo;
}

const MAX_VISIBLE_RESOURCES = 3;

const OP_STYLES: Record<OpType, string> = {
  read: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  write: "bg-green-500/10 text-green-600 dark:text-green-400",
  delete: "bg-red-500/10 text-red-600 dark:text-red-400",
  "*": "bg-purple-500/10 text-purple-600 dark:text-purple-400",
};

const WILDCARD_LABELS: Record<OpType, string> = {
  "*": "Full access to all resources",
  delete: "Delete access to all resources",
  write: "Write access to all resources",
  read: "Read access to all resources",
};

function formatDate(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function displayName(name: string): string {
  return name.startsWith("tenant-") ? name.slice(7) : name;
}

function PermissionTag({ perm }: { perm: ResourcePermission }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
        OP_STYLES[perm.opType]
      )}
    >
      {perm.resource}:{perm.opType}
    </span>
  );
}

export function TenantCard({ namespace: ns }: TenantCardProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const { data: perms, isLoading: permLoading } = useTenantPermissions(
    ns.name
  );

  const resources = perms?.resources ?? [];
  const visible = expanded
    ? resources
    : resources.slice(0, MAX_VISIBLE_RESOURCES);
  const remaining = resources.length - MAX_VISIBLE_RESOURCES;

  return (
    <Card className="py-5 transition-all hover:ring-foreground/20">
      <CardHeader>
        <CardTitle className="text-lg">{displayName(ns.name)}</CardTitle>
        <CardAction>
          <Badge
            variant={ns.status === "Active" ? "secondary" : "destructive"}
          >
            {ns.status}
          </Badge>
        </CardAction>
        <CardDescription className="text-sm">{ns.name}</CardDescription>
      </CardHeader>

      {/* Permissions */}
      <CardContent>
        {permLoading ? (
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-md" />
            <Skeleton className="h-5 w-20 rounded-md" />
            <Skeleton className="h-5 w-14 rounded-md" />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Wildcard access banner */}
            {perms?.wildcardOp && (
              <div className={cn(
                "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium",
                OP_STYLES[perms.wildcardOp]
              )}>
                <ShieldCheck className="h-3.5 w-3.5" />
                {WILDCARD_LABELS[perms.wildcardOp]}
              </div>
            )}

            {/* Specific resource permissions */}
            {visible.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {visible.map((p) => (
                  <PermissionTag key={p.resource} perm={p} />
                ))}
                {!expanded && remaining > 0 && (
                  <button
                    type="button"
                    onClick={() => setExpanded(true)}
                    className="inline-flex items-center px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    +{remaining} more
                  </button>
                )}
                {expanded && remaining > 0 && (
                  <button
                    type="button"
                    onClick={() => setExpanded(false)}
                    className="inline-flex items-center px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    show less
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardContent className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Created {formatDate(ns.creationTimestamp)}
        </p>
        <Button
          onClick={() => router.push(`/marketplace?namespace=${ns.name}`)}
        >
          Enter
          <ArrowRight data-icon="inline-end" />
        </Button>
      </CardContent>
    </Card>
  );
}
