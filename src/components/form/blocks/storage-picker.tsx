"use client";

import { useEffect } from "react";
import { useFormContext } from "@/components/form/form-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormBlockProps } from "./types";
import { schemaHas, schemaDefault, initFormValue } from "./types";

export function StoragePicker({ schema, basePath = [], title = "Storage" }: FormBlockProps) {
  const hasSize = schemaHas(schema, "size");
  const hasClass = schemaHas(schema, "storageClass");

  const { getValue, setValue } = useFormContext();
  const sizePath = [...basePath, "size"];
  const classPath = [...basePath, "storageClass"];
  const defaultSize = schemaDefault<string>(schema, "size") ?? "10Gi";
  const defaultClass = schemaDefault<string>(schema, "storageClass") ?? "";

  useEffect(() => {
    if (hasSize) initFormValue(getValue, setValue, sizePath, defaultSize);
    if (hasClass) initFormValue(getValue, setValue, classPath, defaultClass);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hasSize && !hasClass) return null;

  const currentSize = (getValue(sizePath) as string) ?? defaultSize;
  const currentClass = (getValue(classPath) as string) ?? defaultClass;

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">{title}</label>
      <div className="flex gap-3">
        {hasSize && (
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Size</Label>
            <Input
              value={currentSize}
              onChange={(e) => setValue(sizePath, e.target.value)}
              placeholder="10Gi"
            />
          </div>
        )}
        {hasClass && (
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Storage Class</Label>
            <Input
              value={currentClass}
              onChange={(e) => setValue(classPath, e.target.value)}
              placeholder="replicated"
            />
          </div>
        )}
      </div>
    </div>
  );
}
