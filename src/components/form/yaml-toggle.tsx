"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import YAML from "yaml";
import { useFormContext } from "./form-context";
import { YamlEditor } from "./yaml-editor";
import { cn } from "@/lib/utils";

interface FormYamlToggleProps {
  children: React.ReactNode;
}

export function FormYamlToggle({ children }: FormYamlToggleProps) {
  const { values, setAllValues } = useFormContext();
  const [mode, setMode] = useState<"form" | "yaml">("form");
  const [yamlText, setYamlText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const lastSyncedRef = useRef<string>("");

  useEffect(() => {
    if (mode === "yaml") {
      const text = YAML.stringify(values, { indent: 2, lineWidth: 0 });
      setYamlText(text);
      lastSyncedRef.current = text;
      setParseError(null);
    }
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyYamlToForm = useCallback(() => {
    if (yamlText === lastSyncedRef.current) return true;

    try {
      const parsed = YAML.parse(yamlText);
      if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
        setParseError("YAML must be a mapping (key: value), not a scalar or list");
        return false;
      }
      setAllValues(parsed as Record<string, unknown>);
      setParseError(null);
      return true;
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Invalid YAML");
      return false;
    }
  }, [yamlText, setAllValues]);

  const switchTo = (tab: "form" | "yaml") => {
    if (tab === mode) return;
    if (tab === "form" && mode === "yaml") {
      if (!applyYamlToForm()) return;
    }
    setMode(tab);
  };

  return (
    <div className="space-y-4">
      {/* Tab buttons */}
      <div className="inline-flex items-center rounded-lg bg-muted p-[3px] text-muted-foreground">
        <button
          type="button"
          onClick={() => switchTo("form")}
          className={cn(
            "inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium transition-colors",
            mode === "form"
              ? "bg-background text-foreground shadow-sm"
              : "hover:text-foreground"
          )}
        >
          Form
        </button>
        <button
          type="button"
          onClick={() => switchTo("yaml")}
          className={cn(
            "inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium transition-colors",
            mode === "yaml"
              ? "bg-background text-foreground shadow-sm"
              : "hover:text-foreground"
          )}
        >
          YAML
        </button>
      </div>

      {/* Form content — always mounted, hidden when in YAML mode */}
      <div className={mode !== "form" ? "hidden" : undefined}>
        {children}
      </div>

      {/* YAML editor — only visible in YAML mode */}
      {mode === "yaml" && (
        <div className="space-y-3">
          <YamlEditor value={yamlText} onChange={(text) => { setYamlText(text); setParseError(null); }} />
          {parseError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
              {parseError}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Edit the spec as YAML. Switching back to Form applies changes automatically.
          </p>
        </div>
      )}
    </div>
  );
}
