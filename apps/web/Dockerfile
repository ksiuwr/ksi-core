# 1. Base Stage
FROM oven/bun:1-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
COPY packages/ ./packages/
COPY apps/server/package.json ./apps/server/package.json
COPY apps/web/package.json ./apps/web/package.json

RUN bun install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app /app
COPY . .

RUN bun run --cwd apps/web prepare
RUN bun run --cwd apps/web build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=builder /app/apps/web/build ./apps/web/build
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/packages ./packages

WORKDIR /app/apps/web

EXPOSE 3001
CMD ["bun", "run", "build/index.js"]

