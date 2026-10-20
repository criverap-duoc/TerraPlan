# syntax=docker/dockerfile:1

# Build stage: the whole pnpm workspace is needed because the API is a workspace package.
FROM node:24-alpine AS builder
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY api/package.json ./api/package.json
COPY web/package.json ./web/package.json
RUN pnpm install --frozen-lockfile

COPY api ./api
RUN pnpm --filter api build

# Isolated production bundle: package.json, production node_modules and dist, no dev dependencies.
# --legacy is required because the workspace does not set inject-workspace-packages.
RUN pnpm --filter api --prod deploy --legacy /prod-api

# Prune build-only leftovers (optional peers, source maps, package tests) before copying, because
# deleting files after a COPY does not shrink the image.
RUN rm -rf /prod-api/node_modules/.pnpm/typescript@* \
    /prod-api/node_modules/.pnpm/ts-node@* \
    /prod-api/node_modules/.pnpm/@types+node@* \
  && find /prod-api/node_modules -name '*.map' -delete \
  && find /prod-api/node_modules -type d \( -name test -o -name tests \) -prune -exec rm -rf {} +

# Runtime stage: only the production bundle and the shared catalog.
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# The API keeps its own folder because the code resolves catalog/ and package.json one level up.
COPY --from=builder /prod-api/package.json ./api/package.json
COPY --from=builder /prod-api/node_modules ./api/node_modules
COPY --from=builder /prod-api/dist ./api/dist
COPY catalog ./catalog

USER node
EXPOSE 3000
CMD ["node", "api/dist/main.js"]
