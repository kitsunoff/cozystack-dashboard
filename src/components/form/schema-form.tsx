"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { FormProvider, useFormContext } from "./form-context";
import { FieldRenderer } from "./field-renderer";
import { walkSchema, collectVisibleFields } from "@/lib/schema/walker";
import { applyOverrides } from "@/lib/schema/cfo-merger";
import { buildPrefillValues } from "@/lib/schema/cfp-prefill";
import { k8sCreate } from "@/lib/k8s/client";
import { deepMerge } from "@/lib/utils";
import { endpoints } from "@/lib/k8s/endpoints";
import type { SchemaNode, CFOSpec, CFPSpec } from "@/lib/schema/types";

interface SchemaFormProps {
  openAPISchema: Record<string, unknown>;
  cfo?: CFOSpec;
  cfp?: CFPSpec;
  plural: string;
  namespace: string;
  apiGroup?: string;
  apiVersion?: string;
  kind: string;
  backHref: string;
}

export function SchemaForm({
  openAPISchema,
  cfo,
  cfp,
  plural,
  namespace,
  apiGroup = "apps.cozystack.io",
  apiVersion = "v1alpha1",
  kind,
  backHref,
}: SchemaFormProps) {
  const rootNode = useMemo(() => {
    let schema = walkSchema(openAPISchema);
    if (cfo) {
      schema = applyOverrides(schema, cfo);
    }
    return schema;
  }, [openAPISchema, cfo]);

  const initialValues = useMemo(() => {
    const defaults = buildDefaultsFromSchema(rootNode);
    if (cfp) {
      const prefill = buildPrefillValues(cfp);
      return deepMerge(defaults, prefill);
    }
    return defaults;
  }, [rootNode, cfp]);

  return (
    <FormProvider initialValues={initialValues} namespace={namespace}>
      <FormContent
        rootNode={rootNode}
        plural={plural}
        namespace={namespace}
        apiGroup={apiGroup}
        apiVersion={apiVersion}
        kind={kind}
        backHref={backHref}
      />
    </FormProvider>
  );
}

function FormContent({
  rootNode,
  plural,
  namespace,
  apiGroup,
  apiVersion,
  kind,
  backHref,
}: {
  rootNode: SchemaNode;
  plural: string;
  namespace: string;
  apiGroup: string;
  apiVersion: string;
  kind: string;
  backHref: string;
}) {
  const { values, setValue } = useFormContext();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resourceName, setResourceName] = useState("");

  // OpenAPI schema may be the spec contents directly (no wrapping {spec: ...})
  // or wrapped in {properties: {metadata, spec}}. Handle both.
  const specNode = rootNode.properties?.["spec"] ?? rootNode;
  const visibleFields = collectVisibleFields(specNode);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceName.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      // If schema had a spec wrapper, values has {spec: ...}; otherwise values IS the spec
      const hasSpecWrapper = rootNode.properties?.["spec"] != null;
      const specValues = hasSpecWrapper
        ? (values as Record<string, unknown>).spec
        : values;

      const resource = {
        apiVersion: `${apiGroup}/${apiVersion}`,
        kind,
        metadata: {
          name: resourceName.trim(),
          namespace,
        },
        spec: specValues,
      };

      await k8sCreate(endpoints.instances(plural, namespace), resource);
      router.push(backHref);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create resource"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Name</Label>
        <Input
          value={resourceName}
          onChange={(e) => setResourceName(e.target.value)}
          placeholder="my-instance"
          required
          autoFocus
        />
      </div>

      {visibleFields.length > 0 && (
        <>
          <Separator />
          {visibleFields.map((field) => (
            <FieldRenderer key={field.path.join(".")} node={field} />
          ))}
        </>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push(backHref)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

function buildDefaultsFromSchema(node: SchemaNode): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (node.default !== undefined) {
    return node.default as Record<string, unknown>;
  }

  if (node.properties) {
    for (const [key, child] of Object.entries(node.properties)) {
      if (child.hidden) continue;
      if (child.default !== undefined) {
        result[key] = child.default;
      } else if (child.type === "object" && child.properties) {
        const nested = buildDefaultsFromSchema(child);
        if (Object.keys(nested).length > 0) {
          result[key] = nested;
        }
      }
    }
  }

  return result;
}

