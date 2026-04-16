# syntax=docker/dockerfile:1

# ── Stage 1: Install dependencies ─────────────────────────────────────
FROM docker.io/library/node:20-slim@sha256:f93745c153377ee2fbbdd6e24efcd03cd2e86d6ab1d8aa9916a3790c40313a55 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: Build Next.js ────────────────────────────────────────────
FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run build

# ── Stage 3: Production runtime ───────────────────────────────────────
FROM docker.io/library/node:20-slim@sha256:f93745c153377ee2fbbdd6e24efcd03cd2e86d6ab1d8aa9916a3790c40313a55 AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nextjs

# Production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Build output
COPY --from=build /app/.next ./.next

# Custom server and its runtime imports (tsx runs these from source)
COPY server.ts next.config.ts tsconfig.json ./
COPY src/lib/k8s/ws-proxy.ts src/lib/k8s/server.ts src/lib/k8s/yaml.ts ./src/lib/k8s/
COPY src/types/ ./src/types/

# Static assets
COPY public ./public

RUN chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3000

CMD ["node", "node_modules/.bin/tsx", "server.ts"]
