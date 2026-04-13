# RFC: Plugin System for Cozystack Dashboard

## Problem

Dashboard UI customization currently requires forking the codebase. Operators and third-party app developers need a way to extend the dashboard — add custom forms, detail tabs, table columns, actions — without modifying the core frontend.

## Prior art

Inspired by [Headlamp](https://github.com/headlamp-k8s/headlamp) plugin system:
- UMD bundles with shared dependencies via globals
- `register*` + processor pattern (modify/filter, not just add)
- Distribution via OCI images + init-containers
- Semver compatibility checks
- CLI scaffolding

Key differences from Headlamp:
- We use **import maps** (web standard) instead of `window.pluginLib` globals
- **Server-side loading** — plugins ready before hydration, no FOUC
- **ConfigMap** as simple distribution path alongside OCI images
- Next.js App Router instead of CRA

## Goals

- Plugin authors write standard TypeScript/React code with JSX and imports
- Plugins deployed as ConfigMaps or OCI images — no frontend rebuild needed
- Plugins register AND modify components through registry + processor pattern
- Full type safety via `@cozystack/sdk` package
- Semver compatibility between plugin and dashboard versions

## Architecture

### Plugin lifecycle

```
1. Author scaffolds plugin:  npx @cozystack/create-plugin my-plugin
2. Writes standard TSX with imports from @cozystack/sdk
3. Builds with Vite/esbuild (externals: @cozystack/*, react)
4. Distributes as ConfigMap or OCI image
5. References in ApplicationDefinition spec.dashboard.plugin
6. Dashboard server-side loads plugin code at render time
7. Injects as <script type="module"> with import map before hydration
8. Plugin registers/modifies components — available on first render
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
      # Option 1: ConfigMap (simple, <1MB)
      configMapRef:
        name: postgres-ui-plugin
        key: plugin.js
      # Option 2: OCI image (scalable, versioned)
      # image: ghcr.io/cozystack/plugin-postgres:v1.2.0
      # Option 3: Inline (tiny plugins)
      # inline: |
      #   import { registerColumns } from "@cozystack/sdk";
      #   registerColumns("postgreses", [...]);
    compatibility: ">=0.2.0"  # semver range for dashboard version
```

### Plugin source (what the author writes)

```tsx
// src/index.tsx
import {
  registerColumns,
  registerDetailTabs,
  registerDetailActions,
  registerColumnsProcessor,
} from "@cozystack/sdk";
import { Badge, StatusRow, LiveAge } from "@cozystack/ui";
import { k8sPatch, endpoints } from "@cozystack/k8s";
import React from "react";

// --- Register custom columns ---
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
    key: "age",
    label: "Age",
    render: (i) => <LiveAge timestamp={i.metadata.creationTimestamp} className="text-sm text-muted-foreground" />,
  },
]);

// --- Register detail actions ---
registerDetailActions("postgreses", [
  {
    key: "restart",
    label: "Restart",
    action: async ({ plural, namespace, instance }) => {
      if (!instance) return;
      const path = endpoints.instance(plural, namespace, instance.metadata.name);
      await k8sPatch(path, { spec: { replicas: 0 } });
      await new Promise((r) => setTimeout(r, 2000));
      await k8sPatch(path, { spec: { replicas: 2 } });
    },
  },
]);

// --- Processor: modify existing columns for ALL resources ---
registerColumnsProcessor((plural, columns) => {
  // Add a "Namespace" column to every resource table
  return [
    ...columns,
    {
      key: "ns",
      label: "Namespace",
      render: (i) => <span className="text-xs text-muted-foreground">{i.metadata.namespace}</span>,
    },
  ];
});
```

### Processor pattern

Beyond `register*` (add), processors can **modify or filter** existing registrations:

```ts
// SDK exports
registerColumnsProcessor(
  (plural: string, columns: ColumnDef[]) => ColumnDef[]
);
registerDetailTabsProcessor(
  (plural: string, tabs: TabDef[]) => TabDef[]
);
registerDetailActionsProcessor(
  (plural: string, actions: ActionDef[]) => ActionDef[]
);
```

Use cases:
- Remove a default column from all tables
- Add a column to a specific resource type
- Reorder tabs
- Hide an action based on user permissions
- Replace the default Overview tab with a custom one

### Build step (plugin author)

```bash
# Scaffold
npx @cozystack/create-plugin my-plugin
cd my-plugin

# Develop
npm run dev     # watch mode with hot reload

# Build
npm run build   # outputs dist/plugin.js

# Under the hood:
# vite build --config cozystack.vite.config.ts
# OR
# esbuild src/index.tsx --bundle --format=esm --jsx=automatic \
#   --external:@cozystack/sdk --external:@cozystack/ui \
#   --external:@cozystack/k8s --external:react \
#   --outfile=dist/plugin.js
```

### Distribution

**Option 1: ConfigMap (simple, recommended for start)**

```bash
kubectl create configmap postgres-ui-plugin \
  --from-file=plugin.js=dist/plugin.js \
  --namespace=cozy-system
```

Limits: 1MB max (etcd limit). Good for most plugins.

**Option 2: OCI image (scalable, versioned)**

```dockerfile
FROM scratch
COPY dist/plugin.js /plugin/plugin.js
COPY package.json /plugin/package.json
```

```bash
docker build -t ghcr.io/myorg/cozystack-plugin-postgres:v1.0.0 .
docker push ghcr.io/myorg/cozystack-plugin-postgres:v1.0.0
```

Dashboard pod uses init-container to load plugin:

```yaml
initContainers:
  - name: plugin-postgres
    image: ghcr.io/myorg/cozystack-plugin-postgres:v1.0.0
    command: ["cp", "/plugin/plugin.js", "/plugins/postgres.js"]
    volumeMounts:
      - name: plugins
        mountPath: /plugins
```

**Option 3: Inline in annotation (tiny plugins)**

```yaml
metadata:
  annotations:
    dashboard.cozystack.io/ui-script: |
      import { registerStatusRenderer } from "@cozystack/sdk";
      registerStatusRenderer("postgreses", (i) => ...);
```

For simple overrides without a build step.

### Dashboard server-side loading

```tsx
// src/app/(dashboard)/layout.tsx (Server Component)
export default async function DashboardLayout({ children }) {
  const plugins = await loadPlugins(); // fetches ConfigMaps/files via K8s API

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

      {/* Plugins execute synchronously before hydration */}
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

### SDK modules

Dashboard serves these as API routes (`/app/api/_cozystack/[module]/route.ts`):

| Import path | Re-exports from dashboard |
|---|---|
| `@cozystack/sdk` | All `register*` functions, all `register*Processor` functions, `resolveDetailTabs`, `getDetailActions`, `getColumns`, `getListActions`, `getListSections`, `getStatusRenderer` |
| `@cozystack/ui` | `Badge`, `Button`, `Input`, `Label`, `Switch`, `Separator`, `Card`, `Skeleton`, `StatusRow`, `LiveAge`, `WizardShell`, `VersionPicker`, `ResourcesPicker`, `StoragePicker`, `ReplicasPicker`, `ExternalToggle`, `UsersList`, `BackupConfig`, `FormProvider`, `useFormContext` |
| `@cozystack/k8s` | `k8sList`, `k8sGet`, `k8sCreate`, `k8sPatch`, `k8sDelete`, `k8sBatch`, `endpoints`, `useInstances`, `useInstance`, `useEvents`, `useMarketplacePanels`, `useApplicationDefinition`, `useNamespace` |
| `react` | React 19 runtime (shared instance — no duplicate React) |
| `react/jsx-runtime` | JSX runtime (for `--jsx=automatic`) |

### @cozystack/sdk npm package

Published as types-only package for plugin development:

```json
{
  "name": "@cozystack/sdk",
  "version": "0.2.0",
  "types": "./index.d.ts",
  "peerDependencies": { "react": "^19" }
}
```

Provides TypeScript types for:
- All registry functions + processor functions
- `AppInstance`, `K8sEvent`, `ObjectMeta`, `MarketplacePanel`
- `ColumnDef`, `TabDef`, `ActionDef`, `ListSectionDef`, `StatusRenderer`
- `CustomFormProps`, `FormBlockProps`
- All UI component props

Plugin authors install for type checking; esbuild/vite externalizes at build time.

### Semver compatibility

Plugin declares compatible dashboard version range in `package.json`:

```json
{
  "name": "cozystack-plugin-postgres",
  "version": "1.0.0",
  "cozystack": {
    "compatibility": ">=0.2.0 <1.0.0"
  }
}
```

Dashboard checks on load:
- Compatible → load
- Incompatible → skip + log warning
- No compatibility field → load with warning

### CLI scaffolding

```bash
npx @cozystack/create-plugin my-plugin

# Creates:
# my-plugin/
#   src/
#     index.tsx        # entry point with example registrations
#   package.json       # @cozystack/sdk in devDependencies
#   tsconfig.json      # strict, jsx: react-jsx
#   vite.config.ts     # externals configured
#   README.md          # build + deploy instructions
```

## Security

- **ConfigMap plugins**: controlled by Kubernetes RBAC — only users with ConfigMap write access in `cozy-system` can deploy plugins
- **OCI image plugins**: controlled by image pull policy + registry auth
- **No external URLs**: plugins never loaded from CDN or external sources
- **CSP headers**: `script-src 'self' 'unsafe-inline'` (needed for inline scripts)
- **Error isolation**: each plugin wrapped in try-catch during load; plugin error doesn't crash dashboard
- **No eval()**: use `new Function()` or `<script type="module">` — slightly safer than eval, but still executes arbitrary code. Trust boundary = K8s RBAC

## Extension points (already implemented in dashboard)

| Extension | Register | Processor | Plugin can use |
|---|---|---|---|
| Table columns | `registerColumns` | `registerColumnsProcessor` | Yes |
| Detail page tabs | `registerDetailTabs` | `registerDetailTabsProcessor` | Yes |
| Detail page actions | `registerDetailActions` | `registerDetailActionsProcessor` | Yes |
| Instance list actions | `registerListActions` | — | Yes |
| Custom list sections | `registerListSections` | — | Yes |
| Status renderer | `registerStatusRenderer` | — | Yes |
| Custom forms | `registerCustomForm` | — | Yes |
| Form blocks | via `@cozystack/ui` | — | Yes |

## Implementation steps

### Phase 1: Core infrastructure
1. Add processor functions to registry (`registerColumnsProcessor`, etc.)
2. Create `/_cozystack/*.js` API routes that re-export dashboard modules as ESM
3. Add `loadPlugins()` server-side function (reads ConfigMaps from K8s API)
4. Add import map + plugin script injection in dashboard layout

### Phase 2: SDK package
5. Create `@cozystack/sdk` types-only npm package
6. Create `@cozystack/create-plugin` scaffolding CLI

### Phase 3: Distribution
7. Document ConfigMap deployment workflow
8. Add OCI image support (init-container pattern)
9. Add inline annotation support for tiny plugins

### Phase 4: DX
10. Plugin dev mode with hot reload
11. Example plugins (postgres custom columns, VM console tab)
12. Plugin catalog page in dashboard

## Open questions

- **Plugin ordering**: if two plugins register columns for same plural, append or replace? Currently: last wins. Should we support priority/weight?
- **Hot reload**: ConfigMap changes should reload plugin without pod restart. Watch ConfigMaps?
- **Plugin state**: should plugins have persistent settings? (localStorage? ConfigMap?)
- **Plugin isolation**: run each plugin in iframe/shadow DOM for CSS isolation? Or trust plugins?
- **React Server Components**: future RSC support in plugins? Or client-only forever?
