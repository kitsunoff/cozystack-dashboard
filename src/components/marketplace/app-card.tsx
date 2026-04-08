"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getServiceColor } from "@/lib/service-meta";
import type { MarketplacePanelSpec } from "@/lib/k8s/types";

interface AppCardProps {
  spec: MarketplacePanelSpec;
  namespace: string;
}

export function AppCard({ spec, namespace }: AppCardProps) {
  const color = getServiceColor(spec.name);
  const tag = spec.tags[0];

  return (
    <Link href={`/apps/${spec.plural}?namespace=${namespace}`}>
      <div className="group flex flex-col justify-between rounded-xl border bg-card p-5 h-full transition-all hover:border-foreground/20 hover:shadow-sm">
        {/* Header */}
        <div>
          <div className="flex items-start justify-between mb-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${color}15` }}
            >
              {spec.icon ? (
                <img
                  src={`data:image/svg+xml;base64,${spec.icon}`}
                  alt={spec.name}
                  className="h-6 w-6"
                />
              ) : (
                <span className="text-base font-bold" style={{ color }}>
                  {spec.name.charAt(0)}
                </span>
              )}
            </div>
            {tag && (
              <Badge
                variant="secondary"
                className="text-xs px-2 py-0.5 font-normal"
              >
                {tag}
              </Badge>
            )}
          </div>

          <div className="text-sm font-medium mb-1">{spec.name}</div>
          <div className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
            {spec.description}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end mt-4 pt-3 border-t border-transparent group-hover:border-border transition-colors">
          <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            Deploy &rarr;
          </span>
        </div>
      </div>
    </Link>
  );
}
