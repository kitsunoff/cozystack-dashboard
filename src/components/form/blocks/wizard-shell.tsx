"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FormProvider, useFormContext } from "@/components/form/form-context";
import { k8sCreate, k8sPatch } from "@/lib/k8s/client";
import { endpoints } from "@/lib/k8s/endpoints";
import { deepMerge } from "@/lib/utils";

interface WizardShellProps {
  schema: Record<string, unknown>;
  plural: string;
  namespace: string;
  apiGroup: string;
  apiVersion: string;
  kind: string;
  backHref: string;
  submitLabel: string;
  /** When set, form is in edit mode — name is read-only, submit does PATCH */
  editName?: string;
  /** Existing spec values to prefill the form (edit mode) */
  existingValues?: Record<string, unknown>;
  /** Custom submit handler — receives (name, values, isEdit). If provided, replaces default create/patch logic. */
  onSubmit?: (name: string, values: Record<string, unknown>, isEdit: boolean) => Promise<void>;
  children: React.ReactNode;
}

export function WizardShell({
  schema,
  plural,
  namespace,
  apiGroup,
  apiVersion,
  kind,
  backHref,
  submitLabel,
  editName,
  existingValues,
  onSubmit,
  children,
}: WizardShellProps) {
  const initialValues = existingValues
    ? deepMerge(buildDefaults(schema), existingValues)
    : buildDefaults(schema);

  return (
    <FormProvider initialValues={initialValues} namespace={namespace}>
      <WizardShellInner
        plural={plural}
        namespace={namespace}
        apiGroup={apiGroup}
        apiVersion={apiVersion}
        kind={kind}
        backHref={backHref}
        submitLabel={submitLabel}
        editName={editName}
        onSubmit={onSubmit}
      >
        {children}
      </WizardShellInner>
    </FormProvider>
  );
}

function WizardShellInner({
  plural,
  namespace,
  apiGroup,
  apiVersion,
  kind,
  backHref,
  submitLabel,
  editName,
  onSubmit: customSubmit,
  children,
}: Omit<WizardShellProps, "schema" | "existingValues">) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { values } = useFormContext();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(editName ?? "");
  const isEdit = !!editName;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      if (customSubmit) {
        await customSubmit(name.trim(), values, isEdit);
      } else if (isEdit) {
        await k8sPatch(
          endpoints.instance(plural, namespace, name.trim()),
          { spec: values }
        );
      } else {
        await k8sCreate(endpoints.instances(plural, namespace), {
          apiVersion: `${apiGroup}/${apiVersion}`,
          kind,
          metadata: { name: name.trim(), namespace },
          spec: values,
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["instances", plural] });
      await queryClient.invalidateQueries({ queryKey: ["instance", plural] });
      router.push(backHref);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isEdit ? "update" : "create"} resource`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Name</Label>
        <Input
          value={name}
          onChange={(e) => !isEdit && setName(e.target.value)}
          placeholder="my-instance"
          required
          autoFocus={!isEdit}
          readOnly={isEdit}
          className={isEdit ? "bg-muted cursor-not-allowed" : ""}
        />
      </div>

      {children}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting
            ? (isEdit ? "Saving..." : "Creating...")
            : (isEdit ? `Save ${submitLabel}` : `Create ${submitLabel}`)}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push(backHref)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function buildDefaults(schema: Record<string, unknown>): Record<string, unknown> {
  const props = schema.properties as Record<string, Record<string, unknown>> | undefined;
  if (!props) return {};
  const result: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(props)) {
    if (prop.default !== undefined) {
      result[key] = prop.default;
    } else if (prop.type === "object" && prop.properties) {
      const nested = buildDefaults(prop as Record<string, unknown>);
      if (Object.keys(nested).length > 0) {
        result[key] = nested;
      }
    }
  }
  return result;
}

