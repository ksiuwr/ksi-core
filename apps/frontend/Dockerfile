# 1. Base Stage
FROM oven/bun:1-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
COPY packages/ ./packages/
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json

RUN bun install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN bun run --filter "@ksi-core/frontend" prepare
RUN bun run --filter "@ksi-core/frontend" build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY --from=builder /app/apps/frontend/build ./build
COPY --from=builder /app/apps/frontend/package.json ./package.json

COPY --from=builder /app/packages ./packages

EXPOSE 3001
CMD ["bun", "run", "build/index.js"]
