import tempfile
import unittest
from pathlib import Path

from promote_manifest import APPS, REFERENCES, promote_manifest


class PromoteManifestTest(unittest.TestCase):
    def images(self, digit="a"):
        return {
            app: f"ghcr.io/ksiuwr/ksi-core-{app}@sha256:{digit * 64}"
            for app in APPS
        }

    def manifest(self):
        containers = [(app, app) for app in APPS] + [("worker", "server")]
        return "\n---\n".join(
            f"""apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      - name: {name}
        image: ghcr.io/ksiuwr/ksi-core-{app}:old-commit
        imagePullPolicy: IfNotPresent"""
            for name, app in containers
        ) + "\n"

    def test_replaces_each_application_with_immutable_digest(self):
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / "production-platform.yaml"
            path.write_text(self.manifest())
            images = self.images()

            promote_manifest(path, images)

            promoted = path.read_text()
            for app, image in images.items():
                self.assertEqual(promoted.count(image), REFERENCES[app])
            self.assertNotIn(":old-commit", promoted)

    def test_rejects_mutable_or_incomplete_images(self):
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / "production-platform.yaml"
            path.write_text(self.manifest())
            images = self.images()
            images["web"] = "ghcr.io/ksiuwr/ksi-core-web:latest"
            with self.assertRaisesRegex(ValueError, "Invalid immutable image for web"):
                promote_manifest(path, images)

            with self.assertRaisesRegex(ValueError, "All four"):
                promote_manifest(path, {"server": self.images()["server"]})

    def test_rejects_missing_or_duplicate_manifest_references(self):
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / "production-platform.yaml"
            path.write_text(self.manifest().replace("ksi-core-web", "ksi-core-other"))
            with self.assertRaisesRegex(ValueError, "web, found 0"):
                promote_manifest(path, self.images())

            path.write_text(self.manifest() + self.manifest())
            with self.assertRaisesRegex(ValueError, "server, found 4"):
                promote_manifest(path, self.images())

    def test_rejects_manifest_without_worker(self):
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / "production-platform.yaml"
            path.write_text(self.manifest().rsplit("\n---\n", 1)[0] + "\n")
            with self.assertRaisesRegex(ValueError, "2 image references for server, found 1"):
                promote_manifest(path, self.images())


if __name__ == "__main__":
    unittest.main()
