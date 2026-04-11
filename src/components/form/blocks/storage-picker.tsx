"use client";

import { useFormContext } from "@/components/form/form-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormBlockProps } from "./types";
import { schemaHas, schemaDefault } from "./types";

/**
 * Storage picker — size input + storage class.
 * Shows nothing if schema has neither "size" nor "storageClass".
 */
export function StoragePicker({ schema, basePath = [], title = "Storage" }: FormBlockProps) {
  const hasSize = schemaHas(schema, "size");
  const hasClass = schemaHas(schema, "storageClass");
  if (!hasSize && !hasClass) return null;

  const { getValue, setValue } = useFormContext();

  const sizePath = [...basePath, "size"];
  const classPath = [...basePath, "storageClass"];
  const currentSize = (getValue(sizePath) as string) ?? schemaDefault<string>(schema, "size") ?? "10Gi";
  const currentClass = (getValue(classPath) as string) ?? schemaDefault<string>(schema, "storageClass") ?? "";

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
