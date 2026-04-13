"use client";

import { useEffect } from "react";
import { useFormContext } from "@/components/form/form-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormBlockProps } from "./types";
import { schemaHas, schemaDefault, schemaDescription, initFormValue } from "./types";

/**
 * Single-line text input with label and description from schema.
 * props.field: string — field key
 * props.placeholder: string
 * props.type: "text" | "password" — input type
 */
export function TextInput({ schema, basePath = [], title, props }: FormBlockProps) {
  const fieldKey = (props?.field as string) ?? "value";
  const { getValue, setValue } = useFormContext();
  const path = [...basePath, fieldKey];
  const defaultVal = schemaDefault<string>(schema, fieldKey) ?? "";
  const placeholder = (props?.placeholder as string) ?? "";
  const inputType = (props?.type as string) ?? "text";
  const description = schemaDescription(schema, fieldKey);
  const label = title ?? fieldKey;

  useEffect(() => {
    initFormValue(getValue, setValue, path, defaultVal);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!schemaHas(schema, fieldKey)) return null;

  const value = (getValue(path) as string) ?? defaultVal;

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <Input
        value={value}
        onChange={(e) => setValue(path, e.target.value)}
        placeholder={placeholder}
        type={inputType}
        className="font-mono text-sm"
      />
    </div>
  );
}
