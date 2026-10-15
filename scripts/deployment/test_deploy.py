import json
import re
import tempfile
import unittest
from pathlib import Path
from deploy import branch_slug, promote, cleanup


class DeploymentTest(unittest.TestCase):
    def test_slug_is_bounded_safe_and_collision_resistant(self):
        for branch in ['Feature/HELLO', '!!!', 'a' * 300, 'feat/zażółć', 'foo-bar']:
            slug = branch_slug(branch)
            self.assertLessEqual(len(slug + '-dashboard'), 63)
            self.assertRegex(slug, r'^[a-z0-9]+(?:-[a-z0-9]+)*$')
            self.assertEqual(slug, branch_slug(branch))
        self.assertNotEqual(branch_slug('foo/bar'), branch_slug('foo-bar'))
        self.assertNotEqual(branch_slug('Feature'), branch_slug('feature'))

    def test_release_orders_migrations_and_isolates_frontend_secrets(self):
        with tempfile.TemporaryDirectory() as root:
            cluster = Path(root)
            branch = 'feature/sso'
            slug = branch_slug(branch)
            target = cluster / 'environments' / slug
            for folder, name in [('prerequisites', 'runtime.sops.yaml'), ('database', 'password.sops.yaml')]:
                (target / folder).mkdir(parents=True)
                (target / folder / name).write_text('apiVersion: v1\nkind: Secret\nmetadata:\n  name: test\n')
            images = {app: 'ghcr.io/ksiuwr/ksi-' + app + '@sha256:' + 'a' * 64 for app in ['server', 'web', 'auth', 'dashboard']}
            promote(cluster, branch, 'b' * 40, images)
            release = json.loads((target / 'release.json').read_text())
            self.assertEqual(release['namespace'], 'ksi-' + slug)
            self.assertTrue(all(host.endswith('.ksi.edu.pl') and host.count('.') == 3 for host in release['hosts'].values()))
            flux = json.loads((target / 'flux.yaml').read_text())['items']
            self.assertEqual(flux[-1]['spec']['dependsOn'][0]['name'], slug + '-migration')
            self.assertIn('observedGeneration', flux[-1]['spec']['dependsOn'][0]['readyExpr'])
            web = json.loads((target / 'workloads' / 'web.yaml').read_text())['spec']['template']['spec']['containers'][0]
            self.assertFalse(any('secretRef' in item for item in web['envFrom']))
            self.assertEqual(web['image'], images['web'])
            cleanup(cluster, branch)
            self.assertFalse(target.exists())
            self.assertTrue((cluster / 'cleanup' / slug / 'release.json').exists())

    def test_only_production_releases_configure_cleanup_controller(self):
        with tempfile.TemporaryDirectory() as root:
            cluster = Path(root)
            preview = cluster / 'environments' / branch_slug('feature/sso')
            for folder, name in [('prerequisites', 'runtime.sops.yaml'), ('database', 'password.sops.yaml')]:
                (preview / folder).mkdir(parents=True)
                (preview / folder / name).write_text('apiVersion: v1\nkind: Secret\nmetadata:\n  name: test\n')
            (cluster / 'environments' / 'production' / 'prerequisites').mkdir(parents=True)
            (cluster / 'environments' / 'production' / 'prerequisites' / 'runtime.sops.yaml').write_text('apiVersion: v1\nkind: Secret\nmetadata:\n  name: test\n')
            controller = cluster / 'infrastructure' / 'cleanup-controller.yaml'

            def images(digit):
                return {app: 'ghcr.io/ksiuwr/ksi-' + app + '@sha256:' + digit * 64 for app in ['server', 'web', 'auth', 'dashboard']}

            promote(cluster, 'feature/sso', 'b' * 40, images('a'))
            self.assertFalse(controller.exists())
            promote(cluster, 'master', 'c' * 40, images('d'))
            cron = json.loads(controller.read_text())['items'][-1]
            self.assertEqual(cron['spec']['jobTemplate']['spec']['template']['spec']['containers'][0]['image'], images('d')['server'])
            promote(cluster, 'feature/sso', 'e' * 40, images('f'))
            cron = json.loads(controller.read_text())['items'][-1]
            self.assertEqual(cron['spec']['jobTemplate']['spec']['template']['spec']['containers'][0]['image'], images('d')['server'])

    def test_mutable_images_and_production_cleanup_rejected(self):
        with self.assertRaises(ValueError):
            cleanup(Path('/tmp'), 'master')
        with self.assertRaises(ValueError):
            promote(Path('/tmp'), 'x', 'b' * 40, {app: 'ghcr.io/ksiuwr/ksi:latest' for app in ['server', 'web', 'auth', 'dashboard']})
        with self.assertRaises(ValueError):
            branch_slug('')


if __name__ == '__main__':
    unittest.main()
