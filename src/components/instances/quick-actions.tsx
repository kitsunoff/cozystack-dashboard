"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { getListActions } from "@/components/registry";
import type { ActionDef } from "@/components/registry";

interface QuickActionsProps {
  plural: string;
  namespace: string;
  appName: string;
}

export function QuickActions({ plural, namespace, appName }: QuickActionsProps) {
  const router = useRouter();
  const customActions = getListActions(plural);

  const handleAction = (action: ActionDef) => {
    if (typeof action.action === "string") {
      router.push(action.action);
    } else {
      action.action({ plural, namespace });
    }
  };

  return (
    <div className="rounded-xl border bg-card">
      <div className="px-4 py-3 border-b">
        <span className="text-sm font-medium">Quick Actions</span>
      </div>
      <div className="p-2 space-y-1">
        {/* Default create action */}
        <Link
          href={`/${namespace}/${plural}/new`}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm bg-foreground text-background hover:bg-foreground/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create {appName}
        </Link>

        {/* Custom actions from registry */}
        {customActions.map((action) => (
          <button
            key={action.key}
            onClick={() => handleAction(action)}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm w-full text-left text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            {action.icon && <action.icon className="h-4 w-4" />}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
