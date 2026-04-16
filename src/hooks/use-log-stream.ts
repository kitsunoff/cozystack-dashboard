"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MAX_BUFFER_SIZE = 1_000_000; // ~1 MB scrollback
const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 3;

export type LogStreamStatus = "idle" | "connecting" | "streaming" | "ended" | "error";

export interface LogStreamOptions {
  namespace: string;
  pod: string;
  container?: string;
  tailLines?: number;
  enabled?: boolean;
}

export interface LogStreamResult {
  status: LogStreamStatus;
  lines: string;
  error: string | null;
  clear: () => void;
}

function parseK8sError(body: string, status: number): string {
  try {
    const parsed = JSON.parse(body);
    if (parsed.message) return parsed.message;
  } catch {
    // not JSON
  }
  return body || `HTTP ${status}`;
}

export function useLogStream({
  namespace,
  pod,
  container,
  tailLines = 500,
  enabled = true,
}: LogStreamOptions): LogStreamResult {
  const [status, setStatus] = useState<LogStreamStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const linesRef = useRef("");
  const [, forceRender] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const clear = useCallback(() => {
    linesRef.current = "";
    forceRender((n) => n + 1);
  }, []);

  const connect = useCallback(
    (currentTailLines: number) => {
      if (!namespace || !pod || !enabled) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setStatus("connecting");
      setError(null);

      const params = new URLSearchParams({
        namespace,
        pod,
        tailLines: String(currentTailLines),
        follow: "true",
      });
      if (container) params.set("container", container);

      fetch(`/api/k8s-logs?${params.toString()}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!mountedRef.current) return;

          if (!response.ok || !response.body) {
            const text = await response.text().catch(() => "");
            setStatus("error");
            setError(parseK8sError(text, response.status));
            return;
          }

          setStatus("streaming");
          reconnectCountRef.current = 0;

          const reader = response.body.getReader();
          const decoder = new TextDecoder("utf-8", { fatal: false });

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (!mountedRef.current) break;

              const chunk = decoder.decode(value, { stream: true });
              linesRef.current += chunk;

              // Trim to keep buffer bounded
              if (linesRef.current.length > MAX_BUFFER_SIZE) {
                const cutAt = linesRef.current.indexOf(
                  "\n",
                  linesRef.current.length - MAX_BUFFER_SIZE
                );
                linesRef.current =
                  cutAt >= 0
                    ? linesRef.current.slice(cutAt + 1)
                    : linesRef.current.slice(-MAX_BUFFER_SIZE);
              }

              forceRender((n) => n + 1);
            }
          } catch (err) {
            if ((err as Error).name === "AbortError") return;
            if (!mountedRef.current) return;
          }

          if (!mountedRef.current) return;

          // Stream ended — attempt reconnect
          if (reconnectCountRef.current < MAX_RECONNECT_ATTEMPTS) {
            reconnectCountRef.current++;
            setStatus("connecting");
            reconnectTimerRef.current = setTimeout(() => {
              if (mountedRef.current) {
                connect(0); // skip history on reconnect
              }
            }, RECONNECT_DELAY_MS);
          } else {
            setStatus("ended");
          }
        })
        .catch((err) => {
          if ((err as Error).name === "AbortError") return;
          if (!mountedRef.current) return;
          setStatus("error");
          setError((err as Error).message);
        });
    },
    [namespace, pod, container, enabled]
  );

  // Connect on parameter change
  useEffect(() => {
    mountedRef.current = true;
    reconnectCountRef.current = 0;
    linesRef.current = "";
    forceRender((n) => n + 1);

    if (enabled && namespace && pod) {
      connect(tailLines);
    } else {
      setStatus("idle");
    }

    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [namespace, pod, container, tailLines, enabled, connect]);

  return {
    status,
    lines: linesRef.current,
    error,
    clear,
  };
}
