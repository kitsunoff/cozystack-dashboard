"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type RFB from "@novnc/novnc/core/rfb.js";

export type VncStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";

export interface UseVncConnectionResult {
  status: VncStatus;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  sendCtrlAltDel: () => void;
}

export function useVncConnection(
  containerRef: React.RefObject<HTMLDivElement | null>,
  wsUrl: string | null,
): UseVncConnectionResult {
  const [status, setStatus] = useState<VncStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const rfbRef = useRef<RFB | null>(null);

  const cleanup = useCallback(() => {
    if (rfbRef.current) {
      try {
        rfbRef.current.disconnect();
      } catch {
        // Already disconnected
      }
      rfbRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!containerRef.current || !wsUrl) return;

    cleanup();
    setError(null);
    setStatus("connecting");

    import("@novnc/novnc/core/rfb.js").then(({ default: RFBClass }) => {
      if (!containerRef.current) return;

      try {
        const rfb = new RFBClass(containerRef.current, wsUrl, {
          wsProtocols: ["binary"],
        });
        rfb.scaleViewport = true;

        rfb.addEventListener("connect", () => {
          setStatus("connected");
        });

        rfb.addEventListener("disconnect", ((e: CustomEvent<{ clean: boolean }>) => {
          rfbRef.current = null;
          if (e.detail.clean) {
            setStatus("disconnected");
          } else {
            setStatus("error");
            setError("Connection lost");
          }
        }) as EventListener);

        rfb.addEventListener("securityfailure", ((e: CustomEvent<{ status: number; reason: string }>) => {
          rfbRef.current = null;
          setStatus("error");
          setError(`Security failure: ${e.detail.reason}`);
        }) as EventListener);

        rfbRef.current = rfb;
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Failed to connect");
      }
    }).catch((err) => {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to load VNC module");
    });
  }, [containerRef, wsUrl, cleanup]);

  const disconnect = useCallback(() => {
    cleanup();
    setStatus("disconnected");
  }, [cleanup]);

  const sendCtrlAltDel = useCallback(() => {
    rfbRef.current?.sendCtrlAltDel();
  }, []);

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup]);

  return { status, error, connect, disconnect, sendCtrlAltDel };
}
