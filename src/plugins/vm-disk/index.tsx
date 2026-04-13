/**
 * VM Disk plugin — columns, custom form.
 */

import { registerColumns } from "@/components/registry";
import { defaultStatus, ageColumn } from "../helpers";
import { registerCustomForm } from "@/components/form/registry";

// Columns
registerColumns("vmdisks", [
  { key: "status", label: "Status", render: defaultStatus },
  { key: "source", label: "Source", render: (i) => {
    const src = i.spec.source as { image?: { name: string }; http?: { url: string } } | undefined;
    if (src?.image) return (
      <span className="inline-flex items-center rounded-4xl bg-secondary text-secondary-foreground px-2 py-0.5 text-xs font-medium">
        {src.image.name}
      </span>
    );
    if (src?.http) return <span className="text-sm font-mono">{src.http.url}</span>;
    return <span className="text-sm text-muted-foreground">empty</span>;
  }},
  { key: "storage", label: "Size", render: (i) => <span className="text-sm tabular-nums">{String(i.spec.storage ?? "—")}</span> },
  ageColumn,
]);

// Custom form
import { VMDiskForm } from "./form";
registerCustomForm("vmdisks", VMDiskForm);
