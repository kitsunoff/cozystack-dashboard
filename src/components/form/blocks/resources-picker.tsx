"use client";

import { useState } from "react";
import { useFormContext } from "@/components/form/form-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FormBlockProps } from "./types";
import { schemaEnum, schemaDefault, schemaHas } from "./types";

const PRESET_SPECS: Record<string, { cpu: string; memory: string }> = {
  nano: { cpu: "0.1", memory: "128Mi" },
  micro: { cpu: "0.25", memory: "256Mi" },
  small: { cpu: "0.5", memory: "512Mi" },
  medium: { cpu: "1", memory: "1Gi" },
  large: { cpu: "2", memory: "2Gi" },
  xlarge: { cpu: "4", memory: "4Gi" },
  "2xlarge": { cpu: "8", memory: "8Gi" },
};

/**
 * Resources picker — preset cards + optional custom CPU/Memory.
 * Shows nothing if schema has neither "resourcesPreset" nor "resources".
 */
export function ResourcesPicker({ schema, basePath = [], title = "Resources" }: FormBlockProps) {
  const hasPreset = schemaHas(schema, "resourcesPreset");
  const hasCustom = schemaHas(schema, "resources");
  if (!hasPreset && !hasCustom) return null;

  const { getValue, setValue } = useFormContext();
  const presets = schemaEnum(schema, "resourcesPreset") ?? Object.keys(PRESET_SPECS);
  const defaultPreset = schemaDefault<string>(schema, "resourcesPreset") ?? "micro";

  const presetPath = [...basePath, "resourcesPreset"];
  const currentPreset = (getValue(presetPath) as string) ?? defaultPreset;

  const [showCustom, setShowCustom] = useState(false);
  const cpuPath = [...basePath, "resources", "cpu"];
  const memPath = [...basePath, "resources", "memory"];
  const customCpu = (getValue(cpuPath) as string) ?? "";
  const customMem = (getValue(memPath) as string) ?? "";

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">{title}</label>

      {hasPreset && !showCustom && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {presets.map((p) => {
            const specs = PRESET_SPECS[p];
            return (
              <button
                key={p}
                type="button"
                onClick={() => setValue(presetPath, p)}
                className={cn(
                  "flex flex-col rounded-lg border px-3 py-2.5 text-left transition-all",
                  currentPreset === p
                    ? "border-foreground bg-accent ring-1 ring-foreground"
                    : "hover:border-foreground/30 hover:bg-accent/50"
                )}
              >
                <span className="text-sm font-medium capitalize">{p}</span>
                {specs && (
                  <span className="text-xs text-muted-foreground mt-0.5">
                    {specs.cpu} CPU / {specs.memory}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {hasCustom && showCustom && (
        <div className="flex gap-3">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">CPU</Label>
            <Input
              value={customCpu}
              onChange={(e) => setValue(cpuPath, e.target.value)}
              placeholder="1"
            />
          </div>
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Memory</Label>
            <Input
              value={customMem}
              onChange={(e) => setValue(memPath, e.target.value)}
              placeholder="1Gi"
            />
          </div>
        </div>
      )}

      {hasPreset && hasCustom && (
        <button
          type="button"
          onClick={() => setShowCustom(!showCustom)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showCustom ? "Use preset" : "Custom resources"}
        </button>
      )}
    </div>
  );
}
