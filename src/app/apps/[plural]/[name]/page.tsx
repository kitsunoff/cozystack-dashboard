"use client";

import { use, Suspense, useMemo } from "react";
import Link from "next/link";
import { useMarketplacePanels, useInstance } from "@/lib/k8s/hooks";
import { useNamespace } from "@/hooks/use-namespace";
import { Header } from "@/components/layout/header";
import { DetailView } from "@/components/detail/detail-view";
import { getTabsForResource } from "@/components/detail/tab-registry";
import { generateMockInstances } from "@/components/instances/mock-data";
import { Skeleton } from "@/components/ui/skeleton";

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

  // Use mock if no real instance
  const resolvedInstance = useMemo(() => {
    if (instance) return instance;
    const mocks = generateMockInstances(plural, appName, namespace);
    return mocks.find((m) => m.metadata.name === instanceName) ?? mocks[0];
  }, [instance, plural, appName, namespace, instanceName]);

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

  if (error && !resolvedInstance) {
    return (
      <>
        <Header title="Error" />
        <div className="flex-1 overflow-y-auto p-8">
          <p className="text-sm text-destructive">{error.message}</p>
        </div>
      </>
    );
  }

  const tabs = getTabsForResource(plural, resolvedInstance);

  return (
    <>
      <Header
        title={appName}
        subtitle={panel?.spec.description}
      />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl">
          <Link
            href={`/apps/${plural}?namespace=${namespace}`}
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-6"
          >
            &larr; All {appName} instances
          </Link>
          <DetailView instance={resolvedInstance} tabs={tabs} />
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
