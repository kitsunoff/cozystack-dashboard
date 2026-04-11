"use client";

import { useFormContext } from "@/components/form/form-context";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { FormBlockProps } from "./types";
import { schemaHas, schemaDefault } from "./types";

/**
 * External access toggle.
 * Shows nothing if schema has no "external".
 */
export function ExternalToggle({ schema, basePath = [] }: FormBlockProps) {
  if (!schemaHas(schema, "external")) return null;

  const { getValue, setValue } = useFormContext();
  const path = [...basePath, "external"];
  const current = (getValue(path) as boolean) ?? schemaDefault<boolean>(schema, "external") ?? false;

  return (
    <div className="flex items-center justify-between rounded-lg border px-4 py-3">
      <div>
        <Label className="text-sm font-medium">External Access</Label>
        <p className="text-xs text-muted-foreground">
          Expose service outside the cluster
        </p>
      </div>
      <Switch
        checked={current}
        onCheckedChange={(v) => setValue(path, v)}
      />
    </div>
  );
}
