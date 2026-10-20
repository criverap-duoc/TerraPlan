# syntax=docker/dockerfile:1

# Build stage: the whole pnpm workspace is needed because the API is a workspace package.
FROM node:24-alpine AS build
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

# Runtime stage: only the built output, the production dependencies and the shared catalog.
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/api/node_modules ./api/node_modules
COPY --from=build /app/api/dist ./api/dist
COPY --from=build /app/api/package.json ./api/package.json
COPY catalog ./catalog

EXPOSE 3000
CMD ["node", "api/dist/main.js"]
