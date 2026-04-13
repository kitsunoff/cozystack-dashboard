# RFC: Plugin System for Cozystack Dashboard

## Problem

Dashboard UI customization currently requires forking the codebase. Operators and third-party app developers need a way to extend the dashboard — add custom forms, detail tabs, table columns, actions — without modifying the core frontend.

## Goals

- Plugin authors write standard TypeScript/React code with JSX and imports
- Plugins are deployed as ConfigMaps in the cluster — no frontend rebuild needed
- Plugins register components through existing registry system
- Full type safety during development via `@cozystack/sdk` package

## Architecture

### Plugin lifecycle

```
1. Operator writes plugin.tsx with standard imports
2. Builds with esbuild (externals: @cozystack/sdk, react)
3. Deploys as ConfigMap in cluster
4. References ConfigMap in ApplicationDefinition
5. Dashboard server-side loads plugin code from ConfigMap
6. Injects as <script type="module"> before hydration
7. Browser resolves imports via import map
8. Plugin registers components — available on first render
```

### ApplicationDefinition extension

```yaml
apiVersion: cozystack.io/v1alpha1
kind: ApplicationDefinition
metadata:
  name: postgres
spec:
  dashboard:
    category: PaaS
    plugin:
      configMapRef:
        name: postgres-ui-plugin
        key: plugin.js
```

### Plugin source (what the author writes)

```tsx
// postgres-plugin.tsx
import { registerColumns, registerDetailTabs, registerDetailActions } from "@cozystack/sdk";
import { Badge, StatusRow, LiveAge } from "@cozystack/ui";
import { k8sPatch, endpoints } from "@cozystack/k8s";
import React from "react";

// Custom columns
registerColumns("postgreses", [
  {
    key: "status",
    label: "Status",
    render: (i) => {
      const ready = i.status?.conditions?.find((c) => c.type === "Ready");
      return ready?.status === "True"
        ? <StatusRow dotColor="bg-emerald-500" textColor="text-emerald-700" label="Running" />
        : <StatusRow dotColor="bg-amber-500" textColor="text-amber-700" label="Not Ready" />;
    },
  },
  {
    key: "version",
    label: "Version",
    render: (i) => <Badge variant="secondary">{String(i.spec.version ?? "—")}</Badge>,
  },
  {
    key: "replicas",
    label: "Replicas",
    render: (i) => <span className="text-sm tabular-nums">{String(i.spec.replicas ?? "—")}</span>,
  },
  {
    key: "age",
    label: "Age",
    render: (i) => <LiveAge timestamp={i.metadata.creationTimestamp} className="text-sm text-muted-foreground" />,
  },
]);

// Custom detail actions
registerDetailActions("postgreses", [
  {
    key: "restart",
    label: "Restart",
    action: async ({ plural, namespace, instance }) => {
      if (!instance) return;
      await k8sPatch(
        endpoints.instance(plural, namespace, instance.metadata.name),
        { spec: { replicas: 0 } }
      );
      await new Promise((r) => setTimeout(r, 2000));
      await k8sPatch(
        endpoints.instance(plural, namespace, instance.metadata.name),
        { spec: { replicas: 2 } }
      );
    },
  },
]);
```

### Build step (plugin author)

```bash
npm install --save-dev @cozystack/sdk esbuild

npx esbuild postgres-plugin.tsx \
  --bundle \
  --format=esm \
  --jsx=automatic \
  --external:@cozystack/sdk \
  --external:@cozystack/ui \
  --external:@cozystack/k8s \
  --external:react \
  --outfile=plugin.js
```

### Deploy

```bash
kubectl create configmap postgres-ui-plugin \
  --from-file=plugin.js \
  --namespace=cozy-system
```

### Dashboard server-side loading

```tsx
// src/app/(dashboard)/layout.tsx (Server Component)
export default async function DashboardLayout({ children }) {
  const plugins = await loadPlugins(); // fetches ConfigMaps via K8s API

  return (
    <div className="flex h-full">
      {/* Import map — resolves @cozystack/* to dashboard modules */}
      <script type="importmap" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        imports: {
          "@cozystack/sdk": "/_cozystack/sdk.js",
          "@cozystack/ui": "/_cozystack/ui.js",
          "@cozystack/k8s": "/_cozystack/k8s.js",
          "react": "/_cozystack/react.js",
          "react/jsx-runtime": "/_cozystack/jsx-runtime.js",
        }
      })}} />

      {/* Plugins execute before hydration */}
      {plugins.map((p) => (
        <script key={p.name} type="module" dangerouslySetInnerHTML={{ __html: p.code }} />
      ))}

      <Sidebar />
      <ErrorBoundary>
        <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
      </ErrorBoundary>
    </div>
  );
}
```

### SDK module endpoints

Dashboard serves these as API routes or static files:

| Import path | Exposes |
|---|---|
| `@cozystack/sdk` | `registerDetailTabs`, `registerDetailActions`, `registerListActions`, `registerListSections`, `registerColumns`, `registerStatusRenderer`, `registerCustomForm`, `resolveDetailTabs`, `getDetailActions`, `getColumns` |
| `@cozystack/ui` | `Badge`, `Button`, `Input`, `Label`, `Switch`, `Separator`, `Card`, `StatusRow`, `LiveAge`, `WizardShell`, `VersionPicker`, `ResourcesPicker`, `StoragePicker`, `ReplicasPicker`, `ExternalToggle`, `UsersList`, `BackupConfig` |
| `@cozystack/k8s` | `k8sList`, `k8sGet`, `k8sCreate`, `k8sPatch`, `k8sDelete`, `k8sBatch`, `endpoints` |
| `react` | React runtime (shared instance) |
| `react/jsx-runtime` | JSX runtime (for `--jsx=automatic`) |

## @cozystack/sdk npm package

Published as types-only package for development:

```json
{
  "name": "@cozystack/sdk",
  "types": "./index.d.ts",
  "peerDependencies": { "react": "^19" }
}
```

Provides TypeScript types for:
- All registry functions
- `AppInstance`, `K8sEvent`, `ObjectMeta` etc.
- `ColumnDef`, `TabDef`, `ActionDef` etc.
- `CustomFormProps`, `FormBlockProps`

Plugin authors install it for type checking, esbuild externalizes it at build time.

## Security

- Plugin code comes from ConfigMaps — controlled by Kubernetes RBAC
- Only cluster-admin can create ConfigMaps in `cozy-system` namespace
- No external URLs — plugins loaded from within the cluster
- Content-Security-Policy can restrict script sources
- Plugin execution is synchronous before hydration — no async injection attacks

## Existing extension points (already implemented)

| Extension | Register function | Plugin can use |
|---|---|---|
| Table columns | `registerColumns(plural, columns)` | Yes |
| Detail page tabs | `registerDetailTabs(plural, tabs)` | Yes |
| Detail page actions | `registerDetailActions(plural, actions)` | Yes |
| Instance list actions | `registerListActions(plural, actions)` | Yes |
| Custom sections | `registerListSections(plural, sections)` | Yes |
| Status renderer | `registerStatusRenderer(plural, fn)` | Yes |
| Custom forms | `registerCustomForm(plural, component)` | Yes |
| Form blocks | `WizardShell`, `VersionPicker`, etc. | Yes (via @cozystack/ui) |

## Implementation steps

1. Create `/_cozystack/*.js` API routes that re-export dashboard modules as ESM
2. Add `loadPlugins()` server-side function that reads ConfigMaps
3. Add import map and plugin script injection in dashboard layout
4. Publish `@cozystack/sdk` types-only npm package
5. Create example plugin with build instructions
6. Document in CLAUDE.md

## Open questions

- Plugin versioning — how to handle SDK breaking changes?
- Plugin ordering — if two plugins register columns for same plural, who wins?
- Hot reload — how to update plugin without dashboard restart?
- Error isolation — plugin error should not crash the dashboard (ErrorBoundary per plugin?)
