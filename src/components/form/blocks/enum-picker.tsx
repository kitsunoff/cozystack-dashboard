"use client";

import { useMemo, useEffect } from "react";
import { useFormContext } from "@/components/form/form-context";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { FormBlockProps } from "./types";
import { schemaEnum, schemaDefault, schemaHas, initFormValue } from "./types";

type Display = "buttons" | "cards" | "dropdown" | "cards+dropdown";

// Pattern-based grouping for dropdown
function guessGroup(value: string): string {
  if (/^(ubuntu|fedora|alpine|centos|opensuse)/.test(value)) return "Linux";
  if (/^(rhel|sles)/.test(value)) return "Enterprise";
  if (/^windows/.test(value)) return "Windows";
  if (value === "cirros") return "Minimal";
  return "Other";
}

function formatLabel(value: string, labels?: Record<string, string>): string {
  if (labels?.[value]) return labels[value];
  return value;
}

/**
 * Universal enum picker with multiple display modes.
 * props.display: "buttons" | "cards" | "dropdown" | "cards+dropdown"
 * props.popular: string[] — subset shown as cards (for cards+dropdown)
 * props.labels: Record<string, string> — override display labels
 * props.groupBy: "prefix" — group dropdown items by name prefix
 */
export function EnumPicker({ schema, basePath = [], title, props }: FormBlockProps) {
  const fieldKey = (props?.field as string) ?? "version";
  const values = schemaEnum(schema, fieldKey);
  const defaultVal = schemaDefault<string>(schema, fieldKey) ?? values?.[0];
  const { getValue, setValue } = useFormContext();
  const path = [...basePath, fieldKey];

  useEffect(() => {
    initFormValue(getValue, setValue, path, defaultVal);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!values || !schemaHas(schema, fieldKey)) return null;

  const display = (props?.display as Display) ?? (values.length <= 7 ? "buttons" : "cards+dropdown");
  const popular = (props?.popular as string[]) ?? [];
  const labels = (props?.labels as Record<string, string>) ?? {};
  const groupByPrefix = props?.groupBy === "prefix";
  const current = (getValue(path) as string) ?? defaultVal;

  const grouped = useMemo(() => {
    if (!groupByPrefix) return null;
    const groups = new Map<string, string[]>();
    for (const v of values) {
      const g = guessGroup(v);
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(v);
    }
    return groups;
  }, [values, groupByPrefix]);

  const popularValues = popular.length > 0 ? popular.filter((p) => values.includes(p)) : [];

  return (
    <div className="space-y-3">
      {title && <label className="text-sm font-medium">{title}</label>}

      {/* Buttons mode */}
      {(display === "buttons") && (
        <div className="flex flex-wrap gap-2">
          {values.map((v) => (
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
              {formatLabel(v, labels)}
            </button>
          ))}
        </div>
      )}

      {/* Cards mode */}
      {(display === "cards") && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {values.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setValue(path, v)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 transition-all",
                current === v
                  ? "border-foreground bg-accent ring-1 ring-foreground"
                  : "hover:border-foreground/30 hover:bg-accent/50"
              )}
            >
              <span className="text-xs font-medium text-center">{formatLabel(v, labels)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Cards + Dropdown mode */}
      {(display === "cards+dropdown") && (
        <>
          {popularValues.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {popularValues.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setValue(path, v)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 transition-all",
                    current === v
                      ? "border-foreground bg-accent ring-1 ring-foreground"
                      : "hover:border-foreground/30 hover:bg-accent/50"
                  )}
                >
                  <span className="text-xs font-medium text-center">{formatLabel(v, labels)}</span>
                </button>
              ))}
            </div>
          )}
          <DropdownSelect
            values={values}
            current={current}
            labels={labels}
            grouped={grouped}
            onChange={(v) => setValue(path, v)}
          />
        </>
      )}

      {/* Dropdown only mode */}
      {(display === "dropdown") && (
        <DropdownSelect
          values={values}
          current={current}
          labels={labels}
          grouped={grouped}
          onChange={(v) => setValue(path, v)}
        />
      )}
    </div>
  );
}

function DropdownSelect({
  values,
  current,
  labels,
  grouped,
  onChange,
}: {
  values: string[];
  current: string;
  labels: Record<string, string>;
  grouped: Map<string, string[]> | null;
  onChange: (v: string) => void;
}) {
  return (
    <Select value={current} onValueChange={(v) => { if (v) onChange(v); }}>
      <SelectTrigger className="w-full">
        <SelectValue>{formatLabel(current, labels)}</SelectValue>
      </SelectTrigger>
      <SelectContent side="bottom" alignItemWithTrigger={false} className="max-h-72">
        {grouped ? (
          Array.from(grouped.entries()).map(([group, items]) => (
            <SelectGroup key={group}>
              <SelectLabel>{group}</SelectLabel>
              {items.map((v) => (
                <SelectItem key={v} value={v}>{formatLabel(v, labels)}</SelectItem>
              ))}
            </SelectGroup>
          ))
        ) : (
          values.map((v) => (
            <SelectItem key={v} value={v}>{formatLabel(v, labels)}</SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
