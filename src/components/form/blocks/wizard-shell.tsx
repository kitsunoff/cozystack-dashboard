"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FormProvider, useFormContext } from "@/components/form/form-context";
import { k8sCreate } from "@/lib/k8s/client";
import { endpoints } from "@/lib/k8s/endpoints";

interface WizardShellProps {
  schema: Record<string, unknown>;
  plural: string;
  namespace: string;
  apiGroup: string;
  apiVersion: string;
  kind: string;
  backHref: string;
  /** Display name for submit button: "Create {submitLabel}" */
  submitLabel: string;
  children: React.ReactNode;
}

/**
 * Shared wizard shell — provides FormProvider, name input, submit/cancel buttons.
 * Children are the form blocks rendered between name and submit.
 */
export function WizardShell({
  schema,
  plural,
  namespace,
  apiGroup,
  apiVersion,
  kind,
  backHref,
  submitLabel,
  children,
}: WizardShellProps) {
  return (
    <FormProvider initialValues={buildDefaults(schema)} namespace={namespace}>
      <WizardShellInner
        plural={plural}
        namespace={namespace}
        apiGroup={apiGroup}
        apiVersion={apiVersion}
        kind={kind}
        backHref={backHref}
        submitLabel={submitLabel}
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
  children,
}: Omit<WizardShellProps, "schema">) {
  const router = useRouter();
  const { values } = useFormContext();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      await k8sCreate(endpoints.instances(plural, namespace), {
        apiVersion: `${apiGroup}/${apiVersion}`,
        kind,
        metadata: { name: name.trim(), namespace },
        spec: values,
      });
      router.push(backHref);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create resource");
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
          onChange={(e) => setName(e.target.value)}
          placeholder="my-instance"
          required
          autoFocus
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
          {submitting ? "Creating..." : `Create ${submitLabel}`}
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
    }
  }
  return result;
}
