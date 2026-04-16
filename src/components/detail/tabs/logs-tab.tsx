"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import type { AppInstance, Pod } from "@/lib/k8s/types";
import { useInstancePods } from "@/lib/k8s/hooks";
import { useLogStream } from "@/hooks/use-log-stream";
import type { LogStreamStatus } from "@/hooks/use-log-stream";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  instance: AppInstance;
  plural?: string;
  namespace?: string;
}

export function LogsTab({ instance, plural, namespace }: Props) {
  const ns = namespace ?? instance.metadata.namespace ?? "";
  const instanceName = instance.metadata.name;

  const { data: pods, isLoading: podsLoading } = useInstancePods(
    ns,
    plural ?? "",
    instanceName
  );

  const [selectedPod, setSelectedPod] = useState("");
  const [selectedContainer, setSelectedContainer] = useState("");

  // Auto-select first pod
  useEffect(() => {
    if (pods && pods.length > 0 && !selectedPod) {
      setSelectedPod(pods[0].metadata.name);
    }
  }, [pods, selectedPod]);

  // Auto-select first container when pod changes
  const containers = useMemo(() => {
    if (!pods || !selectedPod) return [];
    const pod = pods.find((p) => p.metadata.name === selectedPod);
    if (!pod) return [];
    return [
      ...(pod.spec.initContainers ?? []).map((c) => ({
        name: c.name,
        init: true,
      })),
      ...pod.spec.containers.map((c) => ({ name: c.name, init: false })),
    ];
  }, [pods, selectedPod]);

  useEffect(() => {
    if (containers.length > 0) {
      const firstNonInit = containers.find((c) => !c.init);
      setSelectedContainer(firstNonInit?.name ?? containers[0].name);
    } else {
      setSelectedContainer("");
    }
  }, [containers]);

  const { status, lines, error, clear } = useLogStream({
    namespace: ns,
    pod: selectedPod,
    container: selectedContainer,
    enabled: !!selectedPod,
  });

  if (podsLoading) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Loading pods...
      </div>
    );
  }

  if (!pods || pods.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No pods found for this instance
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <PodSelector
          pods={pods}
          selected={selectedPod}
          onChange={(v) => {
            setSelectedPod(v);
            clear();
          }}
        />
        {containers.length > 1 && (
          <ContainerSelector
            containers={containers}
            selected={selectedContainer}
            onChange={(v) => {
              setSelectedContainer(v);
              clear();
            }}
          />
        )}
        <StreamStatus status={status} error={error} />
      </div>

      {/* Log viewer */}
      <LogViewer lines={lines} status={status} error={error} />
    </div>
  );
}

function PodSelector({
  pods,
  selected,
  onChange,
}: {
  pods: Pod[];
  selected: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Pod</span>
      <Select value={selected} onValueChange={(v) => { if (v) onChange(v); }}>
        <SelectTrigger size="sm" className="font-mono">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {pods.map((p) => (
            <SelectItem key={p.metadata.name} value={p.metadata.name} className="font-mono text-xs">
              {p.metadata.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ContainerSelector({
  containers,
  selected,
  onChange,
}: {
  containers: { name: string; init: boolean }[];
  selected: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Container</span>
      <Select value={selected} onValueChange={(v) => { if (v) onChange(v); }}>
        <SelectTrigger size="sm" className="font-mono">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {containers.map((c) => (
            <SelectItem key={c.name} value={c.name} className="font-mono text-xs">
              {c.name}{c.init ? " (init)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function StreamStatus({
  status,
  error,
}: {
  status: LogStreamStatus;
  error: string | null;
}) {
  return (
    <div className="flex items-center gap-1.5 ml-auto text-xs">
      <span
        className={cn("h-2 w-2 rounded-full", {
          "bg-emerald-500": status === "streaming",
          "bg-amber-500 animate-pulse": status === "connecting",
          "bg-gray-400": status === "idle" || status === "ended",
          "bg-red-500": status === "error",
        })}
      />
      <span className="text-muted-foreground">
        {status === "streaming" && "Live"}
        {status === "connecting" && "Connecting..."}
        {status === "ended" && "Stream ended"}
        {status === "error" && (error ? `Error: ${error.slice(0, 80)}` : "Error")}
        {status === "idle" && "Idle"}
      </span>
    </div>
  );
}

type LogLevel = "error" | "warn" | "info";

const ERROR_RE = /\b(?:error|fatal|panic|exception)\b/i;
const WARN_RE = /\b(?:warn(?:ing)?)\b/i;

function detectLevel(line: string): LogLevel {
  if (ERROR_RE.test(line)) return "error";
  if (WARN_RE.test(line)) return "warn";
  return "info";
}

const LEVEL_BORDER: Record<LogLevel, string> = {
  error: "border-l-red-500",
  warn: "border-l-amber-500",
  info: "border-l-emerald-500",
};

function LogViewer({
  lines,
  status,
  error,
}: {
  lines: string;
  status: LogStreamStatus;
  error: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  const parsed = useMemo(() => {
    if (!lines) return [];
    const raw = lines.endsWith("\n") ? lines.slice(0, -1) : lines;
    return raw.split("\n").map((text) => ({
      text,
      level: detectLevel(text),
    }));
  }, [lines]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    autoScrollRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  };

  useEffect(() => {
    const el = containerRef.current;
    if (el && autoScrollRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [lines]);

  if (!lines) {
    return (
      <div className="rounded-xl border bg-muted/30 px-4 py-3 text-xs font-mono min-h-[200px] flex items-center justify-center">
        <span className="text-muted-foreground">
          {status === "connecting"
            ? "Connecting to pod logs..."
            : status === "error"
              ? error ?? "Failed to stream logs"
              : "Waiting for logs..."}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="rounded-xl border bg-muted/30 py-1 text-xs font-mono overflow-auto max-h-[600px] min-h-[200px]"
    >
      {parsed.map((line, i) => (
        <div
          key={i}
          className={cn(
            "border-l-2 px-3 py-px whitespace-pre-wrap break-all leading-relaxed",
            LEVEL_BORDER[line.level]
          )}
        >
          {line.text}
        </div>
      ))}
    </div>
  );
}
