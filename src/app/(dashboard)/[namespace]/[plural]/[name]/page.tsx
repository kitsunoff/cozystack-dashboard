"use client";

import { use, Suspense } from "react";
import Link from "next/link";
import { useMarketplacePanels, useInstance } from "@/lib/k8s/hooks";
import { useNamespace } from "@/hooks/use-namespace";
import { Header } from "@/components/layout/header";
import { DetailView } from "@/components/detail/detail-view";
import { resolveDetailTabs } from "@/components/registry";
import { DetailQuickActions } from "@/components/instances/detail-quick-actions";
import { Skeleton } from "@/components/ui/skeleton";

// Activate all registrations
import "@/plugins";

function InstanceDetailContent({
  plural,
  instanceName,
}: {
  plural: string;
  instanceName: string;
}) {
  const { namespace } = useNamespace();
  const { data: panels, isLoading: panelsLoading } = useMarketplacePanels();
  const { data: instance, isLoading, error } = useInstance(plural, namespace, instanceName);

  const panel = panels?.find((mp) => mp.spec.plural === plural);
  const appName = panel?.spec.name ?? plural;

  const loading = isLoading || panelsLoading;

  if (loading) {
    return (
      <>
        <Header title={instanceName} />
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-5xl space-y-4">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-8 w-64 rounded" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </>
    );
  }

  if (error || !instance) {
    return (
      <>
        <Header title="Not Found" />
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-5xl">
            <Link
              href={`/${namespace}/${plural}`}
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-6"
            >
              &larr; All {appName} instances
            </Link>
            <p className="text-sm text-muted-foreground">
              {error ? error.message : `Instance "${instanceName}" not found in namespace "${namespace}"`}
            </p>
          </div>
        </div>
      </>
    );
  }

  const tabs = resolveDetailTabs(plural);

  return (
    <>
      <Header
        title={appName}
        subtitle={panel?.spec.description}
      />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="flex gap-8">
          <div className="flex-1 min-w-0">
            <Link
              href={`/${namespace}/${plural}`}
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-6"
            >
              &larr; All {appName} instances
            </Link>
            <DetailView
              instance={instance}
              plural={plural}
              namespace={namespace}
              tabs={tabs}
            />
          </div>
          <div className="w-56 shrink-0 space-y-4">
            <DetailQuickActions
              instance={instance}
              plural={plural}
              namespace={namespace}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default function InstanceDetailPage({
  params,
}: {
  params: Promise<{ plural: string; name: string }>;
}) {
  const { plural, name } = use(params);

  return (
    <Suspense>
      <InstanceDetailContent plural={plural} instanceName={name} />
    </Suspense>
  );
}
