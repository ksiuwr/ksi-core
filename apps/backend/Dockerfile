FROM oven/bun:1-alpine AS builder
WORKDIR /app

COPY package.json bun.lock tsconfig.base.json ./

COPY apps/frontend/package.json ./apps/frontend/package.json

COPY apps/backend ./apps/backend
COPY packages ./packages 

RUN bun install --frozen-lockfile

RUN bun build ./apps/backend/src/index.ts --compile --outfile=server

FROM alpine:latest
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache libstdc++ libgcc

COPY --from=builder /app/server ./server

EXPOSE 3000

CMD ["./server"]
