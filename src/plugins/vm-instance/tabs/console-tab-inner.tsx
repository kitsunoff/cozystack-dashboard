"use client";

import { useRef, useMemo } from "react";
import { Monitor, Power, Keyboard, Unplug, Loader2, AlertCircle, MonitorOff } from "lucide-react";
import type { AppInstance } from "@/lib/k8s/types";
import { useReleasePrefix } from "@/lib/k8s/hooks";
import { useVncConnection } from "../hooks/use-vnc-connection";
import { k8sPatch } from "@/lib/k8s/client";
import { endpoints } from "@/lib/k8s/endpoints";

function getVmState(instance: AppInstance): "stopped" | "starting" | "ready" {
  const strategy = instance.spec.runStrategy as string | undefined;
  if (strategy === "Halted") return "stopped";

  const ready = instance.status?.conditions?.find((c) => c.type === "Ready");
  if (ready?.status === "True") return "ready";

  return "starting";
}

function buildWsUrl(namespace: string, vmiName: string): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/api/k8s-ws/apis/subresources.kubevirt.io/v1/namespaces/${namespace}/virtualmachineinstances/${vmiName}/vnc`;
}

export function VmConsoleTabInner({ instance }: { instance: AppInstance }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const releasePrefix = useReleasePrefix("vminstances");
  const namespace = instance.metadata.namespace ?? "";
  const vmiName = `${releasePrefix}${instance.metadata.name}`;
  const vmState = getVmState(instance);

  const wsUrl = useMemo(
    () => (vmState === "ready" ? buildWsUrl(namespace, vmiName) : null),
    [vmState, namespace, vmiName],
  );

  const { status, error, connect, disconnect, sendCtrlAltDel } = useVncConnection(containerRef, wsUrl);

  const showCanvas = status === "connecting" || status === "connected";
  const showOverlay = !showCanvas;

  return (
    <div className="flex flex-col gap-2">
      {/* Toolbar */}
      {showCanvas && (
        <div className="flex items-center gap-2">
          {status === "connecting" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Connecting...
            </div>
          )}
          {status === "connected" && (
            <>
              <div className="flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Connected
              </div>
              <div className="flex-1" />
              <button
                onClick={sendCtrlAltDel}
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
                title="Send Ctrl+Alt+Del"
              >
                <Keyboard className="h-3.5 w-3.5" />
                Ctrl+Alt+Del
              </button>
              <button
                onClick={disconnect}
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors text-destructive"
                title="Disconnect"
              >
                <Unplug className="h-3.5 w-3.5" />
                Disconnect
              </button>
            </>
          )}
        </div>
      )}

      {/* VNC container — always visible with dimensions so noVNC canvas renders correctly */}
      <div className="relative rounded-xl border bg-black overflow-hidden" style={{ minHeight: "480px" }}>
        <div ref={containerRef} className="absolute inset-0" />

        {/* Status overlays — positioned over the canvas */}
        {showOverlay && (
          <div className="absolute inset-0 flex items-center justify-center bg-card">
            {vmState === "stopped" && (
              <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <MonitorOff className="h-12 w-12" />
                <p className="text-sm">VM is stopped. Start the VM to access the console.</p>
                <button
                  onClick={() => {
                    k8sPatch(endpoints.instance("vminstances", namespace, instance.metadata.name), {
                      spec: { runStrategy: "Always" },
                    });
                  }}
                  className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Power className="h-4 w-4" />
                  Start VM
                </button>
              </div>
            )}

            {vmState === "starting" && (
              <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <Loader2 className="h-12 w-12 animate-spin" />
                <p className="text-sm">VM is starting. Console will be available once the VM is running.</p>
              </div>
            )}

            {vmState === "ready" && (status === "idle" || status === "disconnected") && (
              <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <Monitor className="h-12 w-12" />
                <p className="text-sm">
                  {status === "disconnected" ? "Console session ended." : "Connect to the VM console."}
                </p>
                <button
                  onClick={connect}
                  className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Monitor className="h-4 w-4" />
                  {status === "disconnected" ? "Reconnect" : "Connect"}
                </button>
              </div>
            )}

            {vmState === "ready" && status === "error" && (
              <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <p className="text-sm text-destructive">{error ?? "Connection failed"}</p>
                <button
                  onClick={connect}
                  className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
