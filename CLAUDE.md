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

To add a custom form:

1. Create `src/components/form/custom/my-form.tsx` implementing `CustomFormProps`
2. Add `registerCustomForm("myplural", MyForm)` in `index.ts`

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

### Detail Pages

`src/components/detail/` — instance detail view with tabs.

- `detail-view.tsx` — header with status + tab navigation
- `tab-registry.tsx` — returns tabs per resource type (K8s gets 5 tabs, others get Overview + YAML)
- `tabs/overview-tab.tsx` — generic config display with conditions
- `tabs/yaml-tab.tsx` — YAML representation with copy button
- `tabs/k8s-*.tsx` — Kubernetes-specific: control plane, node groups, addons

### Routing

Two route groups with different layouts:

- `(tenant-select)` — no sidebar, used by `/tenants`
- `(dashboard)` — sidebar + main area, used by `/marketplace`, `/apps/*`

```text
/                              → redirect to /tenants
/tenants                       → tenant (namespace) selection, no sidebar
/marketplace                   → service catalog with tag filters and search
/apps/[plural]                 → instance list with metrics, table, events
/apps/[plural]/new             → create form (custom or generic)
/apps/[plural]/[name]          → instance detail with tabs
/api/k8s/[...path]             → proxy to kube-apiserver
```

Namespace is carried as `?namespace=xxx` URL search param. Only `tenant-*` namespaces are shown.

### Layout

- Sidebar (`src/components/layout/sidebar.tsx`) — 240px, logo, grouped nav by tag with colored dots
- Header (`src/components/layout/header.tsx`) — title, subtitle, optional search, namespace selector, theme toggle
- No shared `<Header>` in root layout — each page renders its own Header with appropriate props

### Kubernetes CRDs Read

| CRD | Group | Usage |
| --- | --- | --- |
| MarketplacePanel | dashboard.cozystack.io | Marketplace cards, sidebar nav |
| Factory | dashboard.cozystack.io | Detail page structure (not yet fully used) |
| CustomFormsOverride | dashboard.cozystack.io | Form field overrides (hidden, sort, types) |
| CustomFormsPrefill | dashboard.cozystack.io | Form default values |
| CFOMapping | dashboard.cozystack.io | customizationId lookup |
| ApplicationDefinition | cozystack.io | OpenAPI schema for generic forms |
| App instances | apps.cozystack.io | CRUD on actual resources |

## Conventions

- Components use `"use client"` directive — no Server Components for data fetching (auth goes through browser)
- shadcn/ui components in `src/components/ui/` — generated via `npx shadcn@latest add`
- Service colors and group labels defined in `src/lib/service-meta.ts`
- All sizes in Inter font, `text-sm` as baseline body text, `text-xs` for labels
- Flat UI — depth through background difference, not shadows
