# 1. Base Stage
FROM oven/bun:1-alpine AS base
WORKDIR /app

# 2. Install ALL deps (needed for build)
FROM base AS deps
COPY package.json bun.lock ./
COPY packages/ ./packages/
COPY apps/server/package.json ./apps/server/package.json
COPY apps/web/package.json ./apps/web/package.json

RUN bun install --frozen-lockfile

# 3. Build
FROM base AS builder
COPY --from=deps /app /app
COPY . .

ARG PUBLIC_COMMIT_HASH
ENV PUBLIC_COMMIT_HASH=$PUBLIC_COMMIT_HASH

RUN bun run --cwd apps/web prepare
RUN bun run --cwd apps/web build

# 4. Install only the frontend's production deps (no monorepo context)
FROM base AS prod-deps
WORKDIR /app
COPY apps/web/package.json ./package.json

# "shared" uses workspace:* protocol and is already bundled by Vite — strip it
RUN sed -i '/"shared":/d' package.json

RUN bun install --production --ignore-scripts

# 5. Final runtime image
FROM oven/bun:1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

COPY --from=builder /app/apps/web/build ./build
COPY --from=builder /app/apps/web/package.json ./package.json
COPY --from=prod-deps /app/node_modules ./node_modules

EXPOSE 3001
CMD ["bun", "build/index.js"]
