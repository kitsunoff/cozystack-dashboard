# DashboardForm Guide

## Overview

DashboardForm is a Kubernetes CRD that describes how create/edit forms look in the Cozystack Dashboard. Instead of writing React code, operators define forms in YAML — the dashboard renders them automatically.

## Quick start

1. Create a YAML file:

```yaml
apiVersion: dashboard.cozystack.io/v1alpha1
kind: DashboardForm
metadata:
  name: redis-form
spec:
  target:
    plural: redises
  sections:
    - id: version
      title: Version
      blocks:
        - block: enum-picker
          props:
            field: version
            display: buttons
    - id: resources
      title: Resources
      blocks:
        - resources-picker
        - storage-picker
    - id: scaling
      title: Scaling
      blocks:
        - replicas-picker
    - id: access
      title: Access
      blocks:
        - block: boolean-toggle
          props:
            field: external
            description: "Enable external access"
```

2. Apply to cluster:

```bash
kubectl apply -f dashboardform-redis.yaml
```

3. Open the dashboard — the form appears on the create/edit page for Redis.

## Form resolution priority

When rendering a form, the dashboard checks in order:

1. **Custom form** (React code via `registerCustomForm`) — highest priority
2. **DashboardForm CRD** — declarative, from YAML
3. **Generic form** — auto-generated from OpenAPI schema

If a DashboardForm exists for a resource, it replaces the generic form. Custom forms (VM Instance, Kubernetes) override everything.

## Structure

```yaml
spec:
  target:
    plural: string            # resource plural (e.g. "redises", "postgreses")
    apiGroup: string          # optional, default "apps.cozystack.io"
  hideAdvanced: boolean       # hide auto-generated Advanced section (default: false)
  sections:
    - id: string              # unique section ID
      title: string           # displayed header
      collapsible: boolean    # make section collapsible (default: false)
      defaultOpen: boolean    # initial state when collapsible (default: true)
      showIf:                 # conditional visibility
        path: string          # dot-path to check (e.g. "backup.enabled")
        value: any            # value that makes section visible
      blocks: [...]           # list of blocks
```

## Blocks

Each block is either a **short string** (block ID) or a **full object**:

```yaml
blocks:
  # Short form — block finds its fields automatically
  - replicas-picker

  # Full form — with explicit path
  - block: resources-picker
    path: kafka.resourcesPreset

  # Full form — with props
  - block: enum-picker
    props:
      field: version
      display: buttons

  # Full form — with conditional visibility
  - block: text-input
    path: backup
    props:
      field: schedule
      placeholder: "0 2 * * *"
    showIf:
      path: backup.enabled
      value: true
```

### Block object fields

| Field | Type | Description |
|---|---|---|
| `block` | string | Block type ID (see built-in blocks below) |
| `path` | string | Dot-path in spec (e.g. `"backup"`, `"kafka.replicas"`) |
| `title` | string | Override block title |
| `fieldMap` | object | Remap field names: `{ size: diskSize }` |
| `showIf` | object | Conditional visibility: `{ path: "...", value: ... }` |
| `hidden` | boolean | Hide this block |
| `readOnly` | boolean | Show but disable editing |
| `props` | object | Arbitrary block-specific configuration |

### Path resolution

`path` determines where in `spec` the block reads/writes:

| path | Block operates on |
|---|---|
| (none) | `spec.*` (root level) |
| `backup` | `spec.backup.*` |
| `kafka.replicas` | `spec.kafka.replicas` |
| `backup.enabled` | `spec.backup.enabled` |

## Built-in blocks

### resources-picker

Preset cards (nano/micro/small/medium/large) + optional custom CPU/memory.

```yaml
- resources-picker           # short form, finds resourcesPreset at root
- block: resources-picker
  path: kafka.resourcesPreset  # nested path
```

Schema fields: `resourcesPreset` (enum), `resources.cpu`, `resources.memory`

### storage-picker

Storage size input + StorageClass dropdown (fetches real StorageClasses from cluster).

```yaml
- storage-picker
```

Schema fields: `size`, `storageClass`

### replicas-picker

Common replica counts as buttons (1, 2, 3, 5).

```yaml
- replicas-picker
```

Schema fields: `replicas` (integer)

### enum-picker

Universal enum selector with multiple display modes.

```yaml
# Buttons (default for ≤7 values)
- block: enum-picker
  props:
    field: version
    display: buttons

# Cards + dropdown (for long enums like OS profiles)
- block: enum-picker
  props:
    field: instanceProfile
    display: cards+dropdown
    popular: [ubuntu, fedora, alpine]
    groupBy: prefix

# Dropdown only
- block: enum-picker
  props:
    field: instanceProfile
    display: dropdown
```

Props:

| Prop | Type | Description |
|---|---|---|
| `field` | string | Schema field key to read enum from |
| `display` | string | `"buttons"` / `"cards"` / `"dropdown"` / `"cards+dropdown"` |
| `popular` | string[] | Subset shown as cards (for cards+dropdown) |
| `labels` | object | Override display labels: `{ "v17": "PostgreSQL 17" }` |
| `groupBy` | string | `"prefix"` — group dropdown items by name prefix |

### boolean-toggle

Switch with label and description.

```yaml
- block: boolean-toggle
  props:
    field: external
    description: "Enable external access from outside the cluster"

# Nested path
- block: boolean-toggle
  path: backup
  props:
    field: enabled
    description: "Enable automated backups"
```

Props:

| Prop | Type | Description |
|---|---|---|
| `field` | string | Schema field key (default: `"enabled"`) |
| `description` | string | Override description (default: from schema) |

### text-input

Single-line input with label from schema description.

```yaml
- block: text-input
  path: backup
  props:
    field: schedule
    placeholder: "0 2 * * *"
    type: password            # optional: "text" (default) or "password"
```

Props:

| Prop | Type | Description |
|---|---|---|
| `field` | string | Schema field key |
| `placeholder` | string | Input placeholder |
| `type` | string | `"text"` (default) or `"password"` |

### multiline-input

Multi-line textarea.

```yaml
- block: multiline-input
  props:
    field: cloudInit
    placeholder: "#cloud-config\npackages:\n  - nginx"
    rows: 6
    mono: true                # monospace font (default: true)
```

Props:

| Prop | Type | Description |
|---|---|---|
| `field` | string | Schema field key |
| `placeholder` | string | Textarea placeholder |
| `rows` | number | Textarea rows (default: 4) |
| `mono` | boolean | Monospace font (default: true) |

### string-list-input

Textarea where each line becomes an array item.

```yaml
- block: string-list-input
  props:
    field: sshKeys
    placeholder: "ssh-ed25519 AAAA... user@host"
    rows: 3
```

Props:

| Prop | Type | Description |
|---|---|---|
| `field` | string | Schema field key (must be array of strings) |
| `placeholder` | string | Textarea placeholder |
| `rows` | number | Textarea rows (default: 3) |

### users-list

Dynamic key-value list for users with passwords.

```yaml
- users-list
```

Schema fields: `users` (object with additionalProperties)

### access-matrix

Manages users + databases + role assignments together. Auto-discovers fields from schema.

```yaml
# Auto-discover (finds "users" and "databases" in schema)
- access-matrix

# Explicit fields
- block: access-matrix
  props:
    usersField: users
    databasesField: databases
    roles: [admin, readonly]
```

Features:
- Auto-creates first database when adding first user
- Auto-removes user from roles when deleted
- RFC 1123 validation on names (lowercase, alphanumeric)
- Role assignment via dropdown

Props:

| Prop | Type | Description |
|---|---|---|
| `usersField` | string | Schema field for users map (default: auto-detect `"users"`) |
| `databasesField` | string | Schema field for databases map (default: auto-detect `"databases"`) |
| `roles` | string[] | Available roles (default: auto-detect from schema) |

### backup-config (legacy)

Toggle + S3 backup fields. Replaced by `boolean-toggle` + `text-input` with `showIf`, but still available for backward compatibility.

### external-toggle (legacy)

External access toggle. Replaced by `boolean-toggle` with `props.field: external`, but still available.

### version-picker (legacy)

Version selector. Replaced by `enum-picker` with `props.field: version`, but still available.

## Conditional visibility

Show blocks or sections based on form values:

```yaml
# Show block when backup is enabled
- block: text-input
  path: backup
  props:
    field: schedule
  showIf:
    path: backup.enabled
    value: true

# Show entire section conditionally
sections:
  - id: sharding-config
    title: Sharding Configuration
    showIf:
      path: sharding
      value: true
    blocks:
      - ...
```

`showIf.path` is always a full dot-path in spec. `showIf.value` is compared with strict equality.

## Advanced section

Fields not covered by any block in the DashboardForm automatically appear in a collapsible "Advanced" section at the bottom. This ensures no data is lost.

To suppress: `spec.hideAdvanced: true`.

How fields are claimed:
- Short form block (e.g. `- replicas-picker`) claims known fields (`replicas`)
- Block with `path` claims the root key (e.g. `path: backup.schedule` claims `backup`)
- Block with `props.field` claims that field (e.g. `props.field: external` claims `external`)

## Examples

### Simple service (Redis)

```yaml
spec:
  target:
    plural: redises
  sections:
    - id: version
      title: Version
      blocks:
        - block: enum-picker
          props: { field: version, display: buttons }
    - id: resources
      title: Resources
      blocks:
        - resources-picker
        - storage-picker
    - id: scaling
      title: Scaling
      blocks:
        - replicas-picker
    - id: access
      title: Access
      blocks:
        - block: boolean-toggle
          props: { field: external, description: "Enable external access" }
```

### Database with users (PostgreSQL)

```yaml
spec:
  target:
    plural: postgreses
  sections:
    - id: version
      title: Version
      blocks:
        - block: enum-picker
          props: { field: version, display: buttons }
    - id: resources
      title: Resources
      blocks:
        - resources-picker
        - storage-picker
    - id: scaling
      title: Scaling
      blocks:
        - replicas-picker
    - id: users
      title: Users
      blocks:
        - access-matrix
    - id: access
      title: Access
      blocks:
        - block: boolean-toggle
          props: { field: external, description: "Enable external access" }
    - id: backup
      title: Backup
      blocks:
        - block: boolean-toggle
          path: backup
          props: { field: enabled, description: "Enable automated backups" }
        - block: text-input
          path: backup
          props: { field: schedule, placeholder: "0 2 * * *" }
          showIf: { path: backup.enabled, value: true }
        - block: text-input
          path: backup
          props: { field: s3SecretKey, type: password }
          showIf: { path: backup.enabled, value: true }
```

### Nested config (Kafka)

```yaml
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
        - block: boolean-toggle
          props: { field: external, description: "Enable external access" }
```

## Editing forms

To modify a form:

```bash
kubectl edit dashboardform redis-form
```

Or update the YAML file and re-apply:

```bash
kubectl apply -f dashboardform-redis.yaml
```

Changes take effect on next page load (dashboard fetches DashboardForms on each render).

## Deleting forms

```bash
kubectl delete dashboardform redis-form
```

The dashboard falls back to the generic OpenAPI-based form.

## Creating a custom block (plugin)

If built-in blocks don't cover your needs, create a plugin block:

```tsx
import { registerFormBlock } from "@cozystack/sdk";

function MyCustomBlock({ schema, basePath, props }) {
  // Your custom form UI
}

registerFormBlock("my-custom-block", MyCustomBlock);
```

Then reference it in DashboardForm:

```yaml
- block: my-custom-block
  props:
    myOption: value
```

See [Plugin System RFC](./plugin-system-rfc.md) for plugin development details.
