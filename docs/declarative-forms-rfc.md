# RFC: Declarative Form Descriptions via DashboardForm CRD

## Problem

Currently, adding or modifying a form for a Cozystack application requires writing React code — creating a custom form file, importing blocks, registering it. Operators deploying custom applications cannot customize forms without forking the dashboard.

## Prior art

**Rancher `questions.yaml`**: declarative form description alongside Helm charts. Fields defined with `variable`, `type`, `group`, `show_if`, `subquestions`. UI generated from YAML, no code needed.

**Cozystack current approach**: OpenAPI schema provides field types/defaults, CFO provides overrides, but form layout is hardcoded in React components.

## Goals

- Operators describe forms in a CRD — no frontend code
- Reuses existing form blocks (VersionPicker, ResourcesPicker, etc.)
- Supports conditional visibility (show field X when field Y = value)
- Supports sections/grouping with titles
- Falls back to generic rendering for undescribed fields
- Custom forms (VM Instance, Kubernetes) remain as override for complex cases
- Plugins can register new block types referenced from CRD

## Why a separate CRD (not in ApplicationDefinition)

| Concern | In ApplicationDefinition | Separate DashboardForm CRD |
|---|---|---|
| Lifecycle | Managed by Helm/platform upgrade | Managed by cluster operator independently |
| RBAC | Needs ApplicationDefinition write access | Separate RBAC — UI team can edit forms without touching infra |
| Ownership | Platform vendor | Cluster operator / UI customizer |
| Precedent | — | CFO and CFP are already separate CRDs for UI customization |
| Coupling | Mixes infra + frontend in one resource | Clean separation of concerns |

ApplicationDefinition is generated from Helm charts during platform install. Embedding UI layout there means chart authors must know about dashboard internals. A separate CRD lets operators customize forms without modifying charts.

## Proposed CRD

```yaml
apiVersion: dashboard.cozystack.io/v1alpha1
kind: DashboardForm
metadata:
  name: postgres-form
  labels:
    dashboard.cozystack.io/crd-plural: postgreses
spec:
  target:
    plural: postgreses                    # links to ApplicationDefinition
    apiGroup: apps.cozystack.io           # optional, default apps.cozystack.io
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

### Example: Kafka (nested config with basePath)

```yaml
apiVersion: dashboard.cozystack.io/v1alpha1
kind: DashboardForm
metadata:
  name: kafka-form
spec:
  target:
    plural: kafkas
  sections:
    - id: kafka
      title: Kafka
      fields:
        - key: replicas
          block: replicas-picker
          basePath: [kafka]
        - key: resourcesPreset
          block: resources-picker
          basePath: [kafka]
        - key: size
          block: storage-picker
          basePath: [kafka]

    - id: zookeeper
      title: ZooKeeper
      fields:
        - key: replicas
          block: replicas-picker
          basePath: [zookeeper]
        - key: resourcesPreset
          block: resources-picker
          basePath: [zookeeper]
        - key: size
          block: storage-picker
          basePath: [zookeeper]

    - id: access
      title: Access
      fields:
        - key: external
          block: external-toggle

    - id: topics
      title: Topics
      fields:
        - key: topics
          block: generic
```

### Example: Minimal form (inline annotation alternative)

For simple overrides, a DashboardForm can be very short:

```yaml
apiVersion: dashboard.cozystack.io/v1alpha1
kind: DashboardForm
metadata:
  name: qdrant-form
spec:
  target:
    plural: qdrants
  sections:
    - id: main
      title: Configuration
      fields:
        - key: resourcesPreset
          block: resources-picker
        - key: size
          block: storage-picker
        - key: replicas
          block: replicas-picker
        - key: external
          block: external-toggle
```

## Field definition

```yaml
fields:
  - key: string              # primary field key in spec (e.g. "replicas", "backup.enabled")
    block: string             # block type to render (see built-in blocks)
    title: string             # optional title override (default: from schema description)
    basePath: [string]        # for nested config (e.g. ["kafka"] → spec.kafka.*)
    fieldMap:                  # remap schema field names to block slots
      slotName: schemaField   # e.g. { size: diskSize, storageClass: sc }
    showFields:               # conditional visibility
      when: any               # value that triggers showing
      fields: [string]        # field keys to show/hide
    hidden: boolean           # hide this field entirely
    readOnly: boolean         # show but don't allow editing
```

### fieldMap: remapping field names

Blocks expect standard field names (`size`, `storageClass`, `replicas`, etc.). When a chart uses non-standard names, `fieldMap` remaps them:

```yaml
# Chart uses "diskSize" instead of "size", "sc" instead of "storageClass"
- key: diskSize
  block: storage-picker
  fieldMap:
    size: diskSize
    storageClass: sc
```

The block reads `schemaHas(schema, "diskSize")` instead of `schemaHas(schema, "size")`, and writes to `spec.diskSize` instead of `spec.size`.

Without `fieldMap`, blocks use their default field names — works for all standard Cozystack charts.

## Section definition

```yaml
sections:
  - id: string               # unique identifier
    title: string             # displayed as section header
    collapsible: boolean      # default false
    defaultOpen: boolean      # default true (when collapsible)
    showIf:                   # conditional section visibility
      field: string           # field key to check
      value: any              # value that makes section visible
    fields: [...]
```

## Built-in block types

| Block ID | Component | Auto-hides when |
|---|---|---|
| `version-picker` | VersionPicker | No `version` with enum in schema |
| `resources-picker` | ResourcesPicker | No `resourcesPreset` or `resources` |
| `storage-picker` | StoragePicker | No `size` or `storageClass` |
| `replicas-picker` | ReplicasPicker | No `replicas` |
| `external-toggle` | ExternalToggle | No `external` |
| `users-list` | UsersList | No `users` |
| `backup-config` | BackupConfig | No `backup` |
| `generic` | Generic field renderer | Never |
| `enum-picker` | Buttons for enum values | No enum in schema |
| `text-input` | Simple text input | Never |
| `number-input` | Number input | Never |
| `boolean-toggle` | Switch toggle | Never |
| `multiline` | Textarea | Never |
| `json-editor` | Code editor for JSON/YAML | Never |

Plugins register additional blocks:

```tsx
import { registerFormBlock } from "@cozystack/sdk";
registerFormBlock("gpu-selector", GPUSelectorBlock);
```

Referenced from CRD:

```yaml
- key: gpus
  block: gpu-selector
```

## Rendering pipeline

```
DashboardForm CRD (fetched by dashboard)
        ↓
  OpenAPI schema from ApplicationDefinition
        ↓
  DeclarativeForm component:
    For each section:
      Evaluate showIf condition against FormContext values
      For each field:
        Look up block component by block ID
        Extract schema slice using key + basePath
        Evaluate showFields conditions
        Render block with schema + basePath
        ↓
  WizardShell wraps everything (name, submit, error, edit mode)
```

## Priority / fallback chain

When rendering a form for a resource:

1. **Custom form** registered via `registerCustomForm(plural)` → highest priority, full React control
2. **DashboardForm CRD** for this plural → declarative, generated from YAML
3. **Generic form** from OpenAPI schema + CFO/CFP → automatic fallback

This means:
- Existing custom forms (VM Instance, Kubernetes) keep working unchanged
- Operators add DashboardForm CRDs for their applications — forms appear without code
- Unknown applications with no DashboardForm still get a basic form from schema

## Relationship with existing CRDs

```
ApplicationDefinition          → What the app is (schema, kind, plural)
DashboardForm                  → How the create/edit form looks (sections, blocks)
CustomFormsOverride (CFO)      → Field-level overrides (hidden, sort, types) for generic form
CustomFormsPrefill (CFP)       → Default values for form fields
CustomColumnsOverride          → Table column overrides (future: merge with DashboardView?)
```

DashboardForm replaces the need for CFO in most cases — it provides more control over form layout. CFO remains as a lightweight alternative for simple overrides on the generic form.

## Comparison with alternatives

| Feature | Rancher questions.yaml | Current OpenAPI + CFO | DashboardForm CRD |
|---|---|---|---|
| Form layout | Flat list + groups | Schema-driven (no layout) | Sections + fields |
| Field types | Custom type system | JSON Schema types | Block IDs (reusable components) |
| Conditional | `show_if` string expressions | CFO hidden field | `showFields` / `showIf` |
| Defaults | Duplicated in questions | In OpenAPI schema | From schema (no duplication) |
| Validation | `min`/`max`/`required` | JSON Schema | From schema (no duplication) |
| Extensibility | No | CFO/CFP CRDs | Plugin blocks + CRD |
| Nested config | Dot-notation | Native objects | `basePath` |
| Lifecycle | Part of chart | Part of platform | Independent CRD |
| RBAC | Chart publish access | ApplicationDefinition access | Separate DashboardForm access |

## Implementation steps

1. Define TypeScript types: `DashboardFormSpec`, `SectionSpec`, `FieldSpec`
2. Add `dashboardforms` to K8s endpoints and hooks (`useDashboardForm(plural)`)
3. Create `BlockRegistry` — maps block IDs to React components, register built-ins
4. Create `DeclarativeForm` component that renders from `DashboardFormSpec`
5. Create `ConditionalSection` / `ConditionalField` wrappers
6. Update form resolution in new/edit page: custom → DashboardForm → generic
7. Migrate Redis form to DashboardForm CRD as proof of concept
8. Document CRD format for operators

## Open questions

- Should DashboardForm be cluster-scoped (one per app type) or namespace-scoped (per-tenant customization)?
- How to handle form validation beyond OpenAPI schema (cross-field validation)?
- Should there be a `DashboardView` CRD for detail page layout (tabs, sections) using the same pattern?
- Plugin-provided blocks: how to discover available blocks? Expose in a UI?
