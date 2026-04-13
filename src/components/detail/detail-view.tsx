"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn, formatAge } from "@/lib/utils";
import type { AppInstance } from "@/lib/k8s/types";
import type { TabDef } from "@/components/registry";
import { getStatusRenderer } from "@/components/registry";

interface DetailViewProps {
  instance: AppInstance;
  plural: string;
  namespace: string;
  tabs: TabDef[];
}

export function DetailView({ instance, plural, namespace, tabs }: DetailViewProps) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.key ?? "");

  const customStatus = getStatusRenderer(plural);
  const ActiveComponent = tabs.find((t) => t.key === activeTab)?.component;

  return (
    <div className="space-y-6">
      {/* Instance header */}
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">{instance.metadata.name}</h2>
          {customStatus ? customStatus(instance) : <DefaultStatus instance={instance} />}
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

function DefaultStatus({ instance }: { instance: AppInstance }) {
  if (instance.metadata.deletionTimestamp) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
        <span className="text-sm text-red-700 dark:text-red-400 font-medium">Deleting</span>
      </div>
    );
  }

  const ready = instance.status?.conditions?.find((c) => c.type === "Ready");
  const isReady = ready?.status === "True";

  return isReady ? (
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
  );
}
