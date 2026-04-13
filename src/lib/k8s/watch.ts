"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { KubeList } from "./client";

interface WatchEvent<T> {
  type: "ADDED" | "MODIFIED" | "DELETED" | "BOOKMARK";
  object: T;
}

interface HasMetadataName {
  metadata: { name: string };
}

/**
 * Subscribe to K8s watch events via SSE and update React Query cache.
 * Generic — works with any resource type that has metadata.name.
 */
export function useK8sWatch<T extends HasMetadataName>(
  apiPath: string,
  queryKey: unknown[],
  resourceVersion: string | undefined,
  enabled: boolean = true
) {
  const queryClient = useQueryClient();
  const rvRef = useRef<string | undefined>(undefined);
  const connectedRef = useRef(false);
  const backoffRef = useRef(1000);

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
        const watchEvent = JSON.parse(event.data) as WatchEvent<T>;
        if (watchEvent.type === "BOOKMARK") return;
        applyWatchEvent<T>(queryClient, queryKey, watchEvent);
      } catch {
        // Ignore parse errors
      }
    };

    es.onopen = () => {
      backoffRef.current = 1000;
    };

    es.addEventListener("error", () => {
      es.close();
      connectedRef.current = false;
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

function applyWatchEvent<T extends HasMetadataName>(
  queryClient: ReturnType<typeof useQueryClient>,
  queryKey: unknown[],
  event: WatchEvent<T>
) {
  queryClient.setQueryData<KubeList<T>>(queryKey, (old) => {
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
