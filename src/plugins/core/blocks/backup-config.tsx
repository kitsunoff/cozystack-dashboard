"use client";

import { useFormContext } from "@/components/form/form-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { FormBlockProps } from "@/components/form/blocks/types";
import { schemaHas, schemaDefault, schemaProp, schemaProps } from "@/components/form/blocks/types";

/**
 * Backup configuration — toggle + S3 settings.
 * Shows nothing if schema has no "backup".
 */
export function BackupConfig({ schema, basePath = [], title = "Backup" }: FormBlockProps) {
  if (!schemaHas(schema, "backup")) return null;

  const backupSchema = schemaProp(schema, "backup")!;
  const backupProps = schemaProps(backupSchema);

  const { getValue, setValue } = useFormContext();
  const bPath = [...basePath, "backup"];
  const enabledPath = [...bPath, "enabled"];
  const enabled = (getValue(enabledPath) as boolean) ?? false;

  const fields = [
    { key: "schedule", label: "Schedule (cron)", placeholder: "0 2 * * * *" },
    { key: "destinationPath", label: "Destination Path", placeholder: "s3://bucket/path/" },
    { key: "endpointURL", label: "S3 Endpoint", placeholder: "http://minio:9000" },
    { key: "retentionPolicy", label: "Retention", placeholder: "30d" },
    { key: "s3AccessKey", label: "Access Key", placeholder: "" },
    { key: "s3SecretKey", label: "Secret Key", placeholder: "" },
  ].filter((f) => backupProps?.[f.key]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg border px-4 py-3">
        <div>
          <Label className="text-sm font-medium">{title}</Label>
          <p className="text-xs text-muted-foreground">Enable automated backups</p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(v) => setValue(enabledPath, v)}
        />
      </div>

      {enabled && fields.length > 0 && (
        <div className="space-y-3 pl-1">
          {fields.map((f) => {
            const fPath = [...bPath, f.key];
            const val = (getValue(fPath) as string) ?? schemaDefault<string>(backupSchema, f.key) ?? "";
            return (
              <div key={f.key} className="space-y-1">
                <Label className="text-xs">{f.label}</Label>
                <Input
                  value={val}
                  onChange={(e) => setValue(fPath, e.target.value)}
                  placeholder={f.placeholder}
                  type={f.key.includes("Secret") || f.key.includes("Key") ? "password" : "text"}
                  className="font-mono text-sm"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
