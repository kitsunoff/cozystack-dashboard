"use client";

import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AppInstance } from "./types";
import type { KubeList } from "./client";

interface WatchEvent {
  type: "ADDED" | "MODIFIED" | "DELETED" | "BOOKMARK";
  object: AppInstance;
}

/**
 * Subscribe to K8s watch events via SSE and update React Query cache.
 * Connects once after initial fetch, does NOT reconnect on every resourceVersion change.
 */
export function useK8sWatch(
  apiPath: string,
  queryKey: unknown[],
  resourceVersion: string | undefined,
  enabled: boolean = true
) {
  const queryClient = useQueryClient();
  const rvRef = useRef<string | undefined>(undefined);
  const connectedRef = useRef(false);
  const backoffRef = useRef(1000); // Start at 1s, max 30s

  // Track latest resourceVersion without triggering reconnects
  useEffect(() => {
    if (resourceVersion) {
      rvRef.current = resourceVersion;
    }
  }, [resourceVersion]);

  useEffect(() => {
    if (!enabled || !rvRef.current || connectedRef.current) return;
    connectedRef.current = true;

    const rv = rvRef.current;
    const url = `/api/k8s-watch${apiPath}?resourceVersion=${rv}`;
    const es = new EventSource(url);

    es.onmessage = (event) => {
      try {
        const watchEvent = JSON.parse(event.data) as WatchEvent;
        if (watchEvent.type === "BOOKMARK") return;
        applyWatchEvent(queryClient, queryKey, watchEvent);
      } catch {
        // Ignore parse errors
      }
    };

    es.onopen = () => {
      backoffRef.current = 1000; // Reset backoff on successful connection
    };

    es.addEventListener("error", () => {
      es.close();
      connectedRef.current = false;
      // Exponential backoff before reconnect
      const delay = backoffRef.current;
      backoffRef.current = Math.min(delay * 2, 30_000);
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey });
      }, delay);
    });

    es.addEventListener("done", () => {
      es.close();
      connectedRef.current = false;
      queryClient.invalidateQueries({ queryKey });
    });

    return () => {
      es.close();
      connectedRef.current = false;
    };
  }, [apiPath, enabled, !!resourceVersion]); // eslint-disable-line react-hooks/exhaustive-deps
}

function applyWatchEvent(
  queryClient: ReturnType<typeof useQueryClient>,
  queryKey: unknown[],
  event: WatchEvent
) {
  queryClient.setQueryData<KubeList<AppInstance>>(queryKey, (old) => {
    if (!old) return old;

    const items = [...old.items];
    const idx = items.findIndex(
      (i) => i.metadata.name === event.object.metadata.name
    );

    switch (event.type) {
      case "ADDED":
        if (idx === -1) items.push(event.object);
        else items[idx] = event.object;
        break;
      case "MODIFIED":
        if (idx !== -1) items[idx] = event.object;
        else items.push(event.object);
        break;
      case "DELETED":
        if (idx !== -1) items.splice(idx, 1);
        break;
    }

    return { ...old, items };
  });
}
