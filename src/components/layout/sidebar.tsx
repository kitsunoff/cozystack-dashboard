"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useMarketplacePanels } from "@/lib/k8s/hooks";
import { useNamespace } from "@/hooks/use-namespace";
import { getServiceGroup, getGroupLabel, getGroupOrder } from "@/lib/service-meta";
import { CozystackLogo } from "@/components/brand/cozystack-logo";
import { cn } from "@/lib/utils";

interface SidebarGroupProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function SidebarGroup({ title, defaultOpen = true, children }: SidebarGroupProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-foreground hover:bg-accent/50 rounded-md transition-colors"
      >
        <span>{title}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="mt-0.5 flex flex-col gap-0.5 pb-2">
          {children}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: panels } = useMarketplacePanels();
  const { namespace } = useNamespace();

  const isMarketplace = pathname === "/marketplace";

  // Group panels by new category (IaaS, PaaS, NaaS, Backups)
  const groups = new Map<string, NonNullable<typeof panels>>();
  panels?.forEach((mp) => {
    const group = getServiceGroup(mp.spec.name);
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(mp);
  });

  const order = getGroupOrder();
  const sortedGroups = Array.from(groups.entries())
    .filter(([key]) => key !== "other" || groups.get(key)!.length > 0)
    .sort(([a], [b]) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

  return (
    <aside className="w-60 shrink-0 flex flex-col bg-card border-r">
      {/* Logo */}
      <div className="px-5 h-14 flex items-center border-b">
        <CozystackLogo className="text-foreground" />
      </div>

      {/* Marketplace — top-level item */}
      <div className="px-3 pt-4 pb-2">
        <Link
          href={`/marketplace?namespace=${namespace}`}
          className={cn(
            "flex items-center rounded-md px-3 py-2 text-sm transition-colors",
            isMarketplace
              ? "bg-primary/10 text-primary font-medium border-l-2 border-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          )}
        >
          Marketplace
        </Link>
      </div>

      {/* Divider */}
      <div className="mx-3 border-b" />

      {/* Collapsible groups */}
      <nav className="flex-1 overflow-y-auto py-2 px-3">
        {sortedGroups.map(([groupKey, items], idx) => (
          <div key={groupKey}>
            <SidebarGroup title={getGroupLabel(groupKey)} defaultOpen>
              {items.map((mp) => {
                const href = `/apps/${mp.spec.plural}?namespace=${namespace}`;
                const isActive = pathname === `/apps/${mp.spec.plural}`;
                return (
                  <Link
                    key={mp.metadata.name}
                    href={href}
                    className={cn(
                      "block rounded-md pl-5 pr-3 py-1.5 text-[13px] transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    {mp.spec.name}
                  </Link>
                );
              })}
            </SidebarGroup>
            {idx < sortedGroups.length - 1 && (
              <div className="mx-0 my-1 border-b" />
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
