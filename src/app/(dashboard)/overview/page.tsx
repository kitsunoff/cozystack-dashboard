"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useMarketplacePanels, useAllInstances } from "@/lib/k8s/hooks";
import type { ServiceInstances } from "@/lib/k8s/hooks";
import { useNamespace } from "@/hooks/use-namespace";
import { Header } from "@/components/layout/header";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getServiceColor } from "@/lib/service-meta";

const MAX_VISIBLE_INSTANCES = 3;

export default function OverviewPage() {
  const { namespace } = useNamespace();
  const { data: panels } = useMarketplacePanels();
  const { data: services, isLoading } = useAllInstances(namespace, panels);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return services;
    const q = search.toLowerCase();
    return services
      .map((svc) => ({
        ...svc,
        instances: svc.instances.filter((i) =>
          i.metadata.name.toLowerCase().includes(q)
        ),
      }))
      .filter(
        (svc) =>
          svc.instances.length > 0 ||
          svc.panel.spec.name.toLowerCase().includes(q)
      );
  }, [services, search]);

  return (
    <>
      <Header title="Overview" subtitle="All running services" />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search instances..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Service cards */}
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground">
                {search ? "No instances match your search" : "No instances deployed"}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filtered.map((svc) => (
                <ServiceCard key={svc.panel.metadata.name} service={svc} namespace={namespace} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ServiceCard({ service, namespace }: { service: ServiceInstances; namespace: string }) {
  const { panel, instances } = service;
  const color = getServiceColor(panel.spec.name);
  const visible = instances.slice(0, MAX_VISIBLE_INSTANCES);
  const remaining = instances.length - MAX_VISIBLE_INSTANCES;

  return (
    <div className="rounded-xl border bg-card p-4 transition-all hover:ring-1 hover:ring-foreground/10">
      {/* Header: icon + service name */}
      <Link
        href={`/apps/${panel.spec.plural}?namespace=${namespace}`}
        className="flex items-center gap-3 mb-3"
      >
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0"
          style={{ backgroundColor: `${color}15` }}
        >
          {panel.spec.icon ? (
            <img
              src={`data:image/svg+xml;base64,${panel.spec.icon}`}
              alt={panel.spec.name}
              className="h-6 w-6"
            />
          ) : (
            <span className="text-base font-bold" style={{ color }}>
              {panel.spec.name.charAt(0)}
            </span>
          )}
        </div>
        <div>
          <span className="text-sm font-medium hover:underline">{panel.spec.name}</span>
          <span className="text-xs text-muted-foreground ml-2">{instances.length}</span>
        </div>
      </Link>

      {/* Instance names */}
      <div className="flex flex-wrap gap-x-1.5 gap-y-1 text-[13px] text-muted-foreground">
        {visible.map((inst, i) => (
          <span key={inst.metadata.name}>
            <Link
              href={`/apps/${panel.spec.plural}/${inst.metadata.name}?namespace=${namespace}`}
              className="hover:text-foreground hover:underline"
            >
              {inst.metadata.name}
            </Link>
            {i < visible.length - 1 || remaining > 0 ? "," : ""}
          </span>
        ))}
        {remaining > 0 && (
          <Link
            href={`/apps/${panel.spec.plural}?namespace=${namespace}`}
            className="text-muted-foreground/60 hover:text-foreground"
          >
            +{remaining} more
          </Link>
        )}
      </div>
    </div>
  );
}
