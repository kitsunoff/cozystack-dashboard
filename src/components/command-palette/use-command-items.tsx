"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  useMarketplacePanels,
  useAllInstances,
  useNamespaces,
  useInstances,
} from "@/lib/k8s/hooks";
import { getDetailActions } from "@/components/registry";
import { useNamespace } from "@/hooks/use-namespace";
import type { CommandItem, NavigationLevel } from "./types";

function matchesQuery(item: CommandItem, query: string): boolean {
  const q = query.toLowerCase();
  if (item.label.toLowerCase().includes(q)) return true;
  if (item.description?.toLowerCase().includes(q)) return true;
  if (item.keywords?.some((kw) => kw.toLowerCase().includes(q))) return true;
  return false;
}

function panelIcon(icon?: string): React.ReactNode {
  if (!icon) return undefined;
  return (
    <img
      src={`data:image/svg+xml;base64,${icon}`}
      alt=""
      className="h-4 w-4"
    />
  );
}

interface UseCommandItemsResult {
  items: CommandItem[];
  isLoading: boolean;
}

export function useCommandItems(
  query: string,
  level: NavigationLevel,
  navigate: (level: NavigationLevel) => void,
  close: () => void
): UseCommandItemsResult {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { namespace, setNamespace } = useNamespace();

  const { data: panels } = useMarketplacePanels();
  const { data: services, isLoading: allInstancesLoading } = useAllInstances(
    namespace,
    panels ?? undefined
  );
  const { data: namespacesData } = useNamespaces();

  // For resource-level drill-down: fetch instances of one type
  const resourcePlural =
    level.type === "resource" ? level.plural : "";
  const { data: singleResourceData, isLoading: singleLoading } = useInstances(
    resourcePlural,
    namespace
  );

  // --- Root level items ---
  const rootItems = useMemo((): CommandItem[] => {
    const items: CommandItem[] = [];

    if (panels) {
      for (const panel of panels) {
        items.push({
          id: `root-${panel.spec.plural}`,
          label: panel.spec.name,
          description: panel.spec.plural,
          icon: panelIcon(panel.spec.icon),
          group: "Services",
          drilldown: true,
          keywords: [panel.spec.plural, ...(panel.spec.tags ?? [])],
          onSelect: () =>
            navigate({
              type: "resource",
              plural: panel.spec.plural,
              label: panel.spec.name,
              icon: panel.spec.icon,
            }),
        });
      }
    }

    items.push({
      id: "root-platform-apps",
      label: "Platform Apps",
      description: "Browse available services",
      group: "Quick Actions",
      keywords: ["marketplace", "catalog"],
      onSelect: () => {
        close();
        router.push(`/${namespace}/platform-apps`);
      },
    });

    items.push({
      id: "root-overview",
      label: "Overview",
      description: "All instances overview",
      group: "Quick Actions",
      keywords: ["home", "dashboard"],
      onSelect: () => {
        close();
        router.push(`/${namespace}`);
      },
    });

    items.push({
      id: "root-theme",
      label: theme === "dark" ? "Switch to light mode" : "Switch to dark mode",
      group: "Quick Actions",
      keywords: ["theme", "dark", "light", "mode"],
      onSelect: () => {
        close();
        setTheme(theme === "dark" ? "light" : "dark");
      },
    });

    if (namespacesData) {
      for (const ns of namespacesData) {
        if (ns === namespace) continue;
        items.push({
          id: `root-ns-${ns}`,
          label: ns,
          description: "Switch namespace",
          group: "Switch Namespace",
          keywords: ["tenant", "namespace", "switch"],
          onSelect: () => {
            close();
            setNamespace(ns);
          },
        });
      }
    }

    return items;
  }, [panels, namespacesData, namespace, theme, router, setTheme, setNamespace, navigate, close]);

  // --- Resource level items (instances + create) ---
  const resourceItems = useMemo((): CommandItem[] => {
    if (level.type !== "resource") return [];

    const items: CommandItem[] = [];
    const instances = singleResourceData?.items ?? [];

    for (const inst of instances) {
      items.push({
        id: `res-${inst.metadata.name}`,
        label: inst.metadata.name,
        drilldown: true,
        icon: panelIcon(level.icon),
        onSelect: () =>
          navigate({
            type: "instance",
            plural: level.plural,
            instance: inst,
            label: inst.metadata.name,
            icon: level.icon,
          }),
      });
    }

    items.push({
      id: "res-create",
      label: `Create new ${level.label}`,
      group: "Actions",
      keywords: ["create", "new", "deploy"],
      onSelect: () => {
        close();
        router.push(`/${namespace}/${level.plural}/new`);
      },
    });

    return items;
  }, [level, singleResourceData, namespace, router, navigate, close]);

  // --- Instance level items (actions) ---
  const instanceItems = useMemo((): CommandItem[] => {
    if (level.type !== "instance") return [];

    const items: CommandItem[] = [];
    const { plural, instance } = level;

    items.push({
      id: "inst-open",
      label: "Open detail page",
      onSelect: () => {
        close();
        router.push(
          `/${namespace}/${plural}/${instance.metadata.name}`
        );
      },
    });

    items.push({
      id: "inst-edit",
      label: "Edit",
      onSelect: () => {
        close();
        router.push(
          `/${namespace}/${plural}/${instance.metadata.name}/edit`
        );
      },
    });

    // Registered plugin actions (Kubeconfig, Start/Stop, etc.)
    const registeredActions = getDetailActions(plural);
    for (const actionDef of registeredActions) {
      items.push({
        id: `inst-action-${actionDef.key}`,
        label: actionDef.label,
        icon: actionDef.icon
          ? (() => {
              const Icon = actionDef.icon!;
              return <Icon className="h-4 w-4" />;
            })()
          : undefined,
        onSelect: () => {
          close();
          if (typeof actionDef.action === "string") {
            router.push(actionDef.action);
          } else {
            actionDef.action({ plural, namespace, instance });
          }
        },
      });
    }

    items.push({
      id: "inst-yaml",
      label: "YAML",
      onSelect: () => {
        close();
        router.push(
          `/${namespace}/${plural}/${instance.metadata.name}?tab=yaml`
        );
      },
    });

    return items;
  }, [level, namespace, router, close]);

  // --- Flat search across everything ---
  const searchItems = useMemo((): CommandItem[] => {
    const items: CommandItem[] = [];

    // All instances across all services
    if (services) {
      for (const svc of services) {
        for (const inst of svc.instances) {
          items.push({
            id: `search-inst-${svc.panel.spec.plural}-${inst.metadata.name}`,
            label: inst.metadata.name,
            description: svc.panel.spec.name,
            icon: panelIcon(svc.panel.spec.icon),
            group: "Instances",
            drilldown: true,
            keywords: [svc.panel.spec.plural, svc.panel.spec.name.toLowerCase()],
            onSelect: () =>
              navigate({
                type: "instance",
                plural: svc.panel.spec.plural,
                instance: inst,
                label: inst.metadata.name,
                icon: svc.panel.spec.icon,
              }),
          });
        }
      }
    }

    // All resource types
    if (panels) {
      for (const panel of panels) {
        items.push({
          id: `search-nav-${panel.spec.plural}`,
          label: panel.spec.name,
          description: panel.spec.plural,
          icon: panelIcon(panel.spec.icon),
          group: "Navigate",
          drilldown: true,
          keywords: [panel.spec.plural, ...(panel.spec.tags ?? [])],
          onSelect: () =>
            navigate({
              type: "resource",
              plural: panel.spec.plural,
              label: panel.spec.name,
              icon: panel.spec.icon,
            }),
        });

        items.push({
          id: `search-create-${panel.spec.plural}`,
          label: `Create ${panel.spec.name}`,
          description: panel.spec.plural,
          icon: panelIcon(panel.spec.icon),
          group: "Create New",
          keywords: ["create", "new", "deploy", panel.spec.plural, ...(panel.spec.tags ?? [])],
          onSelect: () => {
            close();
            router.push(`/${namespace}/${panel.spec.plural}/new`);
          },
        });
      }
    }

    // Namespaces
    if (namespacesData) {
      for (const ns of namespacesData) {
        if (ns === namespace) continue;
        items.push({
          id: `search-ns-${ns}`,
          label: ns,
          description: "Switch namespace",
          group: "Switch Namespace",
          keywords: ["tenant", "namespace", "switch"],
          onSelect: () => {
            close();
            setNamespace(ns);
          },
        });
      }
    }

    // Static actions
    items.push({
      id: "search-platform-apps",
      label: "Platform Apps",
      description: "Browse available services",
      group: "Quick Actions",
      keywords: ["marketplace", "catalog"],
      onSelect: () => {
        close();
        router.push(`/${namespace}/platform-apps`);
      },
    });

    items.push({
      id: "search-theme",
      label: theme === "dark" ? "Switch to light mode" : "Switch to dark mode",
      group: "Quick Actions",
      keywords: ["theme", "dark", "light", "mode"],
      onSelect: () => {
        close();
        setTheme(theme === "dark" ? "light" : "dark");
      },
    });

    return items;
  }, [services, panels, namespacesData, namespace, theme, router, setTheme, setNamespace, navigate, close]);

  // --- Select items based on mode ---
  const hasQuery = query.trim().length > 0;

  const currentItems = useMemo(() => {
    if (hasQuery) {
      return searchItems.filter((item) => matchesQuery(item, query));
    }
    switch (level.type) {
      case "root":
        return rootItems;
      case "resource":
        return resourceItems;
      case "instance":
        return instanceItems;
    }
  }, [hasQuery, query, level.type, searchItems, rootItems, resourceItems, instanceItems]);

  const isLoading =
    (hasQuery && allInstancesLoading) ||
    (level.type === "resource" && singleLoading);

  return { items: currentItems, isLoading };
}
