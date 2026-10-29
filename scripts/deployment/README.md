# Tested production promotion

`platform.yml` runs checks for pull requests and pushes. Pushes build four ARM64
images tagged with the source commit. A successful `master` build records each
image's immutable registry digest, updates `ksi-cluster/production-platform.yaml`,
and commits the manifest to the cluster repository.

Production always rebuilds all four images. Preview branches rebuild only applications
affected by their diff from `master`; unchanged applications reuse the immutable image
digest built from the merge-base. Server, shared package, lockfile, and container runtime
changes rebuild every image. UI package changes rebuild all three frontends.

## Images

`Dockerfile` installs the workspace once from the lockfile in a layer keyed only by the
package manifests, then bundles each application with `bun build`. Runtime images hold
the `oven/bun` base and the bundles, without the workspace `node_modules`:

- Frontends contain `apps/$APP/build/index.js` and the static `client/` directory.
- The server contains its five entrypoints bundled at their source paths
  (`apps/server/src/index.ts`, `worker.ts`, `operator.ts`, `db/seed.ts` and
  `db/migrate.ts`), the migration SQL, `package.json` for `bun run db:migrate`, the musl
  build of `sharp`, and `pg_dump`, `pg_restore` and `openssl` for operator backups.

Existing cluster and operator commands keep working unchanged. A `bunfig.toml`
disables Bun's runtime auto-install, so an unresolved import fails instead of fetching
from npm. CI builds with BuildKit, which skips stages the selected `APP` does not need.
The legacy builder runs every stage, so build locally with
`docker buildx build -f scripts/deployment/Dockerfile --build-arg APP=web .`.

Promotion requires a fine-grained `CLUSTER_WRITE_TOKEN` with contents write access
to `ksiuwr/ksi-cluster` and the `PRODUCTION_KUBECONFIG_B64` secret in the protected
`production` GitHub Environment. The kubeconfig belongs to a ServiceAccount that can
patch only the existing production Deployments, Services and Ingress by name. It
can create migration Jobs and get/list/watch/delete the named `production-migration`
Job, but cannot directly read Secrets or Pods or access preview resources.

`promote_manifest.py` accepts exactly one server, web, auth, and dashboard image.
It requires the expected GHCR repository and an immutable `sha256` digest for each
image, then replaces the expected matching references in the production manifest:
two for the server image, which the `server` and background `worker` Deployments share,
and one for each frontend. These checks prevent partial promotions and mutable image tags.

```sh
python3 -m unittest discover -s scripts/deployment -p 'test_*.py'
```

The final job verifies that `master` still points at the commit whose images were
built before it pushes the cluster commit. Cluster writes are serialized, and a
non-fast-forward push fails safely.

After CI confirms the tested commit is still the current `master`, it runs the
production migration Job with the new server image. On success, it rechecks `master`,
commits the production image digests to `ksi-cluster`, applies that manifest, and
waits for the four application Deployments and the worker to become ready. If the rollout fails, the
manifest commit records the intended tested digests and the workflow reports failure;
roll back by promoting the previous known-good image digests.

## Pull request previews

Non-`master` pushes build and test the same four images, then queue a deployment to
the protected `preview` GitHub Environment. Required reviewers approve it with
GitHub's **Review deployments** control. The cluster credential is an environment
secret, so no preview deployment or secret access occurs before approval.

Previews share the `ksi-previews` namespace and PostgreSQL instance. Every branch
gets prefixed Deployments, Services, Ingress, ConfigMap, Secret, migration/seed Jobs,
and its own database role and database. The kubeconfig ServiceAccount is restricted
to namespaced resources in `ksi-previews`; it has no production permissions.

Bootstrap once from a trusted admin machine:

1. Create `preview-postgres-admin` in `ksi-previews` with a strong
   `POSTGRES_PASSWORD`, then apply `preview-bootstrap.yaml`.
2. Copy the GHCR pull Secret into `ksi-previews` as `ghcr-secret` when packages are
   private.
3. Build a kubeconfig for `github-preview-deployer` using the CA from the
   `ksi-previews/kube-root-ca.crt` ConfigMap, base64 encode it, and save it as the
   preview Environment secret `PREVIEW_KUBECONFIG_B64`.
4. Configure wildcard `*.ksi.edu.pl` DNS and make its origin certificate the
   ingress-nginx default certificate. Per-branch DNS credentials are not needed.
5. Configure maintainers as required reviewers on the `preview` Environment. Leave
   **Prevent self-review** disabled so an authorized PR author can approve their own
   preview. Pull request merge approval remains controlled by branch protection.

After approval, CI verifies that the branch still has an open pull request, provisions
the branch database, migrates and seeds it, rolls out the workloads, and publishes the
web URL in the step log and job summary. GitHub also adds a **View deployment** link and
creates or updates one preview comment on the pull request. Closing the pull request or
deleting its branch drops the database and deletes only resources carrying its
`ksi.preview` label. Wildcard DNS requires no per-branch cleanup.

Preview credentials persist across updates. To read the sample-account password from
a trusted admin machine, replace `$slug` with the job summary's hostname prefix:

```sh
kubectl -n ksi-previews get secret "runtime-$slug" \
  -o jsonpath='{.data.KSI_SEED_PASSWORD}' | base64 --decode
```

The project portal can show these credentials to project groups without granting users
Kubernetes access. Configure `PREVIEW_CREDENTIALS_API_ORIGIN` and
`PREVIEW_CREDENTIALS_OIDC_AUDIENCE` as variables in the `preview` GitHub Environment;
the audience must match the production API's `PREVIEW_CREDENTIALS_OIDC_AUDIENCE`.
Optionally set `PREVIEW_CREDENTIALS_PROJECT_SLUG` (defaults to `ksi-core`). Configure
`PREVIEW_CREDENTIALS_ENCRYPTION_KEY` on the production API as a base64 encoding of 32
random bytes. The API verifies GitHub's OIDC signature and restricts ingestion to this
repository's protected preview environment, encrypts stored passwords, and removes them
when preview cleanup runs. In project settings, create a group such as “Maintainers”,
assign project members, and enable “View preview sign-in credentials”.

## Production migrations

The protected production promotion job runs `production_migration.py` with the new,
immutable server image and the existing `ksi-production/ksi-runtime` Secret. The Job
runs `bun run --cwd apps/server db:migrate`; it does not seed or reset production.
Promotion is recorded and workloads are updated only after the Job completes. A
failed migration or timeout fails the workflow and leaves existing workloads running.

The production deployer Role in `ksi-cluster/infrastructure/production-deployer.yaml`
must first allow Job creation and get/watch/delete for `production-migration`. Merge
and reconcile that infrastructure change before enabling this workflow. No runtime
Secret or database credential needs to be copied into GitHub Actions.

Deployments are serialized by the existing production promotion concurrency group.
Every attempt deletes and waits for the previous migration Job, then creates a new
one, so retries cannot reuse a completed Job from an older release. Jobs have no
automatic retries, a ten-minute deadline and a one-day cleanup TTL. Drizzle records
applied migrations, so reruns skip migrations already applied successfully. Migrations
must remain compatible with the previous application release while rollout occurs.

`db:migrate` runs `apps/server/src/db/migrate.ts`, which calls the same drizzle-orm
migrator as `drizzle-kit migrate`, so the server image does not need `drizzle-kit`. It
holds a PostgreSQL advisory lock for the whole run, so concurrent migration Jobs wait
instead of failing. All pending migrations apply in one transaction; a failure records
nothing.

To diagnose failures, an administrator can inspect the retained Job and Pod logs:

```sh
kubectl -n ksi-production describe job production-migration
kubectl -n ksi-production logs job/production-migration
```

After correcting the failure, rerun the production workflow. Do not bypass the
migration step or use an older image that does not contain the release's migrations.
