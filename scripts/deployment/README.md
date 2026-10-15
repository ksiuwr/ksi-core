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
