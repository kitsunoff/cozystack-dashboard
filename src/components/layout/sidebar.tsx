"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useMarketplacePanels, useApplicationDefinitions } from "@/lib/k8s/hooks";
import { useNamespace } from "@/hooks/use-namespace";
import { CozystackLogo } from "@/components/brand/cozystack-logo";
import { cn } from "@/lib/utils";

const CATEGORY_ORDER = ["IaaS", "PaaS", "NaaS", "Administration"];

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
  const { data: appDefs } = useApplicationDefinitions();
  const { namespace } = useNamespace();

  const isPlatformApps = pathname === `/${namespace}/platform-apps`;
  const isOverview = pathname === `/${namespace}`;

  // Build plural → category map from ApplicationDefinitions
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    if (appDefs) {
      for (const ad of appDefs.items) {
        const category = ad.spec.dashboard?.category;
        if (category) {
          map.set(ad.spec.application.plural, category);
        }
      }
    }
    return map;
  }, [appDefs]);

  // Group panels by dynamic category
  const sortedGroups = useMemo(() => {
    const groups = new Map<string, NonNullable<typeof panels>>();
    panels?.forEach((mp) => {
      const category = categoryMap.get(mp.spec.plural) || "Other";
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category)!.push(mp);
    });

    return Array.from(groups.entries()).sort(([a], [b]) => {
      const ai = CATEGORY_ORDER.indexOf(a);
      const bi = CATEGORY_ORDER.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }, [panels, categoryMap]);

  return (
    <aside className="w-60 shrink-0 flex flex-col bg-card border-r">
      {/* Logo */}
      <div className="px-5 h-14 flex items-center border-b">
        <CozystackLogo className="text-foreground" />
      </div>

      {/* Platform Apps — top-level item */}
      <div className="px-3 pt-4 pb-2">
        <Link
          href={`/${namespace}/platform-apps`}
          className={cn(
            "flex items-center rounded-md px-3 py-2 text-sm transition-colors",
            isPlatformApps
              ? "bg-primary/10 text-primary font-medium border-l-2 border-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          )}
        >
          Platform Apps
        </Link>
        <Link
          href={`/${namespace}`}
          className={cn(
            "flex items-center rounded-md px-3 py-2 text-sm transition-colors",
            isOverview
              ? "bg-primary/10 text-primary font-medium border-l-2 border-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          )}
        >
          Overview
        </Link>
      </div>

      {/* Divider */}
      <div className="mx-3 border-b" />

      {/* Collapsible groups */}
      <nav className="flex-1 overflow-y-auto py-2 px-3">
        {sortedGroups.map(([category, items], idx) => (
          <div key={category}>
            <SidebarGroup title={category} defaultOpen>
              {items.map((mp) => {
                const href = `/${namespace}/${mp.spec.plural}`;
                const isActive = pathname.startsWith(`/${namespace}/${mp.spec.plural}`);
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
