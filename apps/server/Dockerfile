FROM oven/bun:1-alpine AS builder
WORKDIR /app

COPY package.json bun.lock tsconfig.base.json ./

COPY apps/web/package.json ./apps/web/package.json
COPY apps/server/package.json ./apps/server/package.json

COPY apps/server ./apps/server
COPY packages ./packages 

RUN bun install --frozen-lockfile

ENV NODE_ENV=production
RUN bun build ./apps/server/src/index.ts --compile --outfile=server

FROM alpine:latest
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache libstdc++ libgcc

COPY --from=builder /app/server ./server

EXPOSE 3000

CMD ["./server"]
