import type { CFPSpec } from "./types";

/**
 * Builds a nested default values object from CustomFormsPrefill spec.
 * Each value entry has a path (e.g. ["spec", "replicas"]) and a value.
 */
export function buildPrefillValues(cfp: CFPSpec): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (!cfp.values) return result;

  for (const { path, value } of cfp.values) {
    setNestedValue(result, path, value);
  }

  return result;
}

function setNestedValue(
  obj: Record<string, unknown>,
  path: string[],
  value: unknown
): void {
  if (path.length === 0) return;

  let current = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (current[key] == null || typeof current[key] !== "object") {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  current[path[path.length - 1]] = value;
}

/**
 * Extracts a value from a nested object using a path array.
 */
export function getNestedValue(
  obj: unknown,
  path: string[]
): unknown {
  let current = obj;
  for (const key of path) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}
