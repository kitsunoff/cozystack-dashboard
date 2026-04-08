"use client";

import { use, Suspense, useMemo } from "react";
import { useMarketplacePanels, useInstances } from "@/lib/k8s/hooks";
import { useNamespace } from "@/hooks/use-namespace";
import { Header } from "@/components/layout/header";
import { InstanceTable } from "@/components/instances/instance-table";
import { InstanceMetrics } from "@/components/instances/instance-metrics";
import { QuickActions } from "@/components/instances/quick-actions";
import { ActivityFeed } from "@/components/instances/activity-feed";
import { generateMockInstances, generateMockActivity } from "@/components/instances/mock-data";
import { Skeleton } from "@/components/ui/skeleton";

function InstancesContent({ plural }: { plural: string }) {
  const { namespace } = useNamespace();
  const { data: panels, isLoading: panelsLoading } = useMarketplacePanels();
  const { data: instanceList, isLoading: instancesLoading } = useInstances(
    plural,
    namespace
  );

  const panel = panels?.find((mp) => mp.spec.plural === plural);
  const appName = panel?.spec.name ?? plural;

  // Use mock data when no real instances exist (dev mode)
  const instances = useMemo(() => {
    const real = instanceList?.items ?? [];
    if (real.length > 0) return real;
    return generateMockInstances(plural, panel?.spec.name ?? "Instance", namespace);
  }, [instanceList, plural, panel, namespace]);

  const activity = useMemo(() => generateMockActivity(plural), [plural]);

  const isLoading = panelsLoading || instancesLoading;

  return (
    <>
      <Header
        title={appName}
        subtitle={panel?.spec.description}
      />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="flex gap-8">
          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-8">
            {/* Metrics */}
            {isLoading ? (
              <div className="flex gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-24 rounded-lg" />
                ))}
              </div>
            ) : (
              <InstanceMetrics instances={instances} />
            )}

            {/* Table */}
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                Instances
              </h2>
              <InstanceTable
                instances={isLoading ? undefined : instances}
                plural={plural}
                namespace={namespace}
                isLoading={isLoading}
                appName={appName}
              />
            </div>

            {/* Activity */}
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                Recent Activity
              </h2>
              <div className="rounded-xl border bg-card">
                <ActivityFeed events={activity} />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-56 shrink-0 space-y-4">
            <QuickActions
              plural={plural}
              namespace={namespace}
              appName={appName}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default function InstancesPage({
  params,
}: {
  params: Promise<{ plural: string }>;
}) {
  const { plural } = use(params);

  return (
    <Suspense>
      <InstancesContent plural={plural} />
    </Suspense>
  );
}
