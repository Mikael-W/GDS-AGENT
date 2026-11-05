# Image du web (Nuxt 4, preset Nitro node-server), construite par la CI depuis la
# racine du monorepo (jamais sur la VM) :
#   docker build --platform linux/amd64 -f apps/web/Dockerfile --build-arg GIT_SHA=$(git rev-parse --short HEAD) .
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS elagage
COPY . .
RUN pnpm dlx turbo@2.11.7 prune web --docker

FROM base AS construction
COPY --from=elagage /app/out/json/ .
COPY --from=elagage /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile
COPY --from=elagage /app/out/full/ .
ENV NUXT_TELEMETRY_DISABLED=1
RUN pnpm turbo run build --filter=web

FROM node:22-alpine
ENV NODE_ENV=production NUXT_TELEMETRY_DISABLED=1 PORT=3000 HOST=0.0.0.0
WORKDIR /app
COPY --from=construction --chown=node:node /app/apps/web/.output ./.output
# Migrations (service `migrations` du compose de prod) : script compilé et SQL.
COPY --from=construction --chown=node:node /app/packages/db/dist/migrer.mjs ./packages/db/migrer.mjs
COPY --from=construction --chown=node:node /app/packages/db/drizzle ./packages/db/drizzle
ARG GIT_SHA=dev
ENV GIT_SHA=$GIT_SHA
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=6 \
    CMD wget -q -O /dev/null http://127.0.0.1:3000/api/health || exit 1
CMD ["node", ".output/server/index.mjs"]
