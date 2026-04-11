"use client";

import { useFormContext } from "@/components/form/form-context";
import { cn } from "@/lib/utils";
import type { FormBlockProps } from "./types";
import { schemaHas, schemaDefault } from "./types";

const COMMON_REPLICAS = [1, 2, 3, 5];

/**
 * Replicas picker — common values as buttons.
 * Shows nothing if schema has no "replicas".
 */
export function ReplicasPicker({ schema, basePath = [], title = "Replicas" }: FormBlockProps) {
  if (!schemaHas(schema, "replicas")) return null;

  const { getValue, setValue } = useFormContext();
  const path = [...basePath, "replicas"];
  const current = (getValue(path) as number) ?? schemaDefault<number>(schema, "replicas") ?? 1;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{title}</label>
      <div className="flex gap-2">
        {COMMON_REPLICAS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setValue(path, n)}
            className={cn(
              "h-9 w-12 rounded-lg border text-sm font-medium transition-all",
              current === n
                ? "border-foreground bg-accent ring-1 ring-foreground"
                : "hover:border-foreground/30 hover:bg-accent/50"
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
