FROM oven/bun:1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# 1. Copy workspace configuration (Crucial for Bun to respect aliases/workspaces)
COPY package.json bun.lock tsconfig.base.json ./

COPY apps/backend ./apps/backend
# If you have shared packages, copy those too
COPY packages ./packages 

RUN bun install
EXPOSE 3000

# Use the --cwd flag to ensure Bun is looking at the right context
CMD ["bun", "run", "apps/backend/src/index.ts"]
