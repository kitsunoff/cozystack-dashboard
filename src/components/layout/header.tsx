"use client";

import { Suspense } from "react";
import { NamespaceSelector } from "./namespace-selector";
import { ThemeToggle } from "./theme-toggle";
import { useCommandPalette } from "@/components/command-palette/command-palette-provider";
import { useIsMac } from "@/hooks/use-is-mac";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
}

export function Header({ title, subtitle, search }: HeaderProps) {
  const { toggle } = useCommandPalette();
  const isMac = useIsMac();

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-8 shrink-0">
      <div>
        {title && <h1 className="text-base font-semibold">{title}</h1>}
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {search && (
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <input
              type="text"
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              placeholder={search.placeholder ?? "Search..."}
              className="h-9 w-64 rounded-md border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        )}
        <button
          type="button"
          onClick={toggle}
          className="hidden h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors sm:flex"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <span>Search...</span>
          <kbd className="pointer-events-none h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium flex">
            {isMac ? <span className="text-xs">&#8984;</span> : <span className="text-xs">Ctrl+</span>}K
          </kbd>
        </button>
        <Suspense>
          <NamespaceSelector />
        </Suspense>
        <ThemeToggle />
      </div>
    </header>
  );
}
