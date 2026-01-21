# syntax=docker/dockerfile:1.7
ARG PNPM_VERSION=10.28.1
FROM node:22.21.0-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && corepack prepare "pnpm@${PNPM_VERSION}" --activate

WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
# Avoid hardlinked node_modules to prevent overlayfs extraction issues
RUN pnpm install --frozen-lockfile --package-import-method=copy

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm build

FROM base AS prod-deps
COPY package.json pnpm-lock.yaml ./
# Avoid hardlinked node_modules to prevent overlayfs extraction issues
RUN pnpm install --frozen-lockfile --prod --package-import-method=copy

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

EXPOSE 3000

CMD ["pnpm", "start"]
