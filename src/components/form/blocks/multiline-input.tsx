"use client";

import { useEffect } from "react";
import { useFormContext } from "@/components/form/form-context";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FormBlockProps } from "./types";
import { schemaHas, schemaDefault, initFormValue } from "./types";

/**
 * Multiline text input.
 * props.field: string — field key (default: derived from path)
 * props.rows: number — textarea rows (default: 4)
 * props.placeholder: string
 * props.mono: boolean — monospace font
 */
export function MultilineInput({ schema, basePath = [], title, props }: FormBlockProps) {
  const fieldKey = (props?.field as string) ?? "cloudInit";
  const { getValue, setValue } = useFormContext();
  const path = [...basePath, fieldKey];
  const defaultVal = schemaDefault<string>(schema, fieldKey) ?? "";
  const rows = (props?.rows as number) ?? 4;
  const placeholder = (props?.placeholder as string) ?? "";
  const mono = props?.mono !== false;

  useEffect(() => {
    initFormValue(getValue, setValue, path, defaultVal);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!schemaHas(schema, fieldKey)) return null;

  const value = (getValue(path) as string) ?? defaultVal;

  return (
    <div className="space-y-2">
      {title && <Label className="text-sm font-medium">{title}</Label>}
      <Textarea
        value={value}
        onChange={(e) => setValue(path, e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className={mono ? "font-mono text-sm" : "text-sm"}
      />
    </div>
  );
}
