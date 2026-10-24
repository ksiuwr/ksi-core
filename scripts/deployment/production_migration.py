"""Run the release's database migrations before promoting production workloads."""

import argparse
import json
import re
import subprocess
from pathlib import Path


NAMESPACE = "ksi-production"
JOB_NAME = "production-migration"


def migration_job(commit: str, image: str) -> dict:
    if not re.fullmatch(r"[a-f0-9]{40}", commit):
        raise ValueError("A full git commit is required")
    if not re.fullmatch(r"ghcr\.io/ksiuwr/ksi-core-server@sha256:[a-f0-9]{64}", image):
        raise ValueError("An immutable server image digest is required")
    return {
        "apiVersion": "batch/v1",
        "kind": "Job",
        "metadata": {
            "name": JOB_NAME,
            "namespace": NAMESPACE,
            "labels": {"app": JOB_NAME, "ksi.commit": commit},
        },
        "spec": {
            "backoffLimit": 0,
            "activeDeadlineSeconds": 600,
            "ttlSecondsAfterFinished": 86400,
            "template": {
                "metadata": {"labels": {"app": JOB_NAME}},
                "spec": {
                    "restartPolicy": "Never",
                    "automountServiceAccountToken": False,
                    "imagePullSecrets": [{"name": "ghcr-secret"}],
                    "securityContext": {"seccompProfile": {"type": "RuntimeDefault"}},
                    "containers": [{
                        "name": "migration",
                        "image": image,
                        "command": ["bun", "run", "--cwd", "apps/server", "db:migrate"],
                        "envFrom": [{"secretRef": {"name": "ksi-runtime"}}],
                        "securityContext": {
                            "runAsNonRoot": True,
                            "runAsUser": 1000,
                            "runAsGroup": 1000,
                            "allowPrivilegeEscalation": False,
                            "capabilities": {"drop": ["ALL"]},
                        },
                        "resources": {
                            "requests": {"cpu": "100m", "memory": "128Mi"},
                            "limits": {"cpu": "500m", "memory": "512Mi"},
                        },
                    }],
                },
            },
        },
    }


def migrate(commit: str, image: str) -> None:
    job = migration_job(commit, image)
    kubectl = ["kubectl", "-n", NAMESPACE]
    # The fixed name limits read/delete permissions to this Job. Recreate it even
    # on retries, so a previous release's completed Job cannot satisfy this run.
    subprocess.run(
        [*kubectl, "delete", "job", JOB_NAME, "--ignore-not-found", "--cascade=foreground", "--wait=true", "--timeout=120s"],
        check=True,
    )
    subprocess.run([*kubectl, "create", "-f", "-"], input=json.dumps(job), text=True, check=True)
    subprocess.run(
        [*kubectl, "wait", "--for=condition=complete", f"job/{JOB_NAME}", "--timeout=660s"],
        check=True,
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--commit", required=True)
    parser.add_argument("--images", required=True, type=Path)
    args = parser.parse_args()
    migrate(args.commit, json.loads(args.images.read_text())["server"])
