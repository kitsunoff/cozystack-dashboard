"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { getDetailActions } from "@/components/registry";
import type { ActionDef } from "@/components/registry";
import type { AppInstance } from "@/lib/k8s/types";
import { cn } from "@/lib/utils";

interface DetailQuickActionsProps {
  instance: AppInstance;
  plural: string;
  namespace: string;
}

export function DetailQuickActions({ instance, plural, namespace }: DetailQuickActionsProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const actions = getDetailActions(plural);
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (action: ActionDef) => {
    if (typeof action.action === "string") {
      router.push(action.action);
      return;
    }
    setLoading(action.key);
    try {
      await action.action({ plural, namespace, instance });
      await queryClient.invalidateQueries({ queryKey: ["instance", plural] });
      await queryClient.invalidateQueries({ queryKey: ["instances", plural] });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="rounded-xl border bg-card">
      <div className="px-4 py-3 border-b">
        <span className="text-sm font-medium">Quick Actions</span>
      </div>
      <div className="p-2 space-y-1">
        {/* Default edit action */}
        <button
          onClick={() => router.push(`/apps/${plural}/${instance.metadata.name}/edit?namespace=${namespace}`)}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm w-full text-left bg-foreground text-background hover:bg-foreground/90 transition-colors"
        >
          <Pencil className="h-4 w-4" />
          Edit
        </button>

        {/* Custom actions from registry */}
        {actions.map((action) => (
          <button
            key={action.key}
            onClick={() => handleAction(action)}
            disabled={loading !== null}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm w-full text-left transition-colors",
              action.variant === "destructive"
                ? "text-destructive hover:bg-destructive/10"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
              loading !== null && "opacity-50 cursor-not-allowed"
            )}
          >
            {action.icon && (
              <action.icon className={cn("h-4 w-4", loading === action.key && "animate-spin")} />
            )}
            {loading === action.key ? "..." : action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
