"use client";

import { useState, useMemo } from "react";
import { useMarketplacePanels } from "@/lib/k8s/hooks";
import { useNamespace } from "@/hooks/use-namespace";
import { AppCard } from "./app-card";
import { TagFilter } from "./tag-filter";
import { Skeleton } from "@/components/ui/skeleton";
import { getGroupLabel, getGroupOrder } from "@/lib/service-meta";
import type { MarketplacePanel } from "@/lib/k8s/types";

interface AppGridProps {
  searchQuery?: string;
}

export function AppGrid({ searchQuery }: AppGridProps) {
  const { data: panels, isLoading, error } = useMarketplacePanels();
  const { namespace } = useNamespace();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const allTags = useMemo(() => {
    if (!panels) return [];
    const tagSet = new Set<string>();
    panels.forEach((mp) => mp.spec.tags.forEach((t) => tagSet.add(t)));
    const order = getGroupOrder();
    return Array.from(tagSet).sort((a, b) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }, [panels]);

  const filtered = useMemo(() => {
    if (!panels) return [];
    let result = panels;
    if (selectedTag) {
      result = result.filter((mp) => mp.spec.tags.includes(selectedTag));
    }
    if (searchQuery?.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (mp) =>
          mp.spec.name.toLowerCase().includes(q) ||
          mp.spec.description.toLowerCase().includes(q)
      );
    }
    return result;
  }, [panels, selectedTag, searchQuery]);

  // Group filtered results by primary tag
  const grouped = useMemo(() => {
    const groups = new Map<string, MarketplacePanel[]>();
    filtered.forEach((mp) => {
      const tag = mp.spec.tags[0] || "other";
      if (!groups.has(tag)) groups.set(tag, []);
      groups.get(tag)!.push(mp);
    });
    const order = getGroupOrder();
    return Array.from(groups.entries()).sort(([a], [b]) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }, [filtered]);

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
        Failed to load: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TagFilter
        tags={allTags}
        selected={selectedTag}
        onSelect={setSelectedTag}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">
          No services found
        </p>
      ) : (
        <div className="space-y-8">
          {grouped.map(([tag, items]) => (
            <section key={tag}>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                {getGroupLabel(tag)}
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((mp) => (
                  <AppCard
                    key={mp.metadata.name}
                    spec={mp.spec}
                    namespace={namespace}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
