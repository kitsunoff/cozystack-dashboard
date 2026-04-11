"use client";

import { Separator } from "@/components/ui/separator";
import { WizardShell } from "@/components/form/blocks/wizard-shell";
import { ResourcesPicker, StoragePicker, ReplicasPicker, UsersList, BackupConfig } from "@/components/form/blocks";
import type { CustomFormProps } from "../registry";

export function ClickHouseForm({ plural, namespace, apiGroup, apiVersion, kind, backHref, openAPISchema }: CustomFormProps) {
  const schema = openAPISchema ?? {};
  return (
    <WizardShell schema={schema} plural={plural} namespace={namespace} apiGroup={apiGroup} apiVersion={apiVersion} kind={kind} backHref={backHref} submitLabel="ClickHouse">
      <Separator /><ResourcesPicker schema={schema} />
      <Separator /><StoragePicker schema={schema} />
      <Separator /><ReplicasPicker schema={schema} />
      <Separator /><UsersList schema={schema} />
      <Separator /><BackupConfig schema={schema} />
    </WizardShell>
  );
}
