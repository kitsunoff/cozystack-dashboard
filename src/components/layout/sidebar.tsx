"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMarketplacePanels } from "@/lib/k8s/hooks";
import { useNamespace } from "@/hooks/use-namespace";
import { getServiceColor, getGroupLabel, getGroupOrder } from "@/lib/service-meta";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const { data: panels } = useMarketplacePanels();
  const { namespace } = useNamespace();

  const isMarketplace = pathname === "/marketplace";

  const groups = new Map<string, NonNullable<typeof panels>>();
  panels?.forEach((mp) => {
    const tag = mp.spec.tags[0] || "other";
    if (!groups.has(tag)) groups.set(tag, []);
    groups.get(tag)!.push(mp);
  });

  const order = getGroupOrder();
  const sortedGroups = Array.from(groups.entries()).sort(([a], [b]) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  return (
    <aside className="w-60 shrink-0 border-r bg-card flex flex-col">
      {/* Logo */}
      <div className="px-5 h-14 flex items-center gap-2.5 border-b">
        <div className="grid grid-cols-2 gap-0.5">
          <div className="h-2 w-2 rounded-sm bg-emerald-500" />
          <div className="h-2 w-2 rounded-sm bg-emerald-500" />
          <div className="h-2 w-2 rounded-sm bg-emerald-500" />
          <div className="h-2 w-2 rounded-sm bg-emerald-500" />
        </div>
        <span className="text-[15px] font-semibold">Cozystack</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {/* Platform */}
        <div className="mb-4">
          <span className="px-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            Platform
          </span>
          <div className="mt-2 flex flex-col gap-0.5">
            <Link
              href={`/marketplace?namespace=${namespace}`}
              className={cn(
                "rounded-md px-3 py-2 text-sm transition-colors",
                isMarketplace
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              Marketplace
            </Link>
          </div>
        </div>

        {/* Service groups */}
        {sortedGroups.map(([tag, items]) => (
          <div key={tag} className="mb-4">
            <span className="px-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
              {getGroupLabel(tag)}
            </span>
            <div className="mt-2 flex flex-col gap-0.5">
              {items.map((mp) => {
                const href = `/apps/${mp.spec.plural}?namespace=${namespace}`;
                const isActive = pathname === `/apps/${mp.spec.plural}`;
                const dotColor = getServiceColor(mp.spec.name);
                return (
                  <Link
                    key={mp.metadata.name}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-accent font-medium text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: dotColor }}
                    />
                    <span className="truncate">{mp.spec.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
