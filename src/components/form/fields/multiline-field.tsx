"use client";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useFormContext } from "../form-context";
import type { SchemaNode } from "@/lib/schema/types";

export function MultilineField({ node }: { node: SchemaNode }) {
  const { getValue, setValue } = useFormContext();
  const value = (getValue(node.path) as string) ?? "";
  const label = node.title || node.path[node.path.length - 1];

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      {node.description && (
        <p className="text-sm text-muted-foreground">{node.description}</p>
      )}
      <Textarea
        value={value}
        onChange={(e) => setValue(node.path, e.target.value)}
        rows={4}
        className="font-mono text-sm resize-y"
        placeholder={node.default != null ? String(node.default) : undefined}
      />
    </div>
  );
}
