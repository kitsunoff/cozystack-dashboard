import type { SchemaNode } from "./types";

/**
 * Recursively walks a JSON Schema (OpenAPI subset) and produces a SchemaNode tree.
 * Handles: object, array, string, integer, number, boolean, x-kubernetes-int-or-string, anyOf.
 */
export function walkSchema(
  schema: Record<string, unknown>,
  path: string[] = []
): SchemaNode {
  const type = resolveType(schema);

  const node: SchemaNode = {
    type,
    path,
    title: schema.title as string | undefined,
    description: schema.description as string | undefined,
    default: schema.default,
  };

  if (schema["x-kubernetes-int-or-string"] === true || hasIntOrStringAnyOf(schema)) {
    node.xKubernetesIntOrString = true;
    node.type = "string"; // Treat as string for form rendering
  }

  if (Array.isArray(schema.enum)) {
    node.enum = schema.enum;
  }

  if (type === "object" && schema.properties) {
    const props = schema.properties as Record<string, Record<string, unknown>>;
    const required = (schema.required as string[]) || [];
    node.required = required;
    node.properties = {};
    for (const [key, propSchema] of Object.entries(props)) {
      node.properties[key] = walkSchema(propSchema, [...path, key]);
    }
  }

  if (type === "array" && schema.items) {
    node.items = walkSchema(
      schema.items as Record<string, unknown>,
      [...path, "[]"]
    );
  }

  return node;
}

function resolveType(schema: Record<string, unknown>): SchemaNode["type"] {
  if (schema.type) {
    const t = schema.type as string;
    if (["string", "integer", "number", "boolean", "object", "array"].includes(t)) {
      return t as SchemaNode["type"];
    }
  }

  // If properties exist, it's an object
  if (schema.properties) return "object";

  // If items exist, it's an array
  if (schema.items) return "array";

  // x-kubernetes-int-or-string
  if (schema["x-kubernetes-int-or-string"]) return "string";

  // anyOf — try to resolve
  if (Array.isArray(schema.anyOf)) {
    const types = (schema.anyOf as Record<string, unknown>[])
      .map((s) => s.type as string)
      .filter(Boolean);
    if (types.includes("string")) return "string";
    if (types.includes("integer")) return "integer";
  }

  return "string"; // Fallback
}

function hasIntOrStringAnyOf(schema: Record<string, unknown>): boolean {
  if (!Array.isArray(schema.anyOf)) return false;
  const types = new Set(
    (schema.anyOf as Record<string, unknown>[]).map((s) => s.type)
  );
  return types.has("integer") && types.has("string");
}

/**
 * Collects visible (non-hidden) leaf and object nodes in sort order.
 * Used by the form renderer to determine field display order.
 */
export function collectVisibleFields(node: SchemaNode): SchemaNode[] {
  if (!node.properties) return [];

  const entries = Object.entries(node.properties)
    .filter(([, child]) => !child.hidden)
    .sort(([, a], [, b]) => {
      const aOrder = a.sortOrder ?? Infinity;
      const bOrder = b.sortOrder ?? Infinity;
      return aOrder - bOrder;
    });

  return entries.map(([, child]) => child);
}
