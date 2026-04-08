"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormContext } from "../form-context";
import { useK8sListForDropdown } from "@/lib/k8s/hooks";
import type { SchemaNode } from "@/lib/schema/types";

export function ListInputField({ node }: { node: SchemaNode }) {
  const { getValue, setValue, namespace } = useFormContext();
  const value = (getValue(node.path) as string) ?? "";
  const label = node.title || node.path[node.path.length - 1];

  const props = node.listInputProps!;
  const uri = props.valueUri.replace("{namespace}", namespace);

  const { data: options, isLoading } = useK8sListForDropdown(
    uri,
    props.keysToValue,
    props.keysToLabel
  );

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {node.description && (
        <p className="text-xs text-muted-foreground">{node.description}</p>
      )}
      {isLoading ? (
        <Skeleton className="h-9 w-full" />
      ) : (
        <Select
          value={value}
          onValueChange={(v) => {
            if (v) setValue(node.path, v);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {props.allowEmpty && (
              <SelectItem value="">— None —</SelectItem>
            )}
            {options?.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
