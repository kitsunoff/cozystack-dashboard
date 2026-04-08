"use client";

import type { MarketplacePanelSpec } from "@/lib/k8s/types";

interface InstanceHeaderProps {
  panel: MarketplacePanelSpec | undefined;
  isLoading: boolean;
}

export function InstanceHeader({ panel, isLoading }: InstanceHeaderProps) {
  if (isLoading || !panel) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 animate-pulse rounded-md bg-muted" />
        <div className="h-5 w-32 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background">
        {panel.icon ? (
          <img
            src={`data:image/svg+xml;base64,${panel.icon}`}
            alt={panel.name}
            className="h-5 w-5"
          />
        ) : (
          <span className="text-xs font-medium text-muted-foreground">
            {panel.name.charAt(0)}
          </span>
        )}
      </div>
      <div>
        <h1 className="text-lg font-semibold">{panel.name}</h1>
        <p className="text-xs text-muted-foreground">{panel.description}</p>
      </div>
    </div>
  );
}
