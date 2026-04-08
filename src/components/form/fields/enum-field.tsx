"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useFormContext } from "../form-context";
import type { SchemaNode } from "@/lib/schema/types";

export function EnumField({ node }: { node: SchemaNode }) {
  const { getValue, setValue } = useFormContext();
  const value = (getValue(node.path) as string) ?? "";
  const label = node.title || node.path[node.path.length - 1];

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      {node.description && (
        <p className="text-sm text-muted-foreground">{node.description}</p>
      )}
      <Select value={value} onValueChange={(v) => { if (v) setValue(node.path, v); }}>
        <SelectTrigger>
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          {node.enum?.map((opt) => (
            <SelectItem key={String(opt)} value={String(opt)}>
              {String(opt)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
