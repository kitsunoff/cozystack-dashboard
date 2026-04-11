"use client";

import { use, Suspense } from "react";
import Link from "next/link";
import {
  useMarketplacePanels,
  useApplicationDefinition,
  useCustomFormsOverrides,
  useCustomFormsPrefills,
} from "@/lib/k8s/hooks";
import { useNamespace } from "@/hooks/use-namespace";
import { Header } from "@/components/layout/header";
import { SchemaForm } from "@/components/form/schema-form";
import { getCustomForm } from "@/components/form/registry";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { CFOSpec, CFPSpec } from "@/lib/schema/types";

// Register all custom forms (side-effect import)
import "@/components/form/custom";

function CreateInstanceContent({ plural }: { plural: string }) {
  const { namespace } = useNamespace();
  const { data: panels, isLoading: panelsLoading } = useMarketplacePanels();
  const { data: cfoList, isLoading: cfoLoading } = useCustomFormsOverrides();
  const { data: cfpList, isLoading: cfpLoading } = useCustomFormsPrefills();

  const panel = panels?.find((mp) => mp.spec.plural === plural);
  const backHref = `/apps/${plural}?namespace=${namespace}`;

  const appDefName = panel?.metadata.name ?? "";
  const { data: appDef, isLoading: appDefLoading } =
    useApplicationDefinition(appDefName);

  const isLoading = panelsLoading || cfoLoading || cfpLoading || appDefLoading;

  if (isLoading) {
    return (
      <>
        <Header title="Create" />
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

  if (!panel) {
    return (
      <>
        <Header title="Not Found" />
        <div className="flex-1 overflow-y-auto p-8">
          <p className="text-sm text-muted-foreground">Application not found.</p>
          <Link href="/marketplace">
            <Button variant="ghost" size="sm" className="mt-2">
              Back to Marketplace
            </Button>
          </Link>
        </div>
      </>
    );
  }

  let schema: Record<string, unknown> | null = null;
  if (appDef?.spec.application.openAPISchema) {
    try {
      schema = JSON.parse(appDef.spec.application.openAPISchema);
    } catch {
      console.error("Failed to parse openAPISchema for", plural);
    }
  }

  // Check for custom form first
  const CustomForm = getCustomForm(plural);

  return (
    <>
      <Header
        title={`Create ${panel.spec.name}`}
        subtitle={panel.spec.description}
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
              openAPISchema={schema ?? undefined}
            />
          ) : schema ? (
            <GenericForm
              schema={schema}
              plural={plural}
              namespace={namespace}
              panel={panel}
              appDef={appDef!}
              cfoList={cfoList}
              cfpList={cfpList}
              backHref={backHref}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              No schema available for this application.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

// Generic OpenAPI form (existing behavior)
function GenericForm({
  schema,
  plural,
  namespace,
  panel,
  appDef,
  cfoList,
  cfpList,
  backHref,
}: {
  schema: Record<string, unknown>;
  plural: string;
  namespace: string;
  panel: { spec: { apiGroup: string; apiVersion: string } };
  appDef: { spec: { application: { kind: string } } };
  cfoList: { items: { spec: { customizationId: string } }[] } | undefined;
  cfpList: { items: { spec: { customizationId: string } }[] } | undefined;
  backHref: string;
}) {
  const customizationId = `default-/${panel.spec.apiGroup}/${panel.spec.apiVersion}/${plural}`;
  const cfo = cfoList?.items.find(
    (c) => c.spec.customizationId === customizationId
  );
  const cfp = cfpList?.items.find(
    (c) => c.spec.customizationId === customizationId
  );

  return (
    <SchemaForm
      openAPISchema={schema}
      cfo={cfo?.spec as CFOSpec | undefined}
      cfp={cfp?.spec as CFPSpec | undefined}
      plural={plural}
      namespace={namespace}
      apiGroup={panel.spec.apiGroup}
      apiVersion={panel.spec.apiVersion}
      kind={appDef.spec.application.kind}
      backHref={backHref}
    />
  );
}

export default function CreateInstancePage({
  params,
}: {
  params: Promise<{ plural: string }>;
}) {
  const { plural } = use(params);

  return (
    <Suspense>
      <CreateInstanceContent plural={plural} />
    </Suspense>
  );
}
