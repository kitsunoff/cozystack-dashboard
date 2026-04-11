"use client";

import { Separator } from "@/components/ui/separator";
import { WizardShell } from "@/components/form/blocks/wizard-shell";
import { ResourcesPicker, BackupConfig } from "@/components/form/blocks";
import type { CustomFormProps } from "../registry";

export function FoundationDBForm({ plural, namespace, apiGroup, apiVersion, kind, backHref, openAPISchema, editName, editValues }: CustomFormProps) {
  const schema = openAPISchema ?? {};
  return (
    <WizardShell schema={schema} plural={plural} namespace={namespace} apiGroup={apiGroup} apiVersion={apiVersion} kind={kind} backHref={backHref} editName={editName} existingValues={editValues} submitLabel="FoundationDB">
      <Separator /><ResourcesPicker schema={schema} />
      <Separator /><BackupConfig schema={schema} />
    </WizardShell>
  );
}
