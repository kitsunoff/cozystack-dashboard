"use client";

import { useEffect } from "react";
import { useFormContext } from "@/components/form/form-context";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FormBlockProps } from "./types";
import { schemaHas, schemaDefault, initFormValue } from "./types";

/**
 * String list input — textarea where each line is an array item.
 * props.field: string — field key (default: "sshKeys")
 * props.placeholder: string
 * props.rows: number
 */
export function StringListInput({ schema, basePath = [], title, props }: FormBlockProps) {
  const fieldKey = (props?.field as string) ?? "sshKeys";
  const { getValue, setValue } = useFormContext();
  const path = [...basePath, fieldKey];
  const defaultVal = schemaDefault<string[]>(schema, fieldKey) ?? [];
  const rows = (props?.rows as number) ?? 3;
  const placeholder = (props?.placeholder as string) ?? "";

  useEffect(() => {
    initFormValue(getValue, setValue, path, defaultVal);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!schemaHas(schema, fieldKey)) return null;

  const value = (getValue(path) as string[]) ?? defaultVal;
  const text = value.join("\n");

  return (
    <div className="space-y-2">
      {title && <Label className="text-sm font-medium">{title}</Label>}
      <Textarea
        value={text}
        onChange={(e) => setValue(path, e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
        rows={rows}
        placeholder={placeholder}
        className="font-mono text-sm"
      />
      <p className="text-xs text-muted-foreground">One item per line</p>
    </div>
  );
}
