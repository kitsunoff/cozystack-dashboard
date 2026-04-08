"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useFormContext } from "../form-context";
import { FieldRenderer } from "../field-renderer";
import type { SchemaNode } from "@/lib/schema/types";

export function ArrayField({ node }: { node: SchemaNode }) {
  const { getValue, setValue } = useFormContext();
  const value = (getValue(node.path) as unknown[]) ?? [];
  const label = node.title || node.path[node.path.length - 1];

  const addItem = () => {
    const defaultItem = node.items?.type === "object" ? {} : "";
    setValue(node.path, [...value, defaultItem]);
  };

  const removeItem = (index: number) => {
    setValue(node.path, value.filter((_, i) => i !== index));
  };

  if (!node.items) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          + Add
        </Button>
      </div>
      {value.map((_, index) => {
        const itemNode: SchemaNode = {
          ...node.items!,
          path: [...node.path, String(index)],
        };
        return (
          <div key={index} className="flex items-start gap-3 rounded-lg border p-3">
            <div className="flex-1">
              <FieldRenderer node={itemNode} />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive shrink-0"
              onClick={() => removeItem(index)}
            >
              Remove
            </Button>
          </div>
        );
      })}
    </div>
  );
}
