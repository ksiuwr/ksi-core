"""Promote tested images by updating the production Kubernetes manifest."""

import argparse
import json
import re
from pathlib import Path


APPS = ("server", "web", "auth", "dashboard")
# The worker Deployment runs the server image, so both move to the same digest together.
REFERENCES = {"server": 2, "web": 1, "auth": 1, "dashboard": 1}


def promote_manifest(manifest: Path, images: dict[str, str]) -> None:
    if set(images) != set(APPS):
        raise ValueError("All four application image digests are required")

    text = manifest.read_text()
    for app in APPS:
        image = images[app]
        if not re.fullmatch(
            rf"ghcr\.io/ksiuwr/ksi-core-{app}@sha256:[a-f0-9]{{64}}", image
        ):
            raise ValueError(f"Invalid immutable image for {app}")

        pattern = re.compile(
            rf"(?m)^(\s*image:\s*)"
            rf"ghcr\.io/ksiuwr/ksi-core-{app}"
            rf"(?::[^\s]+|@sha256:[a-f0-9]{{64}})(\s*)$"
        )
        text, replacements = pattern.subn(rf"\g<1>{image}\g<2>", text)
        if replacements != REFERENCES[app]:
            raise ValueError(
                f"Expected {REFERENCES[app]} image references for {app}, found {replacements}"
            )

    manifest.write_text(text)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--images", required=True, type=Path)
    args = parser.parse_args()
    promote_manifest(args.manifest, json.loads(args.images.read_text()))
