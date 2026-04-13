# RFC: Declarative Form Descriptions in ApplicationDefinition

## Problem

Currently, adding or modifying a form for a Cozystack application requires writing React code — creating a custom form file, importing blocks, registering it. Operators deploying custom applications cannot customize forms without forking the dashboard.

## Prior art

**Rancher `questions.yaml`**: declarative form description alongside Helm charts. Fields defined with `variable`, `type`, `group`, `show_if`, `subquestions`. UI generated from YAML, no code needed.

**Cozystack current approach**: OpenAPI schema provides field types/defaults, CFO provides overrides, but form layout is hardcoded in React components.

## Goals

- Operators describe forms in `ApplicationDefinition` CRD — no frontend code
- Reuses existing form blocks (VersionPicker, ResourcesPicker, etc.)
- Supports conditional visibility (show field X when field Y = value)
- Supports sections/grouping with titles
- Falls back to generic rendering for undescribed fields
- Custom forms (VM Instance, Kubernetes) remain as override for complex cases
- Plugins can register new block types referenced from CRD

## Proposed format

New field `spec.dashboard.form` in ApplicationDefinition:

```yaml
apiVersion: cozystack.io/v1alpha1
kind: ApplicationDefinition
metadata:
  name: postgres
spec:
  application:
    kind: Postgres
    plural: postgreses
    openAPISchema: "..."  # existing — provides types, enums, defaults
  dashboard:
    category: PaaS
    form:
      sections:
        - id: general
          title: General
          fields:
            - key: version
              block: version-picker

        - id: resources
          title: Resources
          fields:
            - key: resourcesPreset
              block: resources-picker
            - key: size
              block: storage-picker
              with: [storageClass]

        - id: scaling
          title: Scaling
          fields:
            - key: replicas
              block: replicas-picker

        - id: access
          title: Access
          fields:
            - key: external
              block: external-toggle
              showFields:
                when: true
                fields: [externalMethod, externalPorts]

        - id: users
          title: Users & Databases
          fields:
            - key: users
              block: users-list
            - key: databases
              block: generic

        - id: backup
          title: Backup
          fields:
            - key: backup
              block: backup-config
```

### Field definition

```yaml
fields:
  - key: string              # dot-path in spec (e.g. "backup.enabled", "kafka.replicas")
    block: string             # block type to render (see built-in blocks below)
    title: string             # optional title override (default: from schema description)
    with: [string]            # include related fields in same block (e.g. storageClass with size)
    basePath: [string]        # for nested config (e.g. ["kafka"] for kafka.replicas)
    showFields:               # conditional visibility
      when: any               # value that triggers showing
      fields: [string]        # field keys to show/hide
    hidden: boolean           # hide this field entirely
    readOnly: boolean         # show but don't allow editing
```

### Built-in block types

| Block ID | Component | Auto-hides when |
|---|---|---|
| `version-picker` | VersionPicker | No `version` with enum in schema |
| `resources-picker` | ResourcesPicker | No `resourcesPreset` or `resources` |
| `storage-picker` | StoragePicker | No `size` or `storageClass` |
| `replicas-picker` | ReplicasPicker | No `replicas` |
| `external-toggle` | ExternalToggle | No `external` |
| `users-list` | UsersList | No `users` |
| `backup-config` | BackupConfig | No `backup` |
| `generic` | Generic field renderer | Never (renders any schema field) |
| `enum-picker` | Buttons for enum values | No enum in schema |
| `text-input` | Simple text input | Never |
| `number-input` | Number input | Never |
| `boolean-toggle` | Switch toggle | Never |
| `multiline` | Textarea | Never |
| `json-editor` | Code editor for JSON/YAML | Never |

Plugins can register additional block types:

```tsx
// In plugin code
import { registerFormBlock } from "@cozystack/sdk";

registerFormBlock("gpu-selector", GPUSelectorBlock);
```

Then referenced from CRD:

```yaml
fields:
  - key: gpus
    block: gpu-selector  # custom block from plugin
```

### Section definition

```yaml
sections:
  - id: string          # unique identifier
    title: string        # displayed as section header
    collapsible: boolean # default false
    defaultOpen: boolean # default true (when collapsible)
    showIf:              # conditional section visibility
      field: string      # field key to check
      value: any         # value that makes section visible
    fields: [...]
```

### Conditional visibility

Inspired by Rancher's `show_if` / `show_subquestion_if`:

```yaml
# Show fields when a toggle is enabled
- key: external
  block: external-toggle
  showFields:
    when: true
    fields: [externalMethod, externalPorts]

# Show entire section conditionally
sections:
  - id: backup-config
    title: Backup Configuration
    showIf:
      field: backup.enabled
      value: true
    fields:
      - key: backup.schedule
        block: text-input
      - key: backup.destinationPath
        block: text-input
```

### Nested config (basePath)

For resources like Kafka where config is nested:

```yaml
sections:
  - id: kafka
    title: Kafka
    fields:
      - key: replicas
        block: replicas-picker
        basePath: [kafka]            # → spec.kafka.replicas
      - key: resourcesPreset
        block: resources-picker
        basePath: [kafka]            # → spec.kafka.resourcesPreset
      - key: size
        block: storage-picker
        basePath: [kafka]
        with: [storageClass]

  - id: zookeeper
    title: ZooKeeper
    fields:
      - key: replicas
        block: replicas-picker
        basePath: [zookeeper]        # → spec.zookeeper.replicas
      - key: resourcesPreset
        block: resources-picker
        basePath: [zookeeper]
```

## Rendering pipeline

```
ApplicationDefinition.spec.dashboard.form
        ↓
  FormRenderer reads sections + fields
        ↓
  For each field:
    1. Look up block component by block ID (built-in or plugin)
    2. Extract schema slice using key + basePath
    3. Pass schema + basePath to block component
    4. Block reads/writes FormContext as before
        ↓
  Conditional visibility evaluated on FormContext values
        ↓
  WizardShell wraps everything (name input, submit, error, edit mode)
```

```tsx
// Pseudocode
function DeclarativeForm({ formSpec, schema, ...wizardProps }) {
  return (
    <WizardShell schema={schema} {...wizardProps}>
      {formSpec.sections.map(section => (
        <ConditionalSection key={section.id} section={section}>
          <Separator />
          <h3>{section.title}</h3>
          {section.fields.map(field => (
            <ConditionalField key={field.key} field={field}>
              <BlockRenderer
                blockId={field.block}
                schema={schemaAt(schema, field.basePath ?? [])}
                basePath={field.basePath}
                title={field.title}
              />
            </ConditionalField>
          ))}
        </ConditionalSection>
      ))}
    </WizardShell>
  );
}
```

## Priority / fallback chain

When rendering a form for a resource:

1. **Custom form** registered via `registerCustomForm(plural)` → highest priority, full control
2. **Declarative form** from `ApplicationDefinition.spec.dashboard.form` → generated from CRD
3. **Generic form** from OpenAPI schema + CFO/CFP → fallback for resources without form definition

This means:
- Existing custom forms (VM Instance, Kubernetes) keep working
- Operators can add declarative forms without code
- Unknown applications still get a basic form from schema

## Comparison with current approaches

| Feature | Rancher questions.yaml | Cozystack OpenAPI | Proposed declarative form |
|---|---|---|---|
| Form layout | Flat list + groups | Schema-driven (no layout) | Sections + fields |
| Field types | Custom type system | JSON Schema types | Block IDs (reusable components) |
| Conditional | `show_if` string expressions | CFO hidden field | `showFields` / `showIf` |
| Defaults | In questions.yaml | In OpenAPI schema | From schema (no duplication) |
| Validation | `min`/`max`/`required` | JSON Schema | From schema (no duplication) |
| Extensibility | No | CFO/CFP CRDs | Plugin blocks + CRD |
| Nested config | Dot-notation | Native objects | `basePath` |

Key difference: we don't duplicate schema information (types, defaults, validation) in the form definition. The form only describes **layout and block selection**. Types and validation come from OpenAPI schema.

## Implementation steps

1. Define TypeScript types for `FormSpec`, `SectionSpec`, `FieldSpec`
2. Create `BlockRegistry` — maps block IDs to React components
3. Register all existing blocks (version-picker, resources-picker, etc.)
4. Create `DeclarativeForm` component that renders from `FormSpec`
5. Create `ConditionalSection` / `ConditionalField` wrappers
6. Update form resolution: custom form → declarative form → generic form
7. Add `form` field to `ApplicationDefinition` TypeScript type
8. Migrate one existing form (e.g. Redis) to declarative as proof of concept

## Open questions

- Should `form` be part of `ApplicationDefinition` or a separate CRD (`DashboardFormOverride`)?
- How to handle form validation beyond what OpenAPI schema provides?
- Should sections support drag-and-drop reordering in a future form builder UI?
- How to preview declarative form changes without applying CRD?
