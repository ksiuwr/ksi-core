# Selects the image to build: server, web, auth or dashboard.
ARG APP=server

FROM oven/bun:1.3.14-alpine AS deps
WORKDIR /app
# Only manifests, so source changes reuse the cached install layer.
COPY package.json bun.lock .npmrc ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY apps/auth/package.json apps/auth/
COPY apps/dashboard/package.json apps/dashboard/
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/
RUN bun install --frozen-lockfile --ignore-scripts
COPY . .

FROM oven/bun:1.3.14-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
# Without node_modules Bun would fetch any unresolved import from npm at runtime.
RUN printf '[install]\nauto = "disable"\n' > bunfig.toml
COPY scripts/deployment/start.sh scripts/deployment/start.sh
EXPOSE 3000
CMD ["sh", "scripts/deployment/start.sh"]

FROM deps AS server-build
# Bundles keep their source paths, so cluster commands such as `bun apps/server/src/worker.ts`
# and `bun run --cwd apps/server db:migrate` work unchanged.
RUN bun build apps/server/src/index.ts apps/server/src/worker.ts apps/server/src/operator.ts \
    apps/server/src/db/seed.ts apps/server/src/db/migrate.ts \
    --target=bun --root apps/server/src --outdir /out/apps/server/src \
    --entry-naming '[dir]/[name].ts' --external sharp \
  && cp apps/server/package.json /out/apps/server/ \
  && cp -a apps/server/drizzle /out/apps/server/drizzle \
  && rm /out/apps/server/drizzle/*/snapshot.json \
  && sharp=$(realpath apps/server/node_modules/sharp) \
  && cp -RL "$(dirname "$sharp")" /out/node_modules \
  && rm -rf /out/node_modules/.bin /out/node_modules/@types \
    /out/node_modules/@img/sharp-linux-* /out/node_modules/@img/sharp-libvips-linux-*

FROM runtime AS image-server
# The operator's backup and restore commands use pg_dump, pg_restore and openssl.
RUN apk add --no-cache postgresql-client openssl
COPY --from=server-build /out/ ./
ENV KSI_APP=server
USER bun

FROM deps AS frontend-build
ARG APP
ARG PUBLIC_COMMIT_HASH
ENV PUBLIC_COMMIT_HASH=$PUBLIC_COMMIT_HASH
# The install skips lifecycle scripts, so generate the UI package's tsconfig that apps compile against.
# The bundle replaces build/server and node_modules; adapter-node resolves client/ next to index.js.
RUN bun run --cwd packages/ui svelte-kit sync \
  && bun run --cwd "apps/$APP" build \
  && bun build "apps/$APP/build/index.js" --target=bun --outfile /out/index.js \
  && cp -a "apps/$APP/build/client" /out/client \
  && if [ -d "apps/$APP/build/prerendered" ]; then cp -a "apps/$APP/build/prerendered" /out/; fi

FROM runtime AS image-frontend
ARG APP
COPY --from=frontend-build /out/ apps/$APP/build/
ENV KSI_APP=$APP
USER bun

FROM image-frontend AS image-web
FROM image-frontend AS image-auth
FROM image-frontend AS image-dashboard

FROM image-${APP}
