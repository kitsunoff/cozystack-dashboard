"use client";

import { Separator } from "@/components/ui/separator";
import { WizardShell } from "@/components/form/blocks/wizard-shell";
import { ResourcesPicker, StoragePicker, ReplicasPicker, ExternalToggle, schemaAt } from "@/components/form/blocks";
import type { CustomFormProps } from "../registry";

export function KafkaForm({ plural, namespace, apiGroup, apiVersion, kind, backHref, openAPISchema, editName, editValues }: CustomFormProps) {
  const schema = openAPISchema ?? {};
  const kafkaSchema = schemaAt(schema, ["kafka"]);
  const zkSchema = schemaAt(schema, ["zookeeper"]);

  return (
    <WizardShell schema={schema} plural={plural} namespace={namespace} apiGroup={apiGroup} apiVersion={apiVersion} kind={kind} backHref={backHref} editName={editName} existingValues={editValues} submitLabel="Kafka">
      <Separator />
      <h3 className="text-base font-semibold">Kafka</h3>
      <ResourcesPicker schema={kafkaSchema} basePath={["kafka"]} />
      <StoragePicker schema={kafkaSchema} basePath={["kafka"]} />
      <ReplicasPicker schema={kafkaSchema} basePath={["kafka"]} />

      <Separator />
      <h3 className="text-base font-semibold">ZooKeeper</h3>
      <ResourcesPicker schema={zkSchema} basePath={["zookeeper"]} />
      <StoragePicker schema={zkSchema} basePath={["zookeeper"]} />
      <ReplicasPicker schema={zkSchema} basePath={["zookeeper"]} />

      <Separator />
      <ExternalToggle schema={schema} />
    </WizardShell>
  );
}
