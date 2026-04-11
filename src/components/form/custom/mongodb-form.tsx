"use client";

import { Separator } from "@/components/ui/separator";
import { WizardShell } from "@/components/form/blocks/wizard-shell";
import { VersionPicker, ResourcesPicker, StoragePicker, ReplicasPicker, ExternalToggle, UsersList, BackupConfig } from "@/components/form/blocks";
import type { CustomFormProps } from "../registry";

export function MongoDBForm({ plural, namespace, apiGroup, apiVersion, kind, backHref, openAPISchema }: CustomFormProps) {
  const schema = openAPISchema ?? {};
  return (
    <WizardShell schema={schema} plural={plural} namespace={namespace} apiGroup={apiGroup} apiVersion={apiVersion} kind={kind} backHref={backHref} submitLabel="MongoDB">
      <Separator /><VersionPicker schema={schema} />
      <Separator /><ResourcesPicker schema={schema} />
      <Separator /><StoragePicker schema={schema} />
      <Separator /><ReplicasPicker schema={schema} />
      <Separator /><UsersList schema={schema} />
      <Separator /><ExternalToggle schema={schema} />
      <Separator /><BackupConfig schema={schema} />
    </WizardShell>
  );
}
