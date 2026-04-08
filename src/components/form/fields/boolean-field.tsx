"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useFormContext } from "../form-context";
import type { SchemaNode } from "@/lib/schema/types";

export function BooleanField({ node }: { node: SchemaNode }) {
  const { getValue, setValue } = useFormContext();
  const value = (getValue(node.path) as boolean) ?? false;
  const label = node.title || node.path[node.path.length - 1];

  return (
    <div className="flex items-center justify-between rounded-lg border px-4 py-3">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        {node.description && (
          <p className="text-sm text-muted-foreground">{node.description}</p>
        )}
      </div>
      <Switch
        checked={value}
        onCheckedChange={(checked) => setValue(node.path, checked)}
      />
    </div>
  );
}
