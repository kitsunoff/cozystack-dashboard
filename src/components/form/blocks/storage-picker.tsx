"use client";

import { useEffect } from "react";
import { useFormContext } from "@/components/form/form-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStorageClasses } from "@/lib/k8s/hooks";
import type { FormBlockProps } from "./types";
import { schemaHas, schemaDefault, initFormValue } from "./types";

export function StoragePicker({ schema, basePath = [], title = "Storage" }: FormBlockProps) {
  const hasSize = schemaHas(schema, "size");
  const hasClass = schemaHas(schema, "storageClass");

  const { getValue, setValue } = useFormContext();
  const { data: storageClasses } = useStorageClasses();
  const sizePath = [...basePath, "size"];
  const classPath = [...basePath, "storageClass"];
  const defaultSize = schemaDefault<string>(schema, "size") ?? "10Gi";
  const defaultClass = schemaDefault<string>(schema, "storageClass") ?? "";

  // Resolve initial storageClass — prefer schema default, fallback to cluster default or first
  const resolvedDefaultClass = (() => {
    if (defaultClass) return defaultClass;
    if (!storageClasses) return "";
    const def = storageClasses.find((sc) => sc.isDefault);
    return def?.name ?? storageClasses[0]?.name ?? "";
  })();

  useEffect(() => {
    if (hasSize) initFormValue(getValue, setValue, sizePath, defaultSize);
    if (hasClass && resolvedDefaultClass) initFormValue(getValue, setValue, classPath, resolvedDefaultClass);
  }, [resolvedDefaultClass]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hasSize && !hasClass) return null;

  const currentSize = (getValue(sizePath) as string) ?? defaultSize;
  const currentClass = (getValue(classPath) as string) || resolvedDefaultClass;

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
            {storageClasses && storageClasses.length > 0 ? (
              <Select
                value={currentClass}
                onValueChange={(v) => { if (v) setValue(classPath, v); }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select storage class" />
                </SelectTrigger>
                <SelectContent>
                  {storageClasses.map((sc) => (
                    <SelectItem key={sc.name} value={sc.name}>
                      {sc.name}{sc.isDefault ? " (default)" : ""} — {sc.provisioner}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={currentClass}
                onChange={(e) => setValue(classPath, e.target.value)}
                placeholder="replicated"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
