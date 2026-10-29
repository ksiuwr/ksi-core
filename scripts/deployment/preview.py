"""Render direct, namespace-scoped Kubernetes preview resources."""

import argparse
import hashlib
import json
import re
from pathlib import Path

from promote_manifest import APPS


NAMESPACE = "ksi-previews"


def branch_slug(branch: str) -> str:
    if not branch or len(branch) > 1024 or branch == "master":
        raise ValueError("Invalid preview branch")
    normalized = re.sub(r"[^a-z0-9]+", "-", branch.lower()).strip("-") or "branch"
    return f"{normalized[:35].rstrip('-')}-{hashlib.sha256(branch.encode()).hexdigest()[:10]}"


def validate(commit: str, images: dict[str, str]) -> None:
    if not re.fullmatch(r"[a-f0-9]{40}", commit):
        raise ValueError("A full git commit is required")
    if set(images) != set(APPS):
        raise ValueError("All four application image digests are required")
    for app, image in images.items():
        if not re.fullmatch(
            rf"ghcr\.io/ksiuwr/ksi-core-{app}@sha256:[a-f0-9]{{64}}", image
        ):
            raise ValueError(f"Invalid immutable image for {app}")


def resource(kind, name, spec, api="v1", labels=None):
    return {
        "apiVersion": api,
        "kind": kind,
        "metadata": {"name": name, "namespace": NAMESPACE, "labels": labels or {}},
        "spec": spec,
    }


def resources(memory_request):
    # Previews reserve little of the node's two cores, so many fit beside production. CPU time is
    # shared in proportion to requests, so production wins when the node is busy, and the limit
    # keeps one preview from taking a whole core.
    return {
        "requests": {"cpu": "10m", "memory": memory_request},
        "limits": {"cpu": "250m", "memory": "512Mi"},
    }


def job(name, image, command, slug, secret, env_from_admin=False):
    env_from = [{"secretRef": {"name": secret}}]
    if env_from_admin:
        env_from.append({"secretRef": {"name": "preview-postgres-admin"}})
    container_security = {"allowPrivilegeEscalation": False, "capabilities": {"drop": ["ALL"]}, "runAsNonRoot": True}
    pod_security = {"seccompProfile": {"type": "RuntimeDefault"}}
    if image.startswith("postgres:"):
        container_security.update({"runAsUser": 70, "runAsGroup": 70})
        pod_security["fsGroup"] = 70
    else:
        container_security.update({"runAsUser": 1000, "runAsGroup": 1000})
    return resource(
        "Job",
        name,
        {
            "backoffLimit": 2,
            "activeDeadlineSeconds": 600,
            "template": {
                "metadata": {"labels": {"ksi.preview": slug}},
                "spec": {
                    "restartPolicy": "Never",
                    "automountServiceAccountToken": False,
                    "securityContext": pod_security,
                    "imagePullSecrets": [{"name": "ghcr-secret"}],
                    "containers": [
                        {
                            "name": "job",
                            "image": image,
                            "command": command,
                            "envFrom": env_from,
                            "securityContext": container_security,
                            "resources": resources("128Mi"),
                        }
                    ],
                },
            },
        },
        "batch/v1",
        {"ksi.preview": slug},
    )


PROVISION = r"""set -eu
export PGHOST=preview-postgres PGUSER=postgres PGPASSWORD="$POSTGRES_PASSWORD"
psql -v ON_ERROR_STOP=1 -v role="$PREVIEW_DATABASE" -v pw="$PREVIEW_DATABASE_PASSWORD" postgres <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION', :'role', :'pw')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'role')\gexec
SELECT format('ALTER ROLE %I PASSWORD %L', :'role', :'pw')\gexec
SELECT format('CREATE DATABASE %I OWNER %I', :'role', :'role')
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = :'role')\gexec
SELECT format('REVOKE CONNECT ON DATABASE %I FROM PUBLIC', :'role')\gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', :'role', :'role')\gexec
SQL
"""

DROP = r"""set -eu
export PGHOST=preview-postgres PGUSER=postgres PGPASSWORD="$POSTGRES_PASSWORD"
psql -v ON_ERROR_STOP=1 -v role="$PREVIEW_DATABASE" postgres <<'SQL'
SELECT format('DROP DATABASE IF EXISTS %I WITH (FORCE)', :'role')\gexec
SELECT format('DROP ROLE IF EXISTS %I', :'role')\gexec
SQL
"""


def render(branch: str, commit: str, images: dict[str, str], output: Path) -> str:
    validate(commit, images)
    slug = branch_slug(branch)
    labels = {"ksi.preview": slug}
    secret = f"runtime-{slug}"
    config_name = f"config-{slug}"
    hosts = {app: f"{slug}-{app}.ksi.edu.pl" for app in ("api", "web", "auth", "dash", "ws")}
    config = {
        "NODE_ENV": "production",
        "KSI_ENVIRONMENT": slug,
        "PUBLIC_WEB_ORIGIN": "https://" + hosts["web"],
        "PUBLIC_AUTH_ORIGIN": "https://" + hosts["auth"],
        "PUBLIC_DASHBOARD_ORIGIN": "https://" + hosts["dash"],
        "PUBLIC_API_ORIGIN": "https://" + hosts["api"],
        "PUBLIC_WS_ORIGIN": "wss://" + hosts["ws"],
        "INTERNAL_API_ORIGIN": f"http://{slug}-server:3000",
        "ORIGIN": "https://" + hosts["web"],
        "PORT": "3000",
        "HOST": "0.0.0.0",
    }
    prerequisite = {
        "apiVersion": "v1",
        "kind": "ConfigMap",
        "metadata": {"name": config_name, "namespace": NAMESPACE, "labels": labels},
        "data": config,
    }
    provision = job(
        f"provision-{slug}", "postgres:17.6-alpine", ["sh", "-c", PROVISION], slug, secret, True
    )
    migration = job(
        f"migrate-{slug}-{commit[:8]}",
        images["server"],
        ["bun", "run", "--cwd", "apps/server", "db:migrate"],
        slug,
        secret,
    )
    seed = job(
        f"seed-{slug}", images["server"], ["bun", "apps/server/src/db/seed.ts"], slug, secret
    )
    for application_job in (migration, seed):
        application_job["spec"]["template"]["spec"]["containers"][0]["envFrom"].insert(
            0, {"configMapRef": {"name": config_name}}
        )
    security = {"allowPrivilegeEscalation": False, "capabilities": {"drop": ["ALL"]}, "runAsNonRoot": True, "runAsUser": 1000, "runAsGroup": 1000}

    def deployment(name, container):
        return resource("Deployment", name, {
            "replicas": 1,
            "strategy": {"type": "RollingUpdate", "rollingUpdate": {"maxUnavailable": 0, "maxSurge": 1}},
            "selector": {"matchLabels": {"app": name}},
            "template": {"metadata": {"labels": {"app": name, **labels}}, "spec": {"automountServiceAccountToken": False, "securityContext": {"seccompProfile": {"type": "RuntimeDefault"}}, "imagePullSecrets": [{"name": "ghcr-secret"}], "containers": [container]}},
        }, "apps/v1", labels)

    workloads = []
    for app in APPS:
        name = f"{slug}-{app}"
        container = {
            "name": app,
            "image": images[app],
            "ports": [{"containerPort": 3000}],
            "envFrom": [{"configMapRef": {"name": config_name}}],
            "env": [{"name": "ORIGIN", "value": "https://" + hosts["dash" if app == "dashboard" else ("api" if app == "server" else app)]}],
            "readinessProbe": {"tcpSocket": {"port": 3000}, "initialDelaySeconds": 5},
            "livenessProbe": {"tcpSocket": {"port": 3000}, "initialDelaySeconds": 30},
            "resources": resources("64Mi"),
            "securityContext": security,
        }
        if app == "server":
            container["envFrom"].append({"secretRef": {"name": secret}})
            container["readinessProbe"] = {"httpGet": {"path": "/ready", "port": 3000}, "initialDelaySeconds": 5}
            container["livenessProbe"] = {"httpGet": {"path": "/health", "port": 3000}, "initialDelaySeconds": 30}
        else:
            container["env"].append({"name": "PROXY_SECRET", "valueFrom": {"secretKeyRef": {"name": secret, "key": "PROXY_SECRET"}}})
        if app == "dashboard":
            container["env"].append({"name": "BODY_SIZE_LIMIT", "value": "21M"})
        workloads.append(deployment(name, container))
        workloads.append(resource("Service", name, {"selector": {"app": name}, "ports": [{"port": 3000, "targetPort": 3000}]}, labels=labels))
    # As in production, the background worker runs the server image and serves no traffic.
    workloads.append(deployment(f"{slug}-worker", {
        "name": "worker",
        "image": images["server"],
        "command": ["bun", "apps/server/src/worker.ts"],
        "envFrom": [{"configMapRef": {"name": config_name}}, {"secretRef": {"name": secret}}],
        "resources": resources("64Mi"),
        "securityContext": security,
    }))
    rules = []
    for host, app in [("api", "server"), ("ws", "server"), ("web", "web"), ("auth", "auth"), ("dash", "dashboard")]:
        rules.append({"host": hosts[host], "http": {"paths": [{"path": "/", "pathType": "Prefix", "backend": {"service": {"name": f"{slug}-{app}", "port": {"number": 3000}}}}]}})
    workloads.append(resource("Ingress", slug, {"ingressClassName": "nginx", "tls": [{"hosts": list(hosts.values())}], "rules": rules}, "networking.k8s.io/v1", labels))
    output.mkdir(parents=True, exist_ok=True)
    for name, value in [("prerequisite", prerequisite), ("provision", provision), ("migration", migration), ("seed", seed), ("workloads", {"apiVersion": "v1", "kind": "List", "items": workloads})]:
        (output / f"{name}.json").write_text(json.dumps(value, indent=2) + "\n")
    (output / "release.json").write_text(json.dumps({"slug": slug, "hosts": hosts, "commit": commit}, indent=2) + "\n")
    return slug


def render_cleanup(branch: str, output: Path) -> str:
    slug = branch_slug(branch)
    cleanup = job(f"drop-{slug}", "postgres:17.6-alpine", ["sh", "-c", DROP], slug, f"runtime-{slug}", True)
    output.write_text(json.dumps(cleanup, indent=2) + "\n")
    return slug


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=("slug", "render", "cleanup"))
    parser.add_argument("--branch", required=True)
    parser.add_argument("--commit")
    parser.add_argument("--images", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    if args.action == "slug":
        print(branch_slug(args.branch))
    elif args.action == "cleanup":
        print(render_cleanup(args.branch, args.output))
    else:
        print(render(args.branch, args.commit, json.loads(args.images.read_text()), args.output))
