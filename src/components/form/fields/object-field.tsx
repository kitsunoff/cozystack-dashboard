"use client";

import { Label } from "@/components/ui/label";
import { FieldRenderer } from "../field-renderer";
import { collectVisibleFields } from "@/lib/schema/walker";
import type { SchemaNode } from "@/lib/schema/types";

export function ObjectField({ node }: { node: SchemaNode }) {
  const label = node.title || node.path[node.path.length - 1];
  const fields = collectVisibleFields(node);

  if (fields.length === 0) return null;

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
      {fields.map((child) => (
        <FieldRenderer key={child.path.join(".")} node={child} />
      ))}
    </div>
  );
}
