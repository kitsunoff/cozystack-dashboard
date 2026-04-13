"use client";

import { useEffect } from "react";
import { useFormContext } from "@/components/form/form-context";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { FormBlockProps } from "./types";
import { schemaHas, schemaDefault, initFormValue, schemaDescription } from "./types";

/**
 * Generic boolean toggle with label and description.
 * props.field: string — field key
 * props.description: string — override description
 */
export function BooleanToggle({ schema, basePath = [], title, props }: FormBlockProps) {
  const fieldKey = (props?.field as string) ?? "enabled";
  const { getValue, setValue } = useFormContext();
  const path = [...basePath, fieldKey];
  const defaultVal = schemaDefault<boolean>(schema, fieldKey) ?? false;
  const description = (props?.description as string) ?? schemaDescription(schema, fieldKey);

  useEffect(() => {
    initFormValue(getValue, setValue, path, defaultVal);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!schemaHas(schema, fieldKey)) return null;

  const value = (getValue(path) as boolean) ?? defaultVal;

  return (
    <div className="flex items-center justify-between rounded-lg border px-4 py-3">
      <div>
        {title && <Label className="text-sm font-medium">{title}</Label>}
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <Switch checked={value} onCheckedChange={(v) => setValue(path, v)} />
    </div>
  );
}
