import type { ComponentType } from "react";

/**
 * Props that every custom form receives.
 * Custom forms are responsible for their own state and submission.
 */
export interface CustomFormProps {
  plural: string;
  namespace: string;
  apiGroup: string;
  apiVersion: string;
  kind: string;
  backHref: string;
  /** Raw OpenAPI schema (already parsed JSON) — custom form can use it or ignore */
  openAPISchema?: Record<string, unknown>;
}

type FormRegistry = Map<string, ComponentType<CustomFormProps>>;

const registry: FormRegistry = new Map();

export function registerCustomForm(
  plural: string,
  component: ComponentType<CustomFormProps>
): void {
  registry.set(plural, component);
}

export function getCustomForm(
  plural: string
): ComponentType<CustomFormProps> | undefined {
  return registry.get(plural);
}

export function hasCustomForm(plural: string): boolean {
  return registry.has(plural);
}
