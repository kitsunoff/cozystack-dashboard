"use client";

import { useState } from "react";
import { Eye, EyeOff, Copy, Check, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useInstanceSecrets } from "@/lib/k8s/hooks";
import type { AppInstance, K8sSecret } from "@/lib/k8s/types";

interface SecretsTabProps {
  instance: AppInstance;
  plural: string;
  namespace: string;
}

export function SecretsTab({ instance, plural, namespace }: SecretsTabProps) {
  const { data: secrets, isLoading, error } = useInstanceSecrets(
    namespace,
    plural,
    instance.metadata.name
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48 rounded" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-destructive">
        Failed to load secrets: {error.message}
      </p>
    );
  }

  if (!secrets || secrets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <KeyRound className="size-10 mb-3 opacity-30" />
        <p className="text-sm">No secrets found for this instance</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {secrets.map((secret) => (
        <SecretCard key={secret.metadata.uid ?? secret.metadata.name} secret={secret} />
      ))}
    </div>
  );
}

function SecretCard({ secret }: { secret: K8sSecret }) {
  const entries = Object.entries(secret.data ?? {});

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold">{secret.metadata.name}</h3>
        {secret.type && secret.type !== "Opaque" && (
          <Badge variant="outline" className="text-[10px] font-mono h-4">
            {secret.type}
          </Badge>
        )}
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Empty secret</p>
      ) : (
        <div className="rounded-xl border divide-y">
          {entries.map(([key, value]) => (
            <SecretEntry key={key} entryKey={key} encodedValue={value} />
          ))}
        </div>
      )}
    </div>
  );
}

function SecretEntry({ entryKey, encodedValue }: { entryKey: string; encodedValue: string }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  let decoded: string;
  try {
    decoded = atob(encodedValue);
  } catch {
    decoded = encodedValue;
  }

  const isMultiline = decoded.includes("\n");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(decoded);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-muted-foreground font-mono shrink-0">{entryKey}</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setRevealed((r) => !r)}
            aria-label={revealed ? "Hide value" : "Show value"}
          >
            {revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleCopy}
            aria-label="Copy value"
          >
            {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
          </Button>
        </div>
      </div>
      {revealed && (
        isMultiline ? (
          <pre className="mt-2 rounded-lg bg-muted/50 p-3 text-xs font-mono leading-relaxed overflow-x-auto max-h-64 overflow-y-auto">
            {decoded}
          </pre>
        ) : (
          <p className="mt-1 text-sm font-mono break-all">{decoded}</p>
        )
      )}
      {!revealed && (
        <p className="mt-1 text-sm text-muted-foreground/50 font-mono">
          {"•".repeat(Math.min(decoded.length, 24))}
        </p>
      )}
    </div>
  );
}
