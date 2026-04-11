"use client";

import { useEffect } from "react";
import { useFormContext } from "@/components/form/form-context";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { FormBlockProps } from "./types";
import { schemaHas, schemaDefault, initFormValue } from "./types";

export function ExternalToggle({ schema, basePath = [] }: FormBlockProps) {
  const defaultVal = schemaDefault<boolean>(schema, "external") ?? false;
  const { getValue, setValue } = useFormContext();
  const path = [...basePath, "external"];

  useEffect(() => {
    initFormValue(getValue, setValue, path, defaultVal);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!schemaHas(schema, "external")) return null;

  const current = (getValue(path) as boolean) ?? defaultVal;

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
