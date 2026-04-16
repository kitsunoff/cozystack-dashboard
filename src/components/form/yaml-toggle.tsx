"use client";

import { useState, useEffect, useRef } from "react";
import YAML from "yaml";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useFormContext } from "./form-context";

interface FormYamlToggleProps {
  children: React.ReactNode;
}

export function FormYamlToggle({ children }: FormYamlToggleProps) {
  const { values, setAllValues } = useFormContext();
  const [mode, setMode] = useState<"form" | "yaml">("form");
  const [yamlText, setYamlText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const lastSyncedRef = useRef<string>("");

  // Sync form values → YAML when switching to YAML tab
  useEffect(() => {
    if (mode === "yaml") {
      const text = YAML.stringify(values, { indent: 2, lineWidth: 0 });
      setYamlText(text);
      lastSyncedRef.current = text;
      setParseError(null);
    }
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync YAML → form values when switching back to form tab
  const applyYamlToForm = () => {
    if (yamlText === lastSyncedRef.current) return;

    try {
      const parsed = YAML.parse(yamlText);
      if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
        setParseError("YAML must be a mapping (key: value), not a scalar or list");
        return;
      }
      setAllValues(parsed as Record<string, unknown>);
      setParseError(null);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Invalid YAML");
    }
  };

  const handleTabChange = (tab: string | null) => {
    if (!tab) return;
    if (tab === "form" && mode === "yaml") {
      applyYamlToForm();
      if (parseError) return; // stay on YAML if parse failed
    }
    setMode(tab as "form" | "yaml");
  };

  const handleYamlChange = (text: string) => {
    setYamlText(text);
    setParseError(null);
  };

  return (
    <Tabs value={mode} onValueChange={handleTabChange}>
      <TabsList variant="default" className="mb-4">
        <TabsTrigger value="form">Form</TabsTrigger>
        <TabsTrigger value="yaml">YAML</TabsTrigger>
      </TabsList>

      <TabsContent value="form">
        {children}
      </TabsContent>

      <TabsContent value="yaml">
        <div className="space-y-3">
          <Textarea
            value={yamlText}
            onChange={(e) => handleYamlChange(e.target.value)}
            className="font-mono text-xs leading-relaxed min-h-[400px]"
            spellCheck={false}
          />
          {parseError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
              {parseError}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Edit the spec as YAML. Switching back to Form applies changes automatically.
          </p>
        </div>
      </TabsContent>
    </Tabs>
  );
}
