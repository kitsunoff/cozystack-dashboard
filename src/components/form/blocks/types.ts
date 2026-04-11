/** Common props for all form blocks */
export interface FormBlockProps {
  /** OpenAPI schema slice for this block's level */
  schema: Record<string, unknown>;
  /** Path prefix in form values (e.g. ["kafka"] → spec.kafka.*) */
  basePath?: string[];
  /** Optional title override */
  title?: string;
}

/** Get properties object from schema */
export function schemaProps(
  schema: Record<string, unknown>
): Record<string, Record<string, unknown>> | undefined {
  return schema.properties as Record<string, Record<string, unknown>> | undefined;
}

/** Get a single property schema */
export function schemaProp(
  schema: Record<string, unknown>,
  key: string
): Record<string, unknown> | undefined {
  return schemaProps(schema)?.[key];
}

/** Check if schema has a property */
export function schemaHas(schema: Record<string, unknown>, key: string): boolean {
  return schemaProp(schema, key) !== undefined;
}

/** Extract enum values (filters out empty strings) */
export function schemaEnum(schema: Record<string, unknown>, key: string): string[] | undefined {
  const prop = schemaProp(schema, key);
  const e = prop?.enum as string[] | undefined;
  return e?.filter((v) => v !== "");
}

/** Extract default value */
export function schemaDefault<T>(schema: Record<string, unknown>, key: string): T | undefined {
  return schemaProp(schema, key)?.default as T | undefined;
}

/** Navigate into nested schema: schemaAt(root, ["kafka"]) → kafka's schema object */
export function schemaAt(
  schema: Record<string, unknown>,
  path: string[]
): Record<string, unknown> {
  let current = schema;
  for (const key of path) {
    const prop = schemaProp(current, key);
    if (!prop) return { properties: {} };
    current = prop;
  }
  return current;
}
