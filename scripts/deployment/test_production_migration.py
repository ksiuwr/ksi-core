import json
import subprocess
import unittest
from pathlib import Path
from unittest.mock import patch

from production_migration import JOB_NAME, NAMESPACE, migrate, migration_job


COMMIT = "a" * 40
IMAGE = "ghcr.io/ksiuwr/ksi-core-server@sha256:" + "b" * 64


class ProductionMigrationTest(unittest.TestCase):
    def test_job_uses_release_image_and_existing_runtime_secret(self):
        job = migration_job(COMMIT, IMAGE)
        self.assertEqual(job["metadata"]["namespace"], "ksi-production")
        self.assertEqual(job["metadata"]["labels"]["ksi.commit"], COMMIT)
        pod = job["spec"]["template"]["spec"]
        self.assertFalse(pod["automountServiceAccountToken"])
        self.assertEqual(pod["restartPolicy"], "Never")
        container = pod["containers"][0]
        self.assertEqual(container["image"], IMAGE)
        self.assertEqual(container["command"], ["bun", "run", "--cwd", "apps/server", "db:migrate"])
        self.assertEqual(container["envFrom"], [{"secretRef": {"name": "ksi-runtime"}}])
        self.assertTrue(container["securityContext"]["runAsNonRoot"])
        self.assertEqual(job["spec"]["backoffLimit"], 0)
        self.assertEqual(job["spec"]["activeDeadlineSeconds"], 600)

    def test_invalid_release_is_rejected_before_cluster_access(self):
        with patch("production_migration.subprocess.run") as run:
            for commit, image in [("short", IMAGE), (COMMIT, "ghcr.io/ksiuwr/ksi-core-server:latest"), (COMMIT, IMAGE.replace("server", "web"))]:
                with self.assertRaises(ValueError):
                    migrate(commit, image)
            run.assert_not_called()

    def test_retry_recreates_job_before_waiting_for_current_release(self):
        with patch("production_migration.subprocess.run") as run:
            migrate(COMMIT, IMAGE)
        delete, create, wait = run.call_args_list
        self.assertEqual(delete.args[0][:6], ["kubectl", "-n", NAMESPACE, "delete", "job", JOB_NAME])
        self.assertIn("--cascade=foreground", delete.args[0])
        self.assertIn("--wait=true", delete.args[0])
        self.assertEqual(create.args[0], ["kubectl", "-n", NAMESPACE, "create", "-f", "-"])
        self.assertEqual(json.loads(create.kwargs["input"]), migration_job(COMMIT, IMAGE))
        self.assertIn(f"job/{JOB_NAME}", wait.args[0])
        self.assertIn("--for=condition=complete", wait.args[0])
        self.assertTrue(all(call.kwargs["check"] for call in run.call_args_list))

    def test_cluster_failures_stop_migration_and_propagate_to_workflow(self):
        for failure_index in range(3):
            with self.subTest(failure_index=failure_index):
                results = [None] * failure_index + [subprocess.CalledProcessError(1, "kubectl")]
                with patch("production_migration.subprocess.run", side_effect=results) as run:
                    with self.assertRaises(subprocess.CalledProcessError):
                        migrate(COMMIT, IMAGE)
                    self.assertEqual(run.call_count, failure_index + 1)

    def test_workflow_gates_promotion_and_rollout_on_migration(self):
        workflow = (Path(__file__).resolve().parents[2] / ".github/workflows/platform.yml").read_text()
        promotion = workflow[workflow.index("  promote:"):]
        self.assertLess(promotion.index("Configure production-only cluster access"), promotion.index("Migrate production database"))
        self.assertLess(promotion.index("Migrate production database"), promotion.index("Reject stale runs and commit promotion"))
        self.assertLess(promotion.index("Reject stale runs and commit promotion"), promotion.index("Apply production manifest and wait for rollout"))
        migration_step = promotion[promotion.index("      - name: Migrate production database"):promotion.index("      - name: Reject stale runs and commit promotion")]
        self.assertNotIn("continue-on-error", migration_step)
        self.assertNotIn("|| true", migration_step)


if __name__ == "__main__":
    unittest.main()
