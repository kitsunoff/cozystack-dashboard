"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { CozystackLogo } from "@/components/brand/cozystack-logo";
import { TenantCard } from "@/components/tenants/tenant-card";
import { useNamespaceDetails, filterTenantNamespaces } from "@/lib/k8s/hooks";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function TenantsPage() {
  const { data: allNamespaces, isLoading } = useNamespaceDetails();
  const [search, setSearch] = useState("");

  const tenants = useMemo(() => {
    if (!allNamespaces) return [];
    const filtered = filterTenantNamespaces(allNamespaces);
    if (!search) return filtered;
    const q = search.toLowerCase();
    return filtered.filter((ns) => ns.name.toLowerCase().includes(q));
  }, [allNamespaces, search]);

  return (
    <div className="flex h-full">
      {/* Left panel — tenant list */}
      <div className="flex-1 overflow-y-auto p-8 lg:p-12">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-semibold text-foreground">
            Select a Tenant
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a namespace to manage your applications
          </p>

          {/* Search */}
          <div className="relative mt-6 mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tenants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Cards — single column */}
          {isLoading ? (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : tenants.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground">
                {search
                  ? "No tenants match your search"
                  : "No tenant namespaces found"}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {tenants.map((ns) => (
                <TenantCard key={ns.name} namespace={ns} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right panel — branding */}
      <div className="hidden lg:flex w-1/2 shrink-0 flex-col items-center justify-center bg-card border-l">
        <CozystackLogo width={240} height={48} className="text-foreground" />
        <p className="mt-4 text-sm text-muted-foreground">
          Kubernetes Application Platform
        </p>
      </div>
    </div>
  );
}
