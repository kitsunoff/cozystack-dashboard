"use client";

import { useState } from "react";
import type { ComponentType } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatAge } from "@/lib/utils";
import type { AppInstance } from "@/lib/k8s/types";
import type { TabDef, ActionDef } from "@/components/registry";

interface DetailViewProps {
  instance: AppInstance;
  plural: string;
  namespace: string;
  tabs: TabDef[];
  actions?: ActionDef[];
}

export function DetailView({ instance, plural, namespace, tabs, actions }: DetailViewProps) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.key ?? "");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  const ready = instance.status?.conditions?.find((c) => c.type === "Ready");
  const isReady = ready?.status === "True";

  const ActiveComponent = tabs.find((t) => t.key === activeTab)?.component;

  const handleAction = async (action: ActionDef) => {
    if (typeof action.action === "string") {
      router.push(action.action);
    } else {
      setActionLoading(action.key);
      try {
        await action.action({ plural, namespace, instance });
        await queryClient.invalidateQueries({ queryKey: ["instance", plural] });
        await queryClient.invalidateQueries({ queryKey: ["instances", plural] });
      } finally {
        setActionLoading(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Instance header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">{instance.metadata.name}</h2>
            {isReady ? (
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">Ready</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                  {ready?.reason ?? "Not Ready"}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <span>{instance.metadata.namespace}</span>
            <span>·</span>
            <span>Created {formatAge(instance.metadata.creationTimestamp)} ago</span>
            {instance.metadata.resourceVersion && (
              <>
                <span>·</span>
                <Badge variant="outline" className="text-[10px] font-mono h-4">
                  rv {instance.metadata.resourceVersion}
                </Badge>
              </>
            )}
          </div>
        </div>

        {/* Detail actions */}
        {actions && actions.length > 0 && (
          <div className="flex gap-2">
            {actions.map((action) => (
              <Button
                key={action.key}
                variant={action.variant === "destructive" ? "destructive" : "outline"}
                size="sm"
                onClick={() => handleAction(action)}
                disabled={actionLoading !== null}
              >
                {action.icon && <action.icon className={cn("h-4 w-4", actionLoading === action.key && "animate-spin")} />}
                {actionLoading === action.key ? "..." : action.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
                activeTab === tab.key
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {ActiveComponent && (
          <ActiveComponent instance={instance} plural={plural} namespace={namespace} />
        )}
      </div>
    </div>
  );
}
