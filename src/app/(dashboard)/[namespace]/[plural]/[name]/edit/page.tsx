"use client";

import { use, Suspense } from "react";
import Link from "next/link";
import {
  useMarketplacePanels,
  useApplicationDefinition,
  useInstance,
} from "@/lib/k8s/hooks";
import { useNamespace } from "@/hooks/use-namespace";
import { Header } from "@/components/layout/header";
import { getCustomForm } from "@/components/form/registry";
import { DeclarativeForm } from "@/components/form/declarative";
import { useDashboardForm } from "@/lib/k8s/hooks";
import { Skeleton } from "@/components/ui/skeleton";

import "@/plugins";

function EditInstanceContent({
  plural,
  instanceName,
}: {
  plural: string;
  instanceName: string;
}) {
  const { namespace } = useNamespace();
  const { data: panels, isLoading: panelsLoading } = useMarketplacePanels();
  const { data: instance, isLoading: instanceLoading } = useInstance(
    plural,
    namespace,
    instanceName
  );

  const panel = panels?.find((mp) => mp.spec.plural === plural);
  const appDefName = panel?.metadata.name ?? "";
  const { data: appDef, isLoading: appDefLoading } =
    useApplicationDefinition(appDefName);
  const dashboardForm = useDashboardForm(plural);

  const backHref = `/${namespace}/${plural}/${instanceName}`;
  const isLoading = panelsLoading || instanceLoading || appDefLoading;

  if (isLoading) {
    return (
      <>
        <Header title="Edit" />
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-2xl space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </>
    );
  }

  if (!panel || !instance) {
    return (
      <>
        <Header title="Not Found" />
        <div className="flex-1 overflow-y-auto p-8">
          <p className="text-sm text-muted-foreground">
            {!panel ? "Application not found." : `Instance "${instanceName}" not found.`}
          </p>
        </div>
      </>
    );
  }

  let schema: Record<string, unknown> | undefined;
  if (appDef?.spec.application.openAPISchema) {
    try {
      schema = JSON.parse(appDef.spec.application.openAPISchema);
    } catch {
      console.error("Failed to parse openAPISchema for", plural);
    }
  }

  const CustomForm = getCustomForm(plural);
  const spec = (instance.spec as Record<string, unknown>) ?? {};

  return (
    <>
      <Header
        title={`Edit ${panel.spec.name}`}
        subtitle={instanceName}
      />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl">
          <Link
            href={backHref}
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-6"
          >
            &larr; Back
          </Link>

          {CustomForm ? (
            <CustomForm
              plural={plural}
              namespace={namespace}
              apiGroup={panel.spec.apiGroup}
              apiVersion={panel.spec.apiVersion}
              kind={appDef?.spec.application.kind ?? panel.spec.name}
              backHref={backHref}
              openAPISchema={schema}
              editName={instanceName}
              editValues={spec}
            />
          ) : dashboardForm && schema ? (
            <DeclarativeForm
              formSpec={dashboardForm.spec}
              plural={plural}
              namespace={namespace}
              apiGroup={panel.spec.apiGroup}
              apiVersion={panel.spec.apiVersion}
              kind={appDef?.spec.application.kind ?? panel.spec.name}
              backHref={backHref}
              openAPISchema={schema}
              editName={instanceName}
              editValues={spec}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              No form available for editing this resource.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

export default function EditInstancePage({
  params,
}: {
  params: Promise<{ plural: string; name: string }>;
}) {
  const { plural, name } = use(params);

  return (
    <Suspense>
      <EditInstanceContent plural={plural} instanceName={name} />
    </Suspense>
  );
}
