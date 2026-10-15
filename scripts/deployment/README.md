# Tested production promotion

`platform.yml` runs checks for pull requests and pushes. Pushes build four ARM64
images tagged with the source commit. A successful `master` build records each
image's immutable registry digest, updates `ksi-cluster/production-platform.yaml`,
and commits the manifest to the cluster repository.

Promotion requires a fine-grained `CLUSTER_WRITE_TOKEN` with contents write access
to `ksiuwr/ksi-cluster`. It does not require SOPS, Flux, production application
secrets, Cloudflare credentials, or Kubernetes credentials.

`promote_manifest.py` accepts exactly one server, web, auth, and dashboard image.
It requires the expected GHCR repository and an immutable `sha256` digest for each
image, then replaces exactly one matching reference in the production manifest.
These checks prevent partial promotions and mutable image tags.

```sh
python3 -m unittest discover -s scripts/deployment -p 'test_*.py'
```

The final job verifies that `master` still points at the commit whose images were
built before it pushes the cluster commit. Cluster writes are serialized, and a
non-fast-forward push fails safely.

The cluster currently applies `production-platform.yaml` manually. Committing a
promotion records the tested production version but does not contact Kubernetes.
Automated rollout requires a separate deployment runner with cluster credentials.

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
web URL in the job summary. Closing the pull request or deleting its branch drops the
database and deletes only resources carrying its `ksi.preview` label. Wildcard DNS
requires no per-branch cleanup.

Preview credentials persist across updates. To read the sample-account password from
a trusted admin machine, replace `$slug` with the job summary's hostname prefix:

```sh
kubectl -n ksi-previews get secret "runtime-$slug" \
  -o jsonpath='{.data.KSI_SEED_PASSWORD}' | base64 --decode
```
