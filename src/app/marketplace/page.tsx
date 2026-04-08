"use client";

import { Suspense, useState } from "react";
import { Header } from "@/components/layout/header";
import { AppGrid } from "@/components/marketplace/app-grid";
import { Skeleton } from "@/components/ui/skeleton";

export default function MarketplacePage() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <>
      <Header
        title="Marketplace"
        subtitle="Deploy managed services to your cluster"
        search={{
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: "Search services\u2026",
        }}
      />
      <div className="flex-1 overflow-y-auto p-6">
        <Suspense
          fallback={
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-36 rounded-lg" />
              ))}
            </div>
          }
        >
          <AppGrid searchQuery={searchQuery} />
        </Suspense>
      </div>
    </>
  );
}
