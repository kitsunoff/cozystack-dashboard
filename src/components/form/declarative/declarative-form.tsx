"use client";

import { useState, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { WizardShell } from "@/components/form/blocks/wizard-shell";
import { useFormContext } from "@/components/form/form-context";
import { getFormBlock } from "./block-registry";
import { schemaAt } from "@/components/form/blocks/types";
import { cn } from "@/lib/utils";
import type {
  DashboardFormSpec,
  SectionSpec,
  BlockEntry,
  BlockEntryFull,
} from "./types";
import type { CustomFormProps } from "@/components/form/registry";

// --- Helpers ---

function normalizeEntry(entry: BlockEntry): BlockEntryFull {
  if (typeof entry === "string") return { block: entry };
  return entry;
}

/** Split dot-path into basePath array + leaf key */
function parsePath(path: string): { basePath: string[]; leafKey: string } {
  const parts = path.split(".");
  return {
    basePath: parts.slice(0, -1),
    leafKey: parts[parts.length - 1],
  };
}

/** Collect all paths claimed by blocks in the form spec */
function collectClaimedPaths(spec: DashboardFormSpec): Set<string> {
  const paths = new Set<string>();
  for (const section of spec.sections) {
    for (const entry of section.blocks) {
      const full = normalizeEntry(entry);
      if (full.path) {
        paths.add(full.path.split(".")[0]); // claim top-level key
      } else {
        // Short form block — claims its known fields at root
        // We can't know exactly which fields without running the block,
        // so we rely on the block self-hiding via schemaHas
      }
    }
  }
  return paths;
}

/** Get all top-level property keys from schema */
function getSchemaKeys(schema: Record<string, unknown>): string[] {
  const props = schema.properties as Record<string, unknown> | undefined;
  return props ? Object.keys(props) : [];
}

// --- Known fields per block (for advanced section calculation) ---

const BLOCK_KNOWN_FIELDS: Record<string, string[]> = {
  "version-picker": ["version"],
  "resources-picker": ["resourcesPreset", "resources"],
  "storage-picker": ["size", "storageClass"],
  "replicas-picker": ["replicas"],
  "external-toggle": ["external"],
  "users-list": ["users"],
  "access-matrix": ["users", "databases"],
  "backup-config": ["backup"],
};

function collectAllClaimedFields(spec: DashboardFormSpec): Set<string> {
  const claimed = new Set<string>();
  for (const section of spec.sections) {
    for (const entry of section.blocks) {
      const full = normalizeEntry(entry);

      // Explicit path — claim root key
      if (full.path) {
        claimed.add(full.path.split(".")[0]);
      }

      // props.field — generic blocks (boolean-toggle, multiline-input, etc.)
      const propsField = full.props?.field as string | undefined;
      if (propsField && !full.path) {
        claimed.add(propsField);
      }

      // Known fields for built-in blocks (short form without path)
      if (!full.path && !propsField) {
        const knownFields = BLOCK_KNOWN_FIELDS[full.block];
        if (knownFields) {
          for (const f of knownFields) claimed.add(f);
        }
      }
    }
  }
  return claimed;
}

// --- Components ---

interface DeclarativeFormProps extends CustomFormProps {
  formSpec: DashboardFormSpec;
}

export function DeclarativeForm({
  formSpec,
  plural,
  namespace,
  apiGroup,
  apiVersion,
  kind,
  backHref,
  openAPISchema,
  editName,
  editValues,
}: DeclarativeFormProps) {
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
      submitLabel={kind}
      editName={editName}
      existingValues={editValues}
    >
      <DeclarativeFormContent formSpec={formSpec} schema={schema} />
    </WizardShell>
  );
}

function DeclarativeFormContent({
  formSpec,
  schema,
}: {
  formSpec: DashboardFormSpec;
  schema: Record<string, unknown>;
}) {
  // Compute uncovered fields for Advanced section
  const uncoveredFields = useMemo(() => {
    if (formSpec.hideAdvanced) return [];
    const claimed = collectAllClaimedFields(formSpec);
    const allKeys = getSchemaKeys(schema);
    return allKeys.filter((k) => !claimed.has(k));
  }, [formSpec, schema]);

  return (
    <>
      {formSpec.sections.map((section, idx) => (
        <SectionRenderer key={section.id} section={section} schema={schema} showSeparator={idx > 0} />
      ))}

      {/* Advanced section for uncovered fields */}
      {uncoveredFields.length > 0 && (
        <AdvancedSection fields={uncoveredFields} schema={schema} />
      )}
    </>
  );
}

function SectionRenderer({
  section,
  schema,
  showSeparator,
}: {
  section: SectionSpec;
  schema: Record<string, unknown>;
  showSeparator: boolean;
}) {
  const { getValue } = useFormContext();

  // Evaluate showIf
  if (section.showIf) {
    const parts = section.showIf.path.split(".");
    const currentValue = getValue(parts);
    if (currentValue !== section.showIf.value) return null;
  }

  if (section.collapsible) {
    return (
      <CollapsibleSection
        title={section.title}
        defaultOpen={section.defaultOpen ?? true}
        showSeparator={showSeparator}
      >
        <BlockList blocks={section.blocks} schema={schema} />
      </CollapsibleSection>
    );
  }

  return (
    <>
      {showSeparator && <Separator />}
      <div className="space-y-4">
        <h3 className="text-base font-semibold">{section.title}</h3>
        <BlockList blocks={section.blocks} schema={schema} />
      </div>
    </>
  );
}

function CollapsibleSection({
  title,
  defaultOpen,
  showSeparator,
  children,
}: {
  title: string;
  defaultOpen: boolean;
  showSeparator: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <>
      {showSeparator && <Separator />}
      <div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 mb-4 cursor-pointer hover:text-foreground"
        >
          <h3 className="text-base font-semibold">{title}</h3>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
        {open && <div className="space-y-4">{children}</div>}
      </div>
    </>
  );
}

function BlockList({
  blocks,
  schema,
}: {
  blocks: BlockEntry[];
  schema: Record<string, unknown>;
}) {
  return (
    <div className="space-y-4">
      {blocks.map((entry, idx) => (
        <BlockRenderer key={idx} entry={normalizeEntry(entry)} schema={schema} />
      ))}
    </div>
  );
}

function BlockRenderer({
  entry,
  schema,
}: {
  entry: BlockEntryFull;
  schema: Record<string, unknown>;
}) {
  const { getValue } = useFormContext();
  const isDev = process.env.NODE_ENV === "development";

  // Evaluate showIf
  if (entry.showIf) {
    const parts = entry.showIf.path.split(".");
    const currentValue = getValue(parts);
    if (currentValue !== entry.showIf.value) return null;
  }

  if (entry.hidden) return null;

  // Resolve block component
  const BlockComponent = getFormBlock(entry.block);
  if (!BlockComponent) {
    return (
      <div className="rounded-lg border border-amber-500/50 bg-amber-500/5 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
        Unknown block &quot;{entry.block}&quot; — is the plugin installed?
      </div>
    );
  }

  // Resolve schema slice from path
  let blockSchema = schema;
  let basePath: string[] = [];

  if (entry.path) {
    const parts = entry.path.split(".");
    // Full path becomes basePath — block operates at this level
    basePath = parts;
    blockSchema = schemaAt(schema, parts);

    // Check if path exists in schema
    if (!blockSchema.properties && blockSchema.type !== "object") {
      // Path doesn't resolve to an object with properties
      const parentPath = parts.slice(0, -1);
      const leafKey = parts[parts.length - 1];
      const parentSchema = parentPath.length > 0 ? schemaAt(schema, parentPath) : schema;
      const parentProps = parentSchema.properties as Record<string, unknown> | undefined;
      if (parentProps && !parentProps[leafKey]) {
        if (isDev) {
          return (
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/5 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
              Block &quot;{entry.block}&quot; at path &quot;{entry.path}&quot;: not found in schema
            </div>
          );
        }
        console.warn(`[DashboardForm] Block "${entry.block}" at path "${entry.path}": not found in schema`);
        return null;
      }
    }
  }

  return (
    <BlockComponent
      schema={blockSchema}
      basePath={basePath.length > 0 ? basePath : undefined}
      title={entry.title}
      fieldMap={entry.fieldMap}
      readOnly={entry.readOnly}
      props={entry.props}
    />
  );
}

function AdvancedSection({
  fields,
  schema,
}: {
  fields: string[];
  schema: Record<string, unknown>;
}) {
  const [open, setOpen] = useState(false);
  const { getValue, setValue } = useFormContext();
  const props = schema.properties as Record<string, Record<string, unknown>> | undefined;

  if (!props) return null;

  return (
    <>
      <Separator />
      <div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 mb-4 cursor-pointer hover:text-foreground"
        >
          <h3 className="text-base font-semibold text-muted-foreground">Advanced</h3>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
        {open && (
          <div className="space-y-4">
            {fields.map((key) => {
              const fieldSchema = props[key];
              if (!fieldSchema) return null;
              const value = getValue([key]);
              const type = fieldSchema.type as string | undefined;

              return (
                <div key={key} className="space-y-1">
                  <label className="text-sm font-medium">{key}</label>
                  {typeof fieldSchema.description === "string" && (
                    <p className="text-xs text-muted-foreground">{fieldSchema.description}</p>
                  )}
                  {type === "boolean" ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!value}
                        onChange={(e) => setValue([key], e.target.checked)}
                        className="h-4 w-4"
                      />
                      <span className="text-sm text-muted-foreground">{value ? "true" : "false"}</span>
                    </div>
                  ) : type === "integer" || type === "number" ? (
                    <input
                      type="number"
                      value={String(value ?? fieldSchema.default ?? "")}
                      onChange={(e) => setValue([key], type === "integer" ? parseInt(e.target.value) : parseFloat(e.target.value))}
                      className="h-9 w-full rounded-lg border bg-transparent px-3 text-sm outline-none focus:border-ring"
                    />
                  ) : type === "object" || type === "array" ? (
                    <textarea
                      value={JSON.stringify(value ?? fieldSchema.default ?? (type === "object" ? {} : []), null, 2)}
                      onChange={(e) => {
                        try { setValue([key], JSON.parse(e.target.value)); } catch { /* ignore parse errors while typing */ }
                      }}
                      rows={4}
                      className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm font-mono outline-none focus:border-ring"
                    />
                  ) : (
                    <input
                      type="text"
                      value={String(value ?? fieldSchema.default ?? "")}
                      onChange={(e) => setValue([key], e.target.value)}
                      className="h-9 w-full rounded-lg border bg-transparent px-3 text-sm outline-none focus:border-ring"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
