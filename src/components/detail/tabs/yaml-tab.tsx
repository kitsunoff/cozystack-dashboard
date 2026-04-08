"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { AppInstance } from "@/lib/k8s/types";

interface YamlTabProps {
  instance: AppInstance;
}

export function YamlTab({ instance }: YamlTabProps) {
  const [copied, setCopied] = useState(false);

  // Produce clean YAML-like representation
  const yaml = toYaml(instance, 0);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(yaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Resource Definition
        </h3>
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="rounded-xl border bg-card p-5 text-sm font-mono leading-relaxed overflow-x-auto max-h-[600px] overflow-y-auto text-foreground">
        {yaml}
      </pre>
    </div>
  );
}

function toYaml(obj: unknown, indent: number): string {
  const pad = "  ".repeat(indent);

  if (obj === null || obj === undefined) return "null";
  if (typeof obj === "string") {
    if (obj.includes("\n")) return `|\n${obj.split("\n").map((l) => pad + "  " + l).join("\n")}`;
    if (obj.match(/[:#{}[\],&*?|>!%@`]/)) return `"${obj}"`;
    return obj;
  }
  if (typeof obj === "number" || typeof obj === "boolean") return String(obj);

  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]";
    return obj.map((item) => {
      const val = toYaml(item, indent + 1);
      if (typeof item === "object" && item !== null && !Array.isArray(item)) {
        const lines = val.split("\n");
        return `${pad}- ${lines[0]}\n${lines.slice(1).map((l) => pad + "  " + l.trimStart()).join("\n")}`;
      }
      return `${pad}- ${val}`;
    }).join("\n");
  }

  if (typeof obj === "object") {
    const entries = Object.entries(obj as Record<string, unknown>).filter(
      ([k]) => !k.startsWith("managed") && k !== "uid" && k !== "resourceVersion"
    );
    if (entries.length === 0) return "{}";
    return entries
      .map(([key, value]) => {
        if (value === null || value === undefined) return `${pad}${key}: null`;
        if (typeof value === "object" && !Array.isArray(value) && Object.keys(value as object).length > 0) {
          return `${pad}${key}:\n${toYaml(value, indent + 1)}`;
        }
        if (Array.isArray(value) && value.length > 0 && typeof value[0] === "object") {
          return `${pad}${key}:\n${toYaml(value, indent + 1)}`;
        }
        return `${pad}${key}: ${toYaml(value, indent + 1)}`;
      })
      .join("\n");
  }

  return String(obj);
}
