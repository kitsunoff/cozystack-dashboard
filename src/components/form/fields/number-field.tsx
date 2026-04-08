"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFormContext } from "../form-context";
import type { SchemaNode } from "@/lib/schema/types";

export function NumberField({ node }: { node: SchemaNode }) {
  const { getValue, setValue } = useFormContext();
  const value = getValue(node.path);
  const label = node.title || node.path[node.path.length - 1];

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      {node.description && (
        <p className="text-sm text-muted-foreground">{node.description}</p>
      )}
      <Input
        type="number"
        value={value != null ? String(value) : ""}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "") {
            setValue(node.path, undefined);
          } else {
            setValue(
              node.path,
              node.type === "integer" ? parseInt(v, 10) : parseFloat(v)
            );
          }
        }}
        placeholder={node.default != null ? String(node.default) : undefined}
      />
    </div>
  );
}
