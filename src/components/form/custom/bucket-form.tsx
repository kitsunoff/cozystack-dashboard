"use client";

import { Separator } from "@/components/ui/separator";
import { WizardShell } from "@/components/form/blocks/wizard-shell";
import { UsersList } from "@/components/form/blocks";
import type { CustomFormProps } from "../registry";

export function BucketForm({ plural, namespace, apiGroup, apiVersion, kind, backHref, openAPISchema }: CustomFormProps) {
  const schema = openAPISchema ?? {};
  return (
    <WizardShell schema={schema} plural={plural} namespace={namespace} apiGroup={apiGroup} apiVersion={apiVersion} kind={kind} backHref={backHref} submitLabel="Bucket">
      <Separator /><UsersList schema={schema} />
    </WizardShell>
  );
}
