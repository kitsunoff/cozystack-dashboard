"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { k8sCreate } from "@/lib/k8s/client";
import { endpoints } from "@/lib/k8s/endpoints";
import { cn } from "@/lib/utils";
import type { CustomFormProps } from "../registry";

const PRESET_IMAGES = [
  { value: "ubuntu", label: "Ubuntu", icon: "🟠" },
  { value: "fedora", label: "Fedora", icon: "🔵" },
  { value: "alpine", label: "Alpine", icon: "🔷" },
  { value: "cirros", label: "CirrOS", icon: "☁️" },
  { value: "talos", label: "Talos Linux", icon: "⚙️" },
];

const DISK_SIZES = [
  { value: "5Gi", label: "5 GiB" },
  { value: "10Gi", label: "10 GiB" },
  { value: "20Gi", label: "20 GiB" },
  { value: "50Gi", label: "50 GiB" },
  { value: "100Gi", label: "100 GiB" },
  { value: "200Gi", label: "200 GiB" },
];

type SourceType = "image" | "http" | "empty";

export function VMDiskForm({
  plural,
  namespace,
  apiGroup,
  apiVersion,
  kind,
  backHref,
}: CustomFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("image");
  const [imageName, setImageName] = useState("ubuntu");
  const [httpUrl, setHttpUrl] = useState("");
  const [storage, setStorage] = useState("10Gi");
  const [customStorage, setCustomStorage] = useState("");
  const [storageClass, setStorageClass] = useState("replicated");
  const [optical, setOptical] = useState(false);

  const effectiveStorage = customStorage || storage;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const source: Record<string, unknown> = {};
      if (sourceType === "image") {
        source.image = { name: imageName };
      } else if (sourceType === "http") {
        source.http = { url: httpUrl };
      }

      const resource = {
        apiVersion: `${apiGroup}/${apiVersion}`,
        kind,
        metadata: { name: name.trim(), namespace },
        spec: {
          source: Object.keys(source).length > 0 ? source : undefined,
          storage: effectiveStorage,
          storageClass,
          optical,
        },
      };

      await k8sCreate(endpoints.instances(plural, namespace), resource);
      router.push(backHref);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create disk");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* General */}
      <Section title="General">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Disk Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="my-disk"
            required
            autoFocus
          />
        </div>
      </Section>

      <Separator />

      {/* Source */}
      <Section title="Source">
        <div className="flex gap-2 mb-4">
          {(["image", "http", "empty"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSourceType(t)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium border transition-colors",
                sourceType === t
                  ? "bg-foreground text-background border-foreground"
                  : "text-muted-foreground border-border hover:border-foreground/30"
              )}
            >
              {t === "image" ? "Preset Image" : t === "http" ? "HTTP URL" : "Empty Disk"}
            </button>
          ))}
        </div>

        {sourceType === "image" && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {PRESET_IMAGES.map((img) => (
              <button
                key={img.value}
                type="button"
                onClick={() => setImageName(img.value)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border px-3 py-3 transition-all",
                  imageName === img.value
                    ? "border-foreground bg-accent ring-1 ring-foreground"
                    : "hover:border-foreground/30 hover:bg-accent/50"
                )}
              >
                <span className="text-xl">{img.icon}</span>
                <span className="text-xs font-medium">{img.label}</span>
              </button>
            ))}
          </div>
        )}

        {sourceType === "http" && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Image URL</Label>
            <Input
              value={httpUrl}
              onChange={(e) => setHttpUrl(e.target.value)}
              placeholder="https://cloud-images.ubuntu.com/..."
              type="url"
            />
          </div>
        )}

        {sourceType === "empty" && (
          <p className="text-sm text-muted-foreground">
            An empty disk will be created. You can attach it to a VM and format it manually.
          </p>
        )}
      </Section>

      <Separator />

      {/* Storage */}
      <Section title="Storage">
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-3 block">Size</Label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {DISK_SIZES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => {
                    setStorage(s.value);
                    setCustomStorage("");
                  }}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                    storage === s.value && !customStorage
                      ? "border-foreground bg-accent ring-1 ring-foreground"
                      : "text-muted-foreground hover:border-foreground/30"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <Input
                value={customStorage}
                onChange={(e) => setCustomStorage(e.target.value)}
                placeholder="Custom size (e.g. 500Gi)"
                className="max-w-xs"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Storage Class</Label>
            <Input
              value={storageClass}
              onChange={(e) => setStorageClass(e.target.value)}
              placeholder="replicated"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div>
              <Label className="text-sm font-medium">Optical Disk</Label>
              <p className="text-sm text-muted-foreground">
                Treat as CD/DVD (read-only)
              </p>
            </div>
            <Switch checked={optical} onCheckedChange={setOptical} />
          </div>
        </div>
      </Section>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create Disk"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push(backHref)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-base font-semibold mb-4">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
