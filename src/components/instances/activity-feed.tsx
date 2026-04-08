"use client";

import type { ActivityEvent } from "./mock-data";

const EVENT_ICONS: Record<ActivityEvent["type"], { icon: string; color: string }> = {
  created: { icon: "+", color: "text-emerald-600 bg-emerald-500/10" },
  updated: { icon: "↻", color: "text-blue-600 bg-blue-500/10" },
  scaled: { icon: "⇅", color: "text-violet-600 bg-violet-500/10" },
  backup: { icon: "↓", color: "text-cyan-600 bg-cyan-500/10" },
  error: { icon: "!", color: "text-red-600 bg-red-500/10" },
  upgrade: { icon: "↑", color: "text-indigo-600 bg-indigo-500/10" },
  addon: { icon: "⊕", color: "text-teal-600 bg-teal-500/10" },
};

interface ActivityFeedProps {
  events: ActivityEvent[];
}

export function ActivityFeed({ events }: ActivityFeedProps) {
  return (
    <div className="space-y-1">
      {events.map((event) => {
        const { icon, color } = EVENT_ICONS[event.type] ?? { icon: "•", color: "text-gray-600 bg-gray-500/10" };
        return (
          <div
            key={event.id}
            className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent/50 transition-colors"
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold shrink-0 ${color}`}
            >
              {icon}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm">
                <span className="font-medium">{event.instance}</span>
                <span className="text-muted-foreground"> — {event.message}</span>
              </div>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatRelative(event.timestamp)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function formatRelative(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const min = 60_000;
  const hour = 60 * min;
  const day = 24 * hour;

  if (diff < min) return "just now";
  if (diff < hour) return `${Math.floor(diff / min)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  return `${Math.floor(diff / day)}d ago`;
}
