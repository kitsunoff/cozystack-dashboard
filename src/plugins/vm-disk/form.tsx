"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { WizardShell } from "@/components/form/blocks/wizard-shell";
import { StoragePicker } from "@/plugins/core/blocks/index";
import { useFormContext } from "@/components/form/form-context";
import { cn } from "@/lib/utils";
import type { CustomFormProps } from "@/components/form/registry";

const PRESET_IMAGES = [
  { value: "ubuntu", label: "Ubuntu", icon: "🟠" },
  { value: "fedora", label: "Fedora", icon: "🔵" },
  { value: "alpine", label: "Alpine", icon: "🔷" },
  { value: "cirros", label: "CirrOS", icon: "☁️" },
  { value: "talos", label: "Talos Linux", icon: "⚙️" },
];

type SourceType = "image" | "http" | "empty";

export function VMDiskForm({
  plural, namespace, apiGroup, apiVersion, kind, backHref,
  openAPISchema, editName, editValues,
}: CustomFormProps) {
  const schema = openAPISchema ?? {};

  return (
    <WizardShell
      schema={schema}
      plural={plural}
      namespace={namespace}
      apiGroup={apiGroup}
      apiVersion={apiVersion}
      kind={kind}
      backHref={backHref}
      submitLabel="Disk"
      editName={editName}
      existingValues={editValues}
    >
      <Separator />
      <SourceSection />
      <Separator />
      <StoragePicker schema={schema} />
      <Separator />
      <OpticalToggle />
    </WizardShell>
  );
}

function SourceSection() {
  const { getValue, setValue } = useFormContext();

  const source = (getValue(["source"]) as Record<string, unknown>) ?? {};
  const sourceType: SourceType = source.image ? "image" : source.http ? "http" : "empty";
  const imageName = (source.image as Record<string, string>)?.name ?? "ubuntu";
  const httpUrl = (source.http as Record<string, string>)?.url ?? "";

  const setSourceType = (type: SourceType) => {
    if (type === "image") {
      setValue(["source"], { image: { name: imageName } });
    } else if (type === "http") {
      setValue(["source"], { http: { url: httpUrl } });
    } else {
      setValue(["source"], {});
    }
  };

  return (
    <div className="space-y-4">
      <label className="text-sm font-medium">Source</label>
      <div className="flex gap-2">
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
              onClick={() => setValue(["source"], { image: { name: img.value } })}
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
            onChange={(e) => setValue(["source"], { http: { url: e.target.value } })}
            placeholder="https://cloud-images.ubuntu.com/..."
            type="url"
          />
        </div>
      )}

      {sourceType === "empty" && (
        <p className="text-sm text-muted-foreground">
          An empty disk will be created.
        </p>
      )}
    </div>
  );
}

function OpticalToggle() {
  const { getValue, setValue } = useFormContext();
  const optical = (getValue(["optical"]) as boolean) ?? false;

  return (
    <div className="flex items-center justify-between rounded-lg border px-4 py-3">
      <div>
        <Label className="text-sm font-medium">Optical Disk</Label>
        <p className="text-xs text-muted-foreground">Treat as CD/DVD (read-only)</p>
      </div>
      <Switch checked={optical} onCheckedChange={(v) => setValue(["optical"], v)} />
    </div>
  );
}
