"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNamespaces } from "@/lib/k8s/hooks";
import { useNamespace } from "@/hooks/use-namespace";

export function NamespaceSelector() {
  const { namespace, setNamespace } = useNamespace();
  const { data: namespaces, isLoading } = useNamespaces();

  return (
    <Select
      value={namespace}
      onValueChange={(v) => {
        if (v) setNamespace(v);
      }}
      disabled={isLoading}
    >
      <SelectTrigger className="h-9 w-44 text-sm">
        <SelectValue placeholder="Namespace" />
      </SelectTrigger>
      <SelectContent>
        {namespaces?.map((ns) => (
          <SelectItem key={ns} value={ns} className="text-sm">
            {ns}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
