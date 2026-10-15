import json
import tempfile
import unittest
from pathlib import Path

from preview import APPS, NAMESPACE, branch_slug, render, render_cleanup


class PreviewTest(unittest.TestCase):
    def valid_images(self):
        return {
            app: f"ghcr.io/ksiuwr/ksi-core-{app}@sha256:{str(index) * 64}"
            for index, app in enumerate(APPS, 1)
        }

    def test_slug_is_stable_safe_and_not_production(self):
        slug = branch_slug("Feature/Preview")
        self.assertRegex(slug, r"^[a-z0-9-]+-[a-f0-9]{10}$")
        self.assertEqual(slug, branch_slug("Feature/Preview"))
        with self.assertRaises(ValueError):
            branch_slug("master")

    def test_render_is_namespace_scoped_and_uses_digests(self):
        with tempfile.TemporaryDirectory() as root:
            output = Path(root)
            images = self.valid_images()
            slug = render("feature/preview", "a" * 40, images, output)
            release = json.loads((output / "release.json").read_text())
            self.assertEqual(release["slug"], slug)
            workloads = json.loads((output / "workloads.json").read_text())["items"]
            self.assertTrue(all(item["metadata"]["namespace"] == NAMESPACE for item in workloads))
            deployments = [item for item in workloads if item["kind"] == "Deployment"]
            self.assertEqual(len(deployments), 4)
            self.assertEqual(
                {item["spec"]["template"]["spec"]["containers"][0]["image"] for item in deployments},
                set(images.values()),
            )
            self.assertTrue(
                all(
                    item["spec"]["template"]["spec"]["containers"][0]["securityContext"]
                    ["runAsUser"]
                    == 1000
                    for item in deployments
                )
            )
            ingress = next(item for item in workloads if item["kind"] == "Ingress")
            self.assertEqual(ingress["spec"]["ingressClassName"], "nginx")
            self.assertTrue(all(rule["host"].startswith(slug + "-") for rule in ingress["spec"]["rules"]))
            self.assertEqual(set(ingress["spec"]["tls"][0]["hosts"]), set(release["hosts"].values()))
            seed = json.loads((output / "seed.json").read_text())
            env_from = seed["spec"]["template"]["spec"]["containers"][0]["envFrom"]
            self.assertIn({"configMapRef": {"name": f"config-{slug}"}}, env_from)
            migration = json.loads((output / "migration.json").read_text())
            migration_security = migration["spec"]["template"]["spec"]["containers"][0][
                "securityContext"
            ]
            self.assertEqual(migration_security["runAsUser"], 1000)
            self.assertEqual(migration_security["runAsGroup"], 1000)

    def test_cleanup_targets_only_the_branch_database(self):
        with tempfile.TemporaryDirectory() as root:
            output = Path(root) / "cleanup.json"
            slug = render_cleanup("feature/preview", output)
            cleanup = json.loads(output.read_text())
            self.assertEqual(cleanup["metadata"]["labels"], {"ksi.preview": slug})
            command = cleanup["spec"]["template"]["spec"]["containers"][0]["command"][-1]
            self.assertIn("DROP DATABASE IF EXISTS", command)
            self.assertIn("DROP ROLE IF EXISTS", command)

    def test_mutable_images_are_rejected(self):
        with tempfile.TemporaryDirectory() as root:
            images = self.valid_images()
            images["web"] = "ghcr.io/ksiuwr/ksi-core-web:latest"
            with self.assertRaisesRegex(ValueError, "Invalid immutable image for web"):
                render("feature/preview", "a" * 40, images, Path(root))


if __name__ == "__main__":
    unittest.main()
