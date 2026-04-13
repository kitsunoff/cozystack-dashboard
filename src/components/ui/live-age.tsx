"use client";

import { useState, useEffect } from "react";
import { formatAge } from "@/lib/utils";

interface LiveAgeProps {
  timestamp?: string;
  className?: string;
}

/**
 * Displays a live-updating age string (e.g. "3s", "2m", "5h").
 * Updates every second when age < 60s, every 30s when < 1h, every 60s otherwise.
 */
export function LiveAge({ timestamp, className }: LiveAgeProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!timestamp) return;

    function getInterval() {
      const diffMs = Date.now() - new Date(timestamp!).getTime();
      if (diffMs < 60_000) return 1_000;      // < 1m → every 1s
      if (diffMs < 3600_000) return 30_000;    // < 1h → every 30s
      return 60_000;                            // else → every 60s
    }

    let timer: ReturnType<typeof setTimeout>;

    function schedule() {
      timer = setTimeout(() => {
        setTick((t) => t + 1);
        schedule();
      }, getInterval());
    }

    schedule();
    return () => clearTimeout(timer);
  }, [timestamp]);

  return <span className={className}>{formatAge(timestamp)}</span>;
}
