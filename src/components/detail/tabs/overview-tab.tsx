"use client";

import { Badge } from "@/components/ui/badge";
import type { AppInstance } from "@/lib/k8s/types";

interface OverviewTabProps {
  instance: AppInstance;
}

export function OverviewTab({ instance }: OverviewTabProps) {
  const spec = instance.spec;
  const conditions = instance.status?.conditions ?? [];

  // Collect flat spec fields for display
  const fields = collectFields(spec);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Properties */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Configuration
        </h3>
        <div className="rounded-xl border divide-y">
          {fields.map(({ key, value }) => (
            <div key={key} className="flex justify-between items-center px-4 py-3">
              <span className="text-sm text-muted-foreground">{key}</span>
              <span className="text-sm font-medium">{renderValue(value)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Conditions */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Conditions
        </h3>
        {conditions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No conditions reported</p>
        ) : (
          <div className="rounded-xl border divide-y">
            {conditions.map((c) => (
              <div key={c.type} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        c.status === "True"
                          ? "bg-emerald-500"
                          : c.status === "False"
                            ? "bg-red-500"
                            : "bg-amber-500"
                      }`}
                    />
                    <span className="text-sm font-medium">{c.type}</span>
                  </div>
                  <Badge
                    variant={c.status === "True" ? "secondary" : "destructive"}
                    className="text-xs"
                  >
                    {c.status}
                  </Badge>
                </div>
                {c.message && (
                  <p className="text-xs text-muted-foreground mt-1 ml-4">{c.message}</p>
                )}
                {c.reason && (
                  <p className="text-xs text-muted-foreground/60 mt-0.5 ml-4 font-mono">{c.reason}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function collectFields(
  obj: Record<string, unknown>,
  prefix = ""
): { key: string; value: unknown }[] {
  const result: { key: string; value: unknown }[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v != null && typeof v === "object" && !Array.isArray(v)) {
      result.push(...collectFields(v as Record<string, unknown>, key));
    } else {
      result.push({ key, value: v });
    }
  }
  return result;
}

function renderValue(value: unknown): React.ReactNode {
  if (value === true) return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 text-xs">true</Badge>;
  if (value === false) return <Badge variant="secondary" className="text-xs">false</Badge>;
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground/50">[]</span>;
    return (
      <div className="flex flex-wrap gap-1 justify-end">
        {value.map((v, i) => (
          <Badge key={i} variant="outline" className="text-xs font-normal">
            {String(v)}
          </Badge>
        ))}
      </div>
    );
  }
  if (value == null) return <span className="text-muted-foreground/50">—</span>;
  return <span className="font-mono text-xs">{String(value)}</span>;
}
