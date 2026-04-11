"use client";

import { Separator } from "@/components/ui/separator";
import { WizardShell } from "@/components/form/blocks/wizard-shell";
import { ResourcesPicker, ReplicasPicker, ExternalToggle } from "@/components/form/blocks";
import type { CustomFormProps } from "../registry";

export function TCPBalancerForm({ plural, namespace, apiGroup, apiVersion, kind, backHref, openAPISchema }: CustomFormProps) {
  const schema = openAPISchema ?? {};
  return (
    <WizardShell schema={schema} plural={plural} namespace={namespace} apiGroup={apiGroup} apiVersion={apiVersion} kind={kind} backHref={backHref} submitLabel="TCP Balancer">
      <Separator /><ResourcesPicker schema={schema} />
      <Separator /><ReplicasPicker schema={schema} />
      <Separator /><ExternalToggle schema={schema} />
    </WizardShell>
  );
}
