"use client";

import type { SchemaNode } from "@/lib/schema/types";
import { StringField } from "./fields/string-field";
import { NumberField } from "./fields/number-field";
import { BooleanField } from "./fields/boolean-field";
import { EnumField } from "./fields/enum-field";
import { MultilineField } from "./fields/multiline-field";
import { ListInputField } from "./fields/list-input-field";
import { ObjectField } from "./fields/object-field";
import { ArrayField } from "./fields/array-field";
import { IntOrStringField } from "./fields/int-or-string-field";

export function FieldRenderer({ node }: { node: SchemaNode }) {
  if (node.hidden) return null;

  // ListInput (API-backed dropdown)
  if (node.displayType === "listInput" && node.listInputProps) {
    return <ListInputField node={node} />;
  }

  // Enum (static dropdown)
  if (node.enum && node.enum.length > 0) {
    return <EnumField node={node} />;
  }

  // MultilineString (textarea)
  if (node.displayType === "multilineString") {
    return <MultilineField node={node} />;
  }

  // x-kubernetes-int-or-string
  if (node.xKubernetesIntOrString) {
    return <IntOrStringField node={node} />;
  }

  switch (node.type) {
    case "string":
      return <StringField node={node} />;
    case "integer":
    case "number":
      return <NumberField node={node} />;
    case "boolean":
      return <BooleanField node={node} />;
    case "object":
      return <ObjectField node={node} />;
    case "array":
      return <ArrayField node={node} />;
    default:
      return <StringField node={node} />;
  }
}
