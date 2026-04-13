"use client";

import { useEffect } from "react";
import { useFormContext } from "@/components/form/form-context";
import { cn } from "@/lib/utils";
import type { FormBlockProps } from "@/components/form/blocks/types";
import { schemaEnum, schemaDefault, initFormValue } from "@/components/form/blocks/types";

export function VersionPicker({ schema, basePath = [], title = "Version" }: FormBlockProps) {
  const versions = schemaEnum(schema, "version");
  const defaultVersion = schemaDefault<string>(schema, "version") ?? versions?.[0];
  const { getValue, setValue } = useFormContext();
  const path = [...basePath, "version"];

  useEffect(() => {
    initFormValue(getValue, setValue, path, defaultVersion);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!versions) return null;

  const current = (getValue(path) as string) ?? defaultVersion;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{title}</label>
      <div className="flex flex-wrap gap-2">
        {versions.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setValue(path, v)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
              current === v
                ? "border-foreground bg-accent ring-1 ring-foreground"
                : "hover:border-foreground/30 hover:bg-accent/50"
            )}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
