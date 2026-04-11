@AGENTS.md

# Cozystack Dashboard

Alternative frontend for [Cozystack](https://github.com/cozystack/cozystack) platform.
Reads Kubernetes CRDs from `dashboard.cozystack.io/v1alpha1` and `apps.cozystack.io/v1alpha1` APIs.

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **React 19** + TypeScript
- **Tailwind CSS 4** + **shadcn/ui** (Base UI primitives, not Radix)
- **TanStack React Query** for server state
- **next-themes** for dark/light mode
- **Inter** font (sans), **JetBrains Mono** (mono)

## Next.js 16 Breaking Changes

- `params` and `searchParams` in pages/layouts/routes are **Promise** — must `await` or `use()`
- `cookies()`, `headers()` are async
- Turbopack is default bundler
- No `tailwind.config.ts` — Tailwind v4 configured via `globals.css` `@theme` block

## Running

```bash
# Dev (requires kubeconfig)
KUBECONFIG=/path/to/kubeconfig nix-shell -p nodejs --run "npm run dev"

# Or set in .env.local:
# KUBECONFIG=/path/to/kubeconfig
```

Node.js is not installed globally — all node/npm/npx commands must be wrapped in `nix-shell -p nodejs --run "..."`.

## Architecture

### K8s API Proxy

`src/app/api/k8s/[...path]/route.ts` — Next.js API route proxies all requests to kube-apiserver.

- **Dev**: reads kubeconfig from `KUBECONFIG` env var (supports client certificate auth, token auth, CA)
- **Prod**: uses in-cluster ServiceAccount token or forwarded auth headers
- Uses Node.js `https.request` (not fetch) for client certificate support
- Server-side config: `src/lib/k8s/server.ts`

### Client Layer

- `src/lib/k8s/client.ts` — browser-side fetch wrapper (`k8sList`, `k8sGet`, `k8sCreate`, `k8sDelete`)
- `src/lib/k8s/types.ts` — TypeScript types for all CRDs (MarketplacePanel, Factory, CFO, CFP, etc.)
- `src/lib/k8s/endpoints.ts` — URL builders for K8s API paths
- `src/lib/k8s/hooks.ts` — React Query hooks (`useMarketplacePanels`, `useInstances`, etc.)

### Form System

Two-tier form system: custom forms take priority, generic OpenAPI form is fallback.

**Custom forms** (`src/components/form/custom/`):

- `registry.ts` — `registerCustomForm(plural, Component)` / `getCustomForm(plural)`
- `index.ts` — registers all custom forms (side-effect import)
- `vm-instance-form.tsx` — VM Instance with OS picker, instance types, disks, networking, SSH, cloud-init
- `vm-disk-form.tsx` — VM Disk with source type picker, preset images, storage size
- `kubernetes-form.tsx` — Kubernetes cluster with control plane, node groups, addons

### Form Blocks (reusable UI building blocks)

`src/components/form/blocks/` — semantic form components that read OpenAPI schema and self-hide when their fields are absent.

Available blocks:

| Block | Schema fields it claims | What it renders |
| --- | --- | --- |
| `VersionPicker` | `version` (with enum) | Selectable version buttons |
| `ResourcesPicker` | `resourcesPreset`, `resources.cpu/memory` | Preset cards + custom CPU/memory toggle |
| `StoragePicker` | `size`, `storageClass` | Size and storage class inputs |
| `ReplicasPicker` | `replicas` | Common replica count buttons (1, 2, 3, 5) |
| `ExternalToggle` | `external` | Boolean toggle for external access |
| `UsersList` | `users` (additionalProperties) | Dynamic user/password list with add/remove |
| `BackupConfig` | `backup.enabled`, `backup.schedule`, etc. | Toggle + S3 config fields |

- `WizardShell` — shared form wrapper: provides `FormProvider`, name input, submit/cancel, error display
- `schemaAt(schema, ["kafka"])` — navigate into nested schema for `basePath` usage
- All blocks call `initFormValue()` on mount to write schema defaults into FormContext

### How to create a new form block

1. Create `src/components/form/blocks/my-block.tsx`
2. Accept `FormBlockProps` (`schema`, `basePath?`, `title?`)
3. Use `schemaHas(schema, "myfield")` to decide visibility — return `null` if field absent
4. Use `useFormContext()` for `getValue`/`setValue` with `[...basePath, "myfield"]` paths
5. Call `initFormValue(getValue, setValue, path, default)` in `useEffect` on mount
6. Export from `src/components/form/blocks/index.ts`
7. Add tests in `my-block.test.tsx` — test visibility (renders/hides) and interaction

### How to create a form for a new application

1. Get the OpenAPI schema: `curl /api/k8s/apis/cozystack.io/v1alpha1/applicationdefinitions/<name>`
2. Check which blocks match the schema fields
3. Create `src/components/form/custom/<name>-form.tsx`:

```tsx
export function MyForm({ plural, namespace, apiGroup, apiVersion, kind, backHref, openAPISchema }: CustomFormProps) {
  const schema = openAPISchema ?? {};
  return (
    <WizardShell schema={schema} plural={plural} namespace={namespace}
      apiGroup={apiGroup} apiVersion={apiVersion} kind={kind}
      backHref={backHref} submitLabel="MyApp">
      <Separator /><VersionPicker schema={schema} />
      <Separator /><ResourcesPicker schema={schema} />
      <Separator /><StoragePicker schema={schema} />
      <Separator /><ReplicasPicker schema={schema} />
      <Separator /><ExternalToggle schema={schema} />
    </WizardShell>
  );
}
```

4. For nested config (like Kafka's `kafka.*` and `zookeeper.*`), use `schemaAt` + `basePath`:

```tsx
const kafkaSchema = schemaAt(schema, ["kafka"]);
<ResourcesPicker schema={kafkaSchema} basePath={["kafka"]} title="Kafka Resources" />
```

5. Register in `src/components/form/custom/index.ts`:

```tsx
import { MyForm } from "./my-form";
registerCustomForm("myplurals", MyForm);
```

6. Blocks self-hide when their schema fields are absent — safe to include extra blocks

**Generic form** (`src/components/form/`):

- `schema-form.tsx` — top-level: fetches OpenAPI schema, applies CFO/CFP, renders fields
- `field-renderer.tsx` — dispatches to field type components
- `form-context.tsx` — form state (getValue/setValue)
- `fields/` — string, number, boolean, enum, multiline, list-input, object, array, int-or-string

**Schema processing** (`src/lib/schema/`):

- `walker.ts` — recursive JSON Schema → SchemaNode tree
- `cfo-merger.ts` — applies CustomFormsOverride (hidden, sort, multilineString, listInput)
- `cfp-prefill.ts` — applies CustomFormsPrefill default values
- `types.ts` — SchemaNode, CFOSpec, CFPSpec

### Pluggable Component Registry

`src/components/registry/` — central registry for pluggable UI components per resource type.

| Registry | Function | What it controls |
| --- | --- | --- |
| Detail Tabs | `registerDetailTabs(plural, tabs)` | Tabs on instance detail page |
| Detail Actions | `registerDetailActions(plural, actions)` | Action buttons on instance detail header |
| List Actions | `registerListActions(plural, actions)` | Quick actions sidebar on instances list |
| List Sections | `registerListSections(plural, sections)` | Custom sections between table and events |

- `resolveDetailTabs(plural)` — returns registered tabs or defaults (Overview + YAML)
- `registrations.ts` — side-effect import that activates all registrations
- Defaults: all resources get Overview + YAML tabs, "Create" quick action

To add custom tabs/actions for a resource, add registrations in `registrations.ts`:

```typescript
registerDetailTabs("vminstances", [
  { key: "overview", label: "Overview", component: asTab(VMOverviewTab) },
  { key: "console", label: "Console", component: asTab(VMConsoleTab) },
  { key: "yaml", label: "YAML", component: asTab(YamlTab) },
]);

registerDetailActions("vminstances", [
  { key: "start", label: "Start", icon: Play, action: ({ instance }) => ... },
]);
```

### Detail Pages

`src/components/detail/` — instance detail view with tabs.

- `detail-view.tsx` — header with status + tab navigation + action buttons
- `tabs/overview-tab.tsx` — generic config display with conditions
- `tabs/yaml-tab.tsx` — YAML representation with copy button
- `tabs/k8s-*.tsx` — Kubernetes-specific: control plane, node groups, addons, overview

### Routing

Two route groups with different layouts:

- `(tenant-select)` — no sidebar, used by `/tenants`
- `(dashboard)` — sidebar + main area, used by `/platform-apps`, `/apps/*`

```text
/                              → redirect to /tenants
/tenants                       → tenant (namespace) selection, no sidebar
/platform-apps                   → Platform Apps catalog with tag filters and search
/apps/[plural]                 → instance list with metrics, table, events
/apps/[plural]/new             → create form (custom or generic)
/apps/[plural]/[name]          → instance detail with tabs
/api/k8s/[...path]             → proxy to kube-apiserver
```

Namespace is carried as `?namespace=xxx` URL search param. Only `tenant-*` namespaces are shown.

### Layout

- Sidebar (`src/components/layout/sidebar.tsx`) — 240px, Cozystack logo, collapsible groups by ApplicationDefinition category (IaaS/PaaS/NaaS/Administration — dynamic from API)
- Header (`src/components/layout/header.tsx`) — title, subtitle, optional search, namespace selector, theme toggle
- No shared `<Header>` in root layout — each page renders its own Header with appropriate props

### Kubernetes CRDs Read

| CRD | Group | Usage |
| --- | --- | --- |
| MarketplacePanel | dashboard.cozystack.io | Platform Apps catalog, sidebar nav |
| Factory | dashboard.cozystack.io | Detail page structure (not yet fully used) |
| CustomFormsOverride | dashboard.cozystack.io | Form field overrides (hidden, sort, types) |
| CustomFormsPrefill | dashboard.cozystack.io | Form default values |
| CFOMapping | dashboard.cozystack.io | customizationId lookup |
| ApplicationDefinition | cozystack.io | OpenAPI schema for generic forms |
| App instances | apps.cozystack.io | CRUD on actual resources |

## Conventions

- **Always use static imports** — never use dynamic `import()` for project modules. All imports must be at the top of the file. Dynamic imports add unnecessary complexity and break tree-shaking.
- Components use `"use client"` directive — no Server Components for data fetching (auth goes through browser)
- shadcn/ui components in `src/components/ui/` — generated via `npx shadcn@latest add`
- Service colors and group labels defined in `src/lib/service-meta.ts`
- All sizes in Inter font, `text-sm` as baseline body text, `text-xs` for labels
- Flat UI — depth through background difference, not shadows
