import unittest

from image_plan import APPS, affected_apps


class ImagePlanTest(unittest.TestCase):
    def test_frontend_change_rebuilds_only_that_frontend(self):
        self.assertEqual(affected_apps(["apps/web/src/routes/+page.svelte"]), {"web"})

    def test_ui_change_rebuilds_all_frontends(self):
        self.assertEqual(affected_apps(["packages/ui/src/lib/button.svelte"]), {
            "web",
            "auth",
            "dashboard",
        })

    def test_server_and_shared_changes_rebuild_everything(self):
        self.assertEqual(affected_apps(["apps/server/src/index.ts"]), set(APPS))
        self.assertEqual(affected_apps(["packages/shared/index.ts"]), set(APPS))

    def test_lockfile_and_image_runtime_changes_rebuild_everything(self):
        self.assertEqual(affected_apps(["bun.lock"]), set(APPS))
        self.assertEqual(
            affected_apps(["scripts/deployment/start.sh"]),
            set(APPS),
        )

    def test_docs_and_workflow_changes_reuse_images(self):
        self.assertEqual(
            affected_apps(["README.md", ".github/workflows/platform.yml"]),
            set(),
        )


if __name__ == "__main__":
    unittest.main()
