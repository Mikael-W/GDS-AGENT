# Image du worker (pg-boss), construite par la CI depuis la racine du monorepo :
#   docker build --platform linux/amd64 -f apps/worker/Dockerfile --build-arg GIT_SHA=$(git rev-parse --short HEAD) .
# Le worker est livré en un seul fichier (esbuild) : l'image ne contient ni
# dépendances ni sources.
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS elagage
COPY . .
RUN pnpm dlx turbo@2.11.7 prune worker --docker

FROM base AS construction
COPY --from=elagage /app/out/json/ .
COPY --from=elagage /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile
COPY --from=elagage /app/out/full/ .
RUN pnpm turbo run build --filter=worker

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=construction --chown=node:node /app/apps/worker/dist/worker.mjs ./worker.mjs
ARG GIT_SHA=dev
ENV GIT_SHA=$GIT_SHA
USER node
CMD ["node", "worker.mjs"]
