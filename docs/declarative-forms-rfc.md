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
      blocks:
        - version-picker                  # short form: block ID, looks for fields at spec root

    - id: resources
      title: Resources
      blocks:
        - resources-picker                # → spec.resourcesPreset, spec.resources
        - storage-picker                  # → spec.size, spec.storageClass

    - id: scaling
      title: Scaling
      blocks:
        - replicas-picker                 # → spec.replicas

    - id: access
      title: Access
      blocks:
        - external-toggle                 # → spec.external
        - block: generic
          path: externalMethod
          showIf:
            path: external
            value: true
        - block: generic
          path: externalPorts
          showIf:
            path: external
            value: true

    - id: users
      title: Users & Databases
      blocks:
        - users-list                      # → spec.users
        - block: generic
          path: databases

    - id: backup
      title: Backup
      blocks:
        - backup-config                   # → spec.backup.*
```

### Block syntax

Each item in `blocks` is either a **string** (short form) or an **object** (full form):

```yaml
blocks:
  # Short form — just block ID, finds its fields at spec root
  - replicas-picker

  # Full form — block ID + explicit path + options
  - block: replicas-picker
    path: kafka.replicas              # explicit dot-path in spec

  # Full form — with conditional visibility
  - block: generic
    path: externalPorts
    showIf:
      path: external                  # full dot-path to check
      value: true

  # Full form — with field name remapping
  - block: storage-picker
    path: storage                     # spec.storage.*
    fieldMap:
      size: diskSize                  # block slot "size" → schema field "diskSize"
      storageClass: sc                # block slot "storageClass" → schema field "sc"
```

All paths are **explicit, full dot-paths** in spec. No inheritance, no implicit basePath.

### Example: Kafka (nested config)

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
      blocks:
        - block: resources-picker
          path: kafka.resourcesPreset
        - block: storage-picker
          path: kafka.size
        - block: replicas-picker
          path: kafka.replicas

    - id: zookeeper
      title: ZooKeeper
      blocks:
        - block: resources-picker
          path: zookeeper.resourcesPreset
        - block: storage-picker
          path: zookeeper.size
        - block: replicas-picker
          path: zookeeper.replicas

    - id: access
      title: Access
      blocks:
        - external-toggle

    - id: topics
      title: Topics
      blocks:
        - block: generic
          path: topics
```

Every path is explicit: `kafka.replicas` = `spec.kafka.replicas`. No magic.

### Example: Minimal form

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
      blocks:
        - resources-picker
        - storage-picker
        - replicas-picker
        - external-toggle
```

Short form for standard Cozystack charts — blocks find their fields at spec root automatically.

## Block definition (full form)

```yaml
- block: string             # block type to render (see built-in blocks)
  path: string              # explicit dot-path in spec (e.g. "kafka.replicas")
  title: string             # optional title override
  fieldMap:                 # remap schema field names to block slots
    slotName: schemaField   # e.g. { size: diskSize, storageClass: sc }
  showIf:                   # conditional visibility
    path: string            # full dot-path to check
    value: any              # value that makes this block visible
  hidden: boolean           # hide this block entirely
  readOnly: boolean         # show but don't allow editing
```

### path resolution

`path` tells the block where in the spec to read/write:

| path | Schema location | Spec location |
|---|---|---|
| (none) | `schema.properties.*` | `spec.*` |
| `kafka.replicas` | `schema.properties.kafka.properties.replicas` | `spec.kafka.replicas` |
| `backup.enabled` | `schema.properties.backup.properties.enabled` | `spec.backup.enabled` |

### fieldMap: remapping field names

When a chart uses non-standard field names:

```yaml
- block: storage-picker
  path: storage
  fieldMap:
    size: diskSize           # block looks for "diskSize" instead of "size"
    storageClass: sc         # block looks for "sc" instead of "storageClass"
```

Without `fieldMap`, blocks use default field names — zero config for standard charts.

## Section definition

```yaml
sections:
  - id: string               # unique identifier
    title: string             # displayed as section header
    collapsible: boolean      # default false
    defaultOpen: boolean      # default true (when collapsible)
    showIf:                   # conditional section visibility
      path: string            # full dot-path to check
      value: any              # value that makes section visible
    blocks: [...]
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
- block: gpu-selector
  path: gpus
```

## Rendering pipeline

```
DashboardForm CRD (fetched by dashboard)
        ↓
  OpenAPI schema from ApplicationDefinition
        ↓
  DeclarativeForm component:
    For each section:
      Evaluate section showIf (check value at path in FormContext)
      For each block entry:
        If string → resolve block component, no path (root)
        If object → resolve block component, parse dot-path
        Evaluate block showIf
        Split path into basePath + fieldKey for schema lookup
        Render block with schema slice + basePath
        ↓
  WizardShell wraps everything (name, submit, error, edit mode)
```

## Error handling

### Unknown block ID

Block ID not found in BlockRegistry (built-in or plugin).

- **Always** render a visible warning box in the form:
  ```
  ⚠ Unknown block "gpu-selector" — is the plugin installed?
  ```
- This is a CRD configuration error — should never be silent.

### Path not found in schema

`path: kafka.replicas` but OpenAPI schema has no `kafka` property.

- **Dev mode** (`NODE_ENV=development`): yellow warning box in the form:
  ```
  ⚠ Block "replicas-picker" at path "kafka.replicas": not found in schema
  ```
- **Prod mode**: `console.warn()`, block not rendered (same as current behavior — `schemaHas` returns false).

### Uncovered fields (Advanced section)

DashboardForm describes some fields but not all. Remaining schema fields must not disappear.

The renderer collects all `path` values from DashboardForm blocks and computes uncovered fields:

```
Schema fields:  [version, replicas, resourcesPreset, size, storageClass, external, users, backup, postgresql, quorum]
Covered by blocks: [version, replicas, resourcesPreset, size, storageClass, external]
Uncovered:      [users, backup, postgresql, quorum]
```

Uncovered fields are rendered in an automatic **"Advanced"** collapsible section at the bottom, using generic field renderer:

```
┌─ General ──────────────────────────┐
│  version-picker                    │
└────────────────────────────────────┘
┌─ Resources ────────────────────────┐
│  resources-picker                  │
│  storage-picker                    │
└────────────────────────────────────┘
┌─ Advanced (auto-generated) ──▾ ───┐
│  users          { ... }            │
│  backup         { ... }            │
│  postgresql     { ... }            │
│  quorum         { ... }            │
└────────────────────────────────────┘
```

This ensures:
- No data loss — all schema fields are accessible
- Operators can incrementally describe forms — start with key fields, rest falls back to generic
- `hideAdvanced: true` in DashboardForm spec suppresses the section if desired

### Summary table

| Error | Dev mode | Prod mode |
|---|---|---|
| Unknown block ID | Warning box in form | Warning box in form |
| Path not in schema | Warning box in form | console.warn, block hidden |
| Uncovered fields | "Advanced" section | "Advanced" section |
| showIf path not in schema | Warning box in form | console.warn, block always visible |
| Empty DashboardForm (no sections) | Entire form is "Advanced" | Entire form is "Advanced" |

## Priority / fallback chain

When rendering a form for a resource:

1. **Custom form** registered via `registerCustomForm(plural)` → highest priority, full React control
2. **DashboardForm CRD** for this plural → declarative, generated from YAML + "Advanced" section for uncovered fields
3. **Generic form** from OpenAPI schema + CFO/CFP → automatic fallback

This means:
- Existing custom forms (VM Instance, Kubernetes) keep working unchanged
- Operators add DashboardForm CRDs for their applications — forms appear without code
- Unknown applications with no DashboardForm still get a basic form from schema
- Partially described DashboardForms still show all fields via "Advanced" section

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
| Conditional | `show_if` string expressions | CFO hidden field | `showIf` with explicit paths |
| Defaults | Duplicated in questions | In OpenAPI schema | From schema (no duplication) |
| Validation | `min`/`max`/`required` | JSON Schema | From schema (no duplication) |
| Extensibility | No | CFO/CFP CRDs | Plugin blocks + CRD |
| Nested config | Dot-notation | Native objects | Explicit dot-paths |
| Lifecycle | Part of chart | Part of platform | Independent CRD |
| RBAC | Chart publish access | ApplicationDefinition access | Separate DashboardForm access |

## Implementation steps

1. Define TypeScript types: `DashboardFormSpec`, `SectionSpec`, `BlockEntry`
2. Add `dashboardforms` to K8s endpoints and hooks (`useDashboardForm(plural)`)
3. Create `BlockRegistry` — maps block IDs to React components, register all built-ins
4. Create `DeclarativeForm` component that renders from `DashboardFormSpec`
5. Implement `showIf` evaluation against FormContext values
6. Implement "Advanced" section — compute uncovered fields, render with generic blocks
7. Implement error display (unknown block, missing path) with dev/prod modes
8. Update form resolution in new/edit page: custom → DashboardForm → generic
9. Migrate Redis form to DashboardForm CRD as proof of concept
10. Document CRD format for operators

## Open questions

- Should DashboardForm be cluster-scoped (one per app type) or namespace-scoped (per-tenant customization)?
- How to handle form validation beyond OpenAPI schema (cross-field validation)?
- Should there be a `DashboardView` CRD for detail page layout (tabs, sections) using the same pattern?
- Plugin-provided blocks: how to discover available blocks? Expose in a UI?
- Should "Advanced" section be opt-out (`hideAdvanced: true`) or opt-in?
