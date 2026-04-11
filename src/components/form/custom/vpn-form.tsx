"use client";

import { Separator } from "@/components/ui/separator";
import { WizardShell } from "@/components/form/blocks/wizard-shell";
import { ResourcesPicker, ReplicasPicker, ExternalToggle, UsersList } from "@/components/form/blocks";
import type { CustomFormProps } from "../registry";

export function VPNForm({ plural, namespace, apiGroup, apiVersion, kind, backHref, openAPISchema, editName, editValues }: CustomFormProps) {
  const schema = openAPISchema ?? {};
  return (
    <WizardShell schema={schema} plural={plural} namespace={namespace} apiGroup={apiGroup} apiVersion={apiVersion} kind={kind} backHref={backHref} editName={editName} existingValues={editValues} submitLabel="VPN">
      <Separator /><ResourcesPicker schema={schema} />
      <Separator /><ReplicasPicker schema={schema} />
      <Separator /><UsersList schema={schema} />
      <Separator /><ExternalToggle schema={schema} />
    </WizardShell>
  );
}
