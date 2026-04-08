export interface SchemaNode {
  type: "string" | "integer" | "number" | "boolean" | "object" | "array";
  path: string[];
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  properties?: Record<string, SchemaNode>;
  items?: SchemaNode;
  required?: string[];
  xKubernetesIntOrString?: boolean;

  // Applied by CFO merger
  hidden?: boolean;
  displayType?: "multilineString" | "listInput" | "default";
  listInputProps?: ListInputProps;
  sortOrder?: number;
}

export interface ListInputProps {
  valueUri: string;
  keysToValue: string[];
  keysToLabel: string[];
  allowEmpty?: boolean;
}

export interface CFOSpec {
  customizationId: string;
  hidden?: (string | string[])[];
  sort?: string[][];
  schema?: Record<string, unknown>;
  strategy?: "merge" | "replace";
}

export interface CFPSpec {
  customizationId: string;
  values?: { path: string[]; value: unknown }[];
}
