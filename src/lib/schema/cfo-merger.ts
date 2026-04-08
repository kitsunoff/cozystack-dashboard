import type { SchemaNode, CFOSpec } from "./types";

/**
 * Applies CustomFormsOverride to a SchemaNode tree:
 * 1. Marks hidden fields
 * 2. Assigns sort order
 * 3. Applies schema overrides (multilineString, listInput)
 */
export function applyOverrides(root: SchemaNode, cfo: CFOSpec): SchemaNode {
  const result = structuredClone(root);

  // 1. Apply hidden
  if (cfo.hidden) {
    for (const hiddenPath of cfo.hidden) {
      const path = Array.isArray(hiddenPath) ? hiddenPath : [hiddenPath];
      markHidden(result, path);
    }
  }

  // 2. Apply sort order
  if (cfo.sort) {
    for (let i = 0; i < cfo.sort.length; i++) {
      const sortPath = cfo.sort[i];
      assignSortOrder(result, sortPath, i);
    }
  }

  // 3. Apply schema overrides
  if (cfo.schema) {
    applySchemaOverrides(result, cfo.schema);
  }

  return result;
}

function markHidden(node: SchemaNode, path: string[]): void {
  if (path.length === 0) {
    node.hidden = true;
    return;
  }

  if (!node.properties) return;

  const [head, ...rest] = path;
  const child = node.properties[head];
  if (!child) return;

  if (rest.length === 0) {
    child.hidden = true;
  } else {
    markHidden(child, rest);
  }
}

function assignSortOrder(
  node: SchemaNode,
  path: string[],
  order: number
): void {
  if (path.length === 0) return;

  if (!node.properties) return;

  const [head, ...rest] = path;
  const child = node.properties[head];
  if (!child) return;

  if (rest.length === 0) {
    child.sortOrder = order;
  } else {
    assignSortOrder(child, rest, order);
  }
}

function applySchemaOverrides(
  node: SchemaNode,
  overrides: Record<string, unknown>
): void {
  // Walk the override tree and apply to matching nodes
  const properties = overrides.properties as
    | Record<string, unknown>
    | undefined;
  if (!properties || !node.properties) return;

  for (const [key, override] of Object.entries(properties)) {
    const child = node.properties[key];
    if (!child) continue;

    const overrideObj = override as Record<string, unknown>;

    // Apply type override (multilineString)
    if (overrideObj.type === "multilineString") {
      child.displayType = "multilineString";
    }

    // Apply listInput override
    if (overrideObj.type === "listInput" && overrideObj.customProps) {
      const props = overrideObj.customProps as Record<string, unknown>;
      child.displayType = "listInput";
      child.listInputProps = {
        valueUri: rewriteListInputUri(props.valueUri as string),
        keysToValue: (props.keysToValue as string[]) || ["metadata", "name"],
        keysToLabel: (props.keysToLabel as string[]) || ["metadata", "name"],
        allowEmpty: (props.allowEmpty as boolean) ?? false,
      };
    }

    // Recurse into nested properties
    if (overrideObj.properties && child.properties) {
      applySchemaOverrides(child, overrideObj as Record<string, unknown>);
    }

    // Handle items (arrays)
    if (overrideObj.items && child.items) {
      applySchemaOverrides(
        child.items,
        overrideObj.items as Record<string, unknown>
      );
    }
  }
}

/**
 * Rewrites listInput URIs from the multi-cluster format used by existing CFOs
 * to the single-cluster format used by our API proxy.
 *
 * Input:  /api/clusters/{cluster}/k8s/apis/storage.k8s.io/v1/storageclasses
 * Output: /apis/storage.k8s.io/v1/storageclasses
 */
function rewriteListInputUri(uri: string): string {
  if (!uri) return uri;

  // Strip /api/clusters/{anything}/k8s prefix
  const match = uri.match(/\/api\/clusters\/[^/]+\/k8s(\/.*)/);
  if (match) {
    return match[1];
  }

  // Strip /k8s prefix if present
  if (uri.startsWith("/k8s/")) {
    return uri.slice(4);
  }

  return uri;
}
