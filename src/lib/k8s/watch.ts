"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AppInstance } from "./types";
import type { KubeList } from "./client";

interface WatchEvent {
  type: "ADDED" | "MODIFIED" | "DELETED";
  object: AppInstance;
}

/**
 * Subscribe to K8s watch events via SSE and update React Query cache.
 * Requires an initial list fetch with resourceVersion for consistent watch.
 */
export function useK8sWatch(
  apiPath: string,
  queryKey: unknown[],
  resourceVersion: string | undefined,
  enabled: boolean = true
) {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled || !resourceVersion) return;

    const url = `/api/k8s-watch${apiPath}?resourceVersion=${resourceVersion}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const watchEvent = JSON.parse(event.data) as WatchEvent;
        applyWatchEvent(queryClient, queryKey, watchEvent);
      } catch {
        // Ignore parse errors (e.g. heartbeats)
      }
    };

    es.addEventListener("error", () => {
      // Reconnect by invalidating the query — triggers refetch + new watch
      es.close();
      queryClient.invalidateQueries({ queryKey });
    });

    es.addEventListener("done", () => {
      es.close();
      queryClient.invalidateQueries({ queryKey });
    });

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [apiPath, resourceVersion, enabled]); // eslint-disable-line react-hooks/exhaustive-deps
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

    return {
      ...old,
      items,
      metadata: {
        ...old.metadata,
        resourceVersion: event.object.metadata.resourceVersion ?? old.metadata.resourceVersion,
      },
    };
  });
}
