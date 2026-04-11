"use client";

import { useEffect } from "react";
import { useFormContext } from "@/components/form/form-context";
import { cn } from "@/lib/utils";
import type { FormBlockProps } from "./types";
import { schemaHas, schemaDefault, initFormValue } from "./types";

const COMMON_REPLICAS = [1, 2, 3, 5];

export function ReplicasPicker({ schema, basePath = [], title = "Replicas" }: FormBlockProps) {
  const defaultVal = schemaDefault<number>(schema, "replicas") ?? 1;
  const { getValue, setValue } = useFormContext();
  const path = [...basePath, "replicas"];

  useEffect(() => {
    initFormValue(getValue, setValue, path, defaultVal);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!schemaHas(schema, "replicas")) return null;

  const current = (getValue(path) as number) ?? defaultVal;

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
