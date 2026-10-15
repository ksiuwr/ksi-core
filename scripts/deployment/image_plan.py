"""Decide which application images a branch must rebuild."""

import argparse
import sys
from pathlib import PurePosixPath

from promote_manifest import APPS


FRONTENDS = {"web", "auth", "dashboard"}
ALL_IMAGE_INPUTS = {
    ".dockerignore",
    ".npmrc",
    "bun.lock",
    "package.json",
    "tsconfig.base.json",
    "scripts/deployment/Dockerfile",
    "scripts/deployment/start.sh",
}


def affected_apps(paths: list[str]) -> set[str]:
    affected: set[str] = set()
    for raw_path in paths:
        path = PurePosixPath(raw_path)
        parts = path.parts
        if raw_path in ALL_IMAGE_INPUTS:
            return set(APPS)
        if len(parts) >= 2 and parts[0] == "packages":
            if parts[1] == "ui":
                affected.update(FRONTENDS)
            else:
                return set(APPS)
        if len(parts) >= 2 and parts[0] == "apps" and parts[1] in APPS:
            if parts[1] == "server":
                # Frontends compile against server types through the shared workspace package.
                return set(APPS)
            affected.add(parts[1])
    return affected


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--app", required=True, choices=APPS)
    parser.add_argument("--nul", action="store_true")
    args = parser.parse_args()
    separator = b"\0" if args.nul else b"\n"
    paths = [part.decode() for part in sys.stdin.buffer.read().split(separator) if part]
    print(str(args.app in affected_apps(paths)).lower())
