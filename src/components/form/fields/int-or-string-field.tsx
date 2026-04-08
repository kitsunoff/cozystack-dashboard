"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFormContext } from "../form-context";
import type { SchemaNode } from "@/lib/schema/types";

export function IntOrStringField({ node }: { node: SchemaNode }) {
  const { getValue, setValue } = useFormContext();
  const raw = getValue(node.path);
  const value = raw != null ? String(raw) : "";
  const label = node.title || node.path[node.path.length - 1];

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {node.description && (
        <p className="text-xs text-muted-foreground">{node.description}</p>
      )}
      <Input
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          const asNum = Number(v);
          setValue(node.path, v !== "" && !isNaN(asNum) ? asNum : v);
        }}
        placeholder={node.default != null ? String(node.default) : undefined}
      />
    </div>
  );
}
