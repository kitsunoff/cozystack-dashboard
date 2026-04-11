"use client";

import { useFormContext } from "@/components/form/form-context";
import { cn } from "@/lib/utils";
import type { FormBlockProps } from "./types";
import { schemaEnum, schemaDefault } from "./types";

/**
 * Version picker — renders enum values as selectable buttons.
 * Shows nothing if schema has no "version" with enum.
 */
export function VersionPicker({ schema, basePath = [], title = "Version" }: FormBlockProps) {
  const versions = schemaEnum(schema, "version");
  if (!versions) return null;

  const { getValue, setValue } = useFormContext();
  const path = [...basePath, "version"];
  const current = (getValue(path) as string) ?? schemaDefault<string>(schema, "version") ?? versions[0];

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
