"use client";

import { useState, useCallback, useRef, useEffect, forwardRef } from "react";
import { usePathname } from "next/navigation";
import { Search, ChevronRight, ArrowLeft } from "lucide-react";
import {
  DialogRoot,
  DialogPortal,
  DialogBackdrop,
  DialogPopup,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useHotkey } from "./use-hotkey";
import { useKeyboardNav } from "./use-keyboard-nav";
import { useCommandItems } from "./use-command-items";
import type { NavigationLevel } from "./types";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<NavigationLevel>({ type: "root" });
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  const reset = useCallback(() => {
    setOpen(false);
    setQuery("");
    setLevel({ type: "root" });
  }, []);

  const toggle = useCallback(() => {
    if (open) {
      reset();
    } else {
      setOpen(true);
    }
  }, [open, reset]);

  useHotkey(toggle);

  // Close on route change
  useEffect(() => {
    reset();
  }, [pathname, reset]);

  const navigate = useCallback((next: NavigationLevel) => {
    setLevel(next);
    setQuery("");
  }, []);

  const goBack = useCallback(() => {
    if (level.type === "instance") {
      const panel = level;
      setLevel({
        type: "resource",
        plural: panel.plural,
        label: panel.label,
        icon: panel.icon,
      });
    } else {
      setLevel({ type: "root" });
    }
    setQuery("");
  }, [level]);

  const { items, isLoading } = useCommandItems(query, level, navigate, reset);
  const { highlightedIndex, onKeyDown: navKeyDown, setItemRef } =
    useKeyboardNav(items);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        reset();
      } else {
        setOpen(true);
      }
    },
    [reset]
  );

  const handleSelect = useCallback(
    (index: number) => {
      items[index]?.onSelect();
    },
    [items]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Backspace on empty input → go back
      if (e.key === "Backspace" && query === "" && level.type !== "root") {
        e.preventDefault();
        goBack();
        return;
      }
      navKeyDown(e);
    },
    [query, level.type, goBack, navKeyDown]
  );

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Group items by group label (preserve order)
  const grouped: { label: string; items: { item: (typeof items)[0]; globalIndex: number }[] }[] = [];
  const groupMap = new Map<string, number>();
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const groupLabel = item.group ?? "";
    let idx = groupMap.get(groupLabel);
    if (idx === undefined) {
      idx = grouped.length;
      groupMap.set(groupLabel, idx);
      grouped.push({ label: groupLabel, items: [] });
    }
    grouped[idx].items.push({ item, globalIndex: i });
  }

  const breadcrumb =
    level.type === "resource"
      ? level.label
      : level.type === "instance"
        ? level.label
        : null;

  return (
    <DialogRoot open={open} onOpenChange={handleOpenChange} modal>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup
          className="w-full max-w-[640px] overflow-hidden p-0"
          aria-label="Command palette"
        >
          {/* Header with optional back + search */}
          <div className="flex items-center border-b px-3" onKeyDown={handleKeyDown}>
            {breadcrumb ? (
              <button
                type="button"
                onClick={goBack}
                className="mr-2 flex items-center gap-1 shrink-0 rounded px-1.5 py-0.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                {breadcrumb}
              </button>
            ) : (
              <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground/50" />
            )}
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                breadcrumb
                  ? `Search in ${breadcrumb}...`
                  : "Type a command or search..."
              }
              className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground/50"
            />
            {!breadcrumb && (
              <kbd className="pointer-events-none ml-2 hidden h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
                <span className="text-xs">&#8984;</span>K
              </kbd>
            )}
          </div>

          {/* Results list */}
          <div
            className="max-h-[300px] overflow-y-auto p-1"
            role="listbox"
            aria-label="Results"
          >
            {items.length === 0 && !isLoading && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No results found.
              </div>
            )}

            {isLoading && items.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Loading...
              </div>
            )}

            {grouped.map((group) => (
              <div key={group.label} role="group" aria-label={group.label}>
                {group.label && (
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    {group.label}
                  </div>
                )}
                {group.items.map(({ item, globalIndex }) => (
                  <PaletteItem
                    key={item.id}
                    ref={(el) => setItemRef(globalIndex, el)}
                    highlighted={globalIndex === highlightedIndex}
                    icon={item.icon}
                    label={item.label}
                    description={item.description}
                    drilldown={item.drilldown}
                    onSelect={() => handleSelect(globalIndex)}
                  />
                ))}
              </div>
            ))}
          </div>
        </DialogPopup>
      </DialogPortal>
    </DialogRoot>
  );
}

const PaletteItem = forwardRef<
  HTMLDivElement,
  {
    highlighted: boolean;
    icon?: React.ReactNode;
    label: string;
    description?: string;
    drilldown?: boolean;
    onSelect: () => void;
  }
>(function PaletteItem(
  { highlighted, icon, label, description, drilldown, onSelect },
  ref
) {
  return (
    <div
      ref={ref}
      role="option"
      aria-selected={highlighted}
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none",
        highlighted && "bg-accent text-accent-foreground"
      )}
      onClick={onSelect}
    >
      {icon && (
        <span className="flex h-5 w-5 items-center justify-center shrink-0">
          {icon}
        </span>
      )}
      <span className="flex-1 truncate">{label}</span>
      {description && (
        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
          {description}
        </span>
      )}
      {drilldown && (
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      )}
    </div>
  );
});
