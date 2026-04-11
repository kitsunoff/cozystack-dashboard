"use client";

import type { K8sEvent } from "@/lib/k8s/types";

const TYPE_STYLES: Record<string, { icon: string; color: string }> = {
  Normal: { icon: "✓", color: "text-emerald-600 bg-emerald-500/10" },
  Warning: { icon: "!", color: "text-amber-600 bg-amber-500/10" },
};

interface ActivityFeedProps {
  events: K8sEvent[];
}

export function ActivityFeed({ events }: ActivityFeedProps) {
  if (events.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
        No events
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {events.map((event) => {
        const { icon, color } = TYPE_STYLES[event.type] ?? TYPE_STYLES.Normal;
        const timestamp =
          event.lastTimestamp || event.eventTime || event.metadata.creationTimestamp || "";
        return (
          <div
            key={event.metadata.uid ?? `${event.involvedObject.name}-${timestamp}`}
            className="flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-accent/50 transition-colors"
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold shrink-0 mt-0.5 ${color}`}
            >
              {icon}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm">
                <span className="font-medium">{event.involvedObject.name}</span>
                <span className="text-muted-foreground/60 mx-1.5">·</span>
                <span className="text-xs font-medium text-muted-foreground">
                  {event.reason}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5 break-words">
                {event.message}
              </p>
            </div>
            <div className="flex flex-col items-end shrink-0 gap-0.5">
              <span className="text-xs text-muted-foreground">
                {formatRelative(timestamp)}
              </span>
              {event.count && event.count > 1 && (
                <span className="text-xs text-muted-foreground/60">
                  ×{event.count}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatRelative(timestamp: string): string {
  if (!timestamp) return "";
  const diff = Date.now() - new Date(timestamp).getTime();
  const min = 60_000;
  const hour = 60 * min;
  const day = 24 * hour;

  if (diff < 0) return "just now";
  if (diff < min) return "just now";
  if (diff < hour) return `${Math.floor(diff / min)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  return `${Math.floor(diff / day)}d ago`;
}
