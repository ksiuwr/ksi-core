"""Render immutable GitOps releases; does not contact Kubernetes or Cloudflare."""
import argparse
import hashlib
import json
import os
import re
import shutil
from pathlib import Path


def branch_slug(branch):
    if not branch or len(branch) > 1024:
        raise ValueError('Invalid branch')
    normalized = re.sub(r'[^a-z0-9]+', '-', branch.lower()).strip('-') or 'branch'
    return f'{normalized[:35].rstrip("-")}-{hashlib.sha256(branch.encode()).hexdigest()[:10]}'


def document(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + '\n')


def resource(kind, name, spec, namespace=None, api='v1'):
    metadata = {'name': name}
    if namespace:
        metadata['namespace'] = namespace
    return {'apiVersion': api, 'kind': kind, 'metadata': metadata, 'spec': spec}


def kustomize(path, resources):
    document(path / 'kustomization.yaml', {'apiVersion': 'kustomize.config.k8s.io/v1beta1', 'kind': 'Kustomization', 'resources': resources})


def flux(name, path, dependencies=(), checks=(), prune=True):
    spec = {'interval': '1m', 'retryInterval': '30s', 'timeout': '10m', 'path': './' + path,
            'prune': prune, 'sourceRef': {'kind': 'GitRepository', 'name': 'ksi-cluster'},
            'decryption': {'provider': 'sops', 'secretRef': {'name': 'sops-age'}}}
    if dependencies:
        spec['dependsOn'] = [{'name': d} for d in dependencies]
    if checks:
        spec['healthChecks'] = checks
    return resource('Kustomization', name, spec, 'flux-system', 'kustomize.toolkit.fluxcd.io/v1')


def job(name, namespace, image, command, secret, env=None):
    container = {'name': 'job', 'image': image, 'command': command,
                 'envFrom': [{'secretRef': {'name': secret}}],
                 'resources': {'requests': {'cpu': '100m', 'memory': '128Mi'}, 'limits': {'cpu': '500m', 'memory': '512Mi'}}}
    if env:
        container['env'] = env
    return resource('Job', name, {'backoffLimit': 2, 'activeDeadlineSeconds': 600,
        'template': {'spec': {'restartPolicy': 'Never', 'automountServiceAccountToken': False,
            'containers': [container]}}}, namespace, 'batch/v1')


PROVISION_SQL = r"""set -eu
export PGHOST=preview-postgres PGUSER=postgres
export PGPASSWORD="$POSTGRES_PASSWORD"
psql -v ON_ERROR_STOP=1 -v role="$BRANCH_DATABASE" -v pw="$BRANCH_PASSWORD" postgres <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION', :'role', :'pw')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'role')\gexec
SELECT format('ALTER ROLE %I PASSWORD %L', :'role', :'pw')\gexec
SELECT format('CREATE DATABASE %I OWNER %I', :'role', :'role')
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = :'role')\gexec
SELECT format('REVOKE CONNECT ON DATABASE %I FROM PUBLIC', :'role')\gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', :'role', :'role')\gexec
SQL
"""


def promote(cluster, branch, commit, images):
    if not re.fullmatch(r'[a-f0-9]{40}', commit):
        raise ValueError('A full git commit is required')
    if set(images) != {'server', 'web', 'auth', 'dashboard'}:
        raise ValueError('All four image digests are required')
    for image in images.values():
        if not re.fullmatch(r'ghcr\.io/[a-z0-9/._-]+@sha256:[a-f0-9]{64}', image):
            raise ValueError('Images must be immutable GHCR digest references')
    production = branch == 'master'
    slug = 'production' if production else branch_slug(branch)
    namespace = 'ksi-production' if production else 'ksi-' + slug
    database = 'ksi_' + slug.replace('-', '_')
    target = cluster / 'environments' / slug
    pending_cleanup = cluster / 'cleanup' / slug
    if pending_cleanup.exists():
        raise ValueError('This branch has a cleanup record; verify cleanup completion, then remove its record before recreating it')
    # Secrets are intentionally preserved across updates.
    for directory in ['prerequisites', 'database', 'migration', 'seed', 'workloads']:
        (target / directory).mkdir(parents=True, exist_ok=True)
    hosts = {app: (f'{app}.ksi.edu.pl' if production else f'{slug}-{app}.ksi.edu.pl') for app in ['api', 'web', 'auth', 'dash', 'ws']}
    if production:
        hosts['web'] = 'ksi.edu.pl'
    config = {'NODE_ENV': 'production', 'KSI_ENVIRONMENT': slug, 'PUBLIC_WEB_ORIGIN': 'https://' + hosts['web'],
        'PUBLIC_AUTH_ORIGIN': 'https://' + hosts['auth'], 'PUBLIC_DASHBOARD_ORIGIN': 'https://' + hosts['dash'],
        'PUBLIC_API_ORIGIN': 'https://' + hosts['api'], 'PUBLIC_WS_ORIGIN': 'wss://' + hosts['ws'],
        'INTERNAL_API_ORIGIN': 'http://server:3000', 'ORIGIN': 'https://' + hosts['web'], 'PORT': '3000', 'HOST': '0.0.0.0'}
    document(target / 'release.json', {'branch': branch, 'commit': commit, 'images': images, 'namespace': namespace, 'hosts': hosts})
    prereq = target / 'prerequisites'
    namespace_doc = {'apiVersion': 'v1', 'kind': 'Namespace', 'metadata': {'name': namespace, 'labels': {'ksi.environment': slug, 'ksi.preview': 'false' if production else 'true'}}}
    document(prereq / 'namespace.yaml', namespace_doc)
    document(prereq / 'config.yaml', {'apiVersion': 'v1', 'kind': 'ConfigMap', 'metadata': {'name': 'ksi-config', 'namespace': namespace}, 'data': config})
    document(prereq / 'quota.yaml', resource('ResourceQuota', 'budget', {'hard': {'requests.cpu': '2' if production else '1', 'requests.memory': '3Gi' if production else '1536Mi', 'limits.cpu': '4', 'limits.memory': '4Gi', 'pods': '12'}}, namespace))
    secret_path = prereq / 'runtime.sops.yaml'
    if not secret_path.exists():
        raise ValueError(f'Bootstrap/encrypt {secret_path} before promoting')
    network = resource('NetworkPolicy', 'isolate-environment', {'podSelector': {}, 'policyTypes': ['Ingress', 'Egress'], 'ingress': [{'from': [{'podSelector': {}}, {'namespaceSelector': {'matchLabels': {'kubernetes.io/metadata.name': 'kube-system'}}}]}], 'egress': [{'to': [{'podSelector': {}}]}, {'to': [{'namespaceSelector': {'matchLabels': {'kubernetes.io/metadata.name': 'kube-system'}}}], 'ports': [{'protocol': 'UDP', 'port': 53}, {'protocol': 'TCP', 'port': 53}]}, {'to': [{'namespaceSelector': {'matchLabels': {'kubernetes.io/metadata.name': 'ksi-production-data' if production else 'ksi-preview-data'}}}], 'ports': [{'protocol': 'TCP', 'port': 5432}]}, {'to': [{'ipBlock': {'cidr': '0.0.0.0/0', 'except': ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '169.254.0.0/16']}}]}]}, namespace, 'networking.k8s.io/v1')
    document(prereq / 'network.yaml', network)
    kustomize(prereq, ['namespace.yaml', 'config.yaml', 'quota.yaml', 'network.yaml', 'runtime.sops.yaml'])
    database_checks = []
    if not production:
        provision = job('provision-' + slug, 'ksi-preview-data', 'postgres:17.6-alpine', ['sh', '-c', PROVISION_SQL], 'preview-postgres-admin', [{'name': 'BRANCH_DATABASE', 'value': database}, {'name': 'BRANCH_PASSWORD', 'valueFrom': {'secretKeyRef': {'name': 'db-' + slug, 'key': 'password'}}}])
        document(target / 'database' / 'provision.yaml', provision)
        if not (target / 'database' / 'password.sops.yaml').exists():
            raise ValueError('Encrypted branch database password is missing')
        kustomize(target / 'database', ['password.sops.yaml', 'provision.yaml'])
        database_checks = [{'apiVersion': 'batch/v1', 'kind': 'Job', 'name': 'provision-' + slug, 'namespace': 'ksi-preview-data'}]
    else:
        kustomize(target / 'database', [])
    migration_name = 'migrate-' + commit[:16]
    migration = job(migration_name, namespace, images['server'], ['bun', 'run', '--cwd', 'apps/server', 'db:migrate'], 'ksi-runtime')
    document(target / 'migration' / 'job.yaml', migration)
    kustomize(target / 'migration', ['job.yaml'])
    if not production:
        seed_path = target / 'seed' / 'job.yaml'
        if not seed_path.exists():
            seed_job = job('initial-seed', namespace, images['server'], ['bun', 'apps/server/src/db/seed.ts'], 'ksi-runtime')
            seed_job['spec']['template']['spec']['containers'][0]['envFrom'].append({'configMapRef': {'name': 'ksi-config'}})
            document(seed_path, seed_job)
        kustomize(target / 'seed', ['job.yaml'])
    else:
        kustomize(target / 'seed', [])
    workloads = target / 'workloads'
    docs = []
    for app in images:
        origin = hosts['dash' if app == 'dashboard' else app] if app != 'server' else hosts['api']
        container = {'name': app, 'image': images[app], 'ports': [{'containerPort': 3000}],
            'envFrom': [{'configMapRef': {'name': 'ksi-config'}}],
            'env': [{'name': 'ORIGIN', 'value': 'https://' + origin}],
            'readinessProbe': {'httpGet': {'path': '/ready', 'port': 3000}, 'initialDelaySeconds': 5} if app == 'server' else {'tcpSocket': {'port': 3000}, 'initialDelaySeconds': 5},
            'livenessProbe': {'httpGet': {'path': '/health', 'port': 3000}, 'initialDelaySeconds': 30} if app == 'server' else {'tcpSocket': {'port': 3000}, 'initialDelaySeconds': 30},
            'resources': {'requests': {'cpu': '100m', 'memory': '128Mi'}, 'limits': {'cpu': '750m', 'memory': '512Mi'}},
            'securityContext': {'allowPrivilegeEscalation': False, 'capabilities': {'drop': ['ALL']}}}
        if app == 'dashboard':
            # Uploads pass through the dashboard proxy, so match the server's 20 MiB limit plus multipart framing.
            container['env'].append({'name': 'BODY_SIZE_LIMIT', 'value': '21M'})
        # Frontends receive proxy credentials, never database/provider/R2 credentials.
        container['envFrom'].append({'secretRef': {'name': 'ksi-runtime'}}) if app == 'server' else container['env'].extend([{'name': key, 'valueFrom': {'secretKeyRef': {'name': 'ksi-runtime', 'key': key}}} for key in ['PROXY_SECRET']])
        doc = resource('Deployment', app, {'replicas': 1, 'progressDeadlineSeconds': 300,
            'strategy': {'type': 'RollingUpdate', 'rollingUpdate': {'maxUnavailable': 0, 'maxSurge': 1}},
            'selector': {'matchLabels': {'app': app}}, 'template': {'metadata': {'labels': {'app': app}},
            'spec': {'automountServiceAccountToken': False, 'containers': [container]}}}, namespace, 'apps/v1')
        document(workloads / (app + '.yaml'), doc)
        document(workloads / (app + '-service.yaml'), resource('Service', app, {'selector': {'app': app}, 'ports': [{'port': 3000, 'targetPort': 3000}]}, namespace))
        docs.extend([app + '.yaml', app + '-service.yaml'])
    rules = []
    for hostkey, service in [('api', 'server'), ('ws', 'server'), ('web', 'web'), ('auth', 'auth'), ('dash', 'dashboard')]:
        rules.append({'host': hosts[hostkey], 'http': {'paths': [{'path': '/', 'pathType': 'Prefix', 'backend': {'service': {'name': service, 'port': {'number': 3000}}}}]}})
    if production:
        backup = job('backup', namespace, images['server'], ['bun', 'apps/server/src/operator.ts', 'backup-r2'], 'ksi-runtime')['spec']
        backup['template']['spec']['containers'][0]['envFrom'].append({'configMapRef': {'name': 'ksi-config'}})
        document(workloads / 'backup.yaml', resource('CronJob', 'database-backup', {'schedule': '15 2 * * *', 'timeZone': 'Europe/Warsaw', 'concurrencyPolicy': 'Forbid', 'successfulJobsHistoryLimit': 1, 'failedJobsHistoryLimit': 3, 'jobTemplate': {'spec': backup}}, namespace, 'batch/v1'))
        docs.append('backup.yaml')
    worker = resource('Deployment', 'worker', {'replicas': 1, 'selector': {'matchLabels': {'app': 'worker'}}, 'template': {'metadata': {'labels': {'app': 'worker'}}, 'spec': {'automountServiceAccountToken': False, 'containers': [{'name': 'worker', 'image': images['server'], 'command': ['bun', 'apps/server/src/worker.ts'], 'envFrom': [{'configMapRef': {'name': 'ksi-config'}}, {'secretRef': {'name': 'ksi-runtime'}}], 'resources': {'requests': {'cpu': '50m', 'memory': '128Mi'}, 'limits': {'cpu': '500m', 'memory': '512Mi'}}}]}}}, namespace, 'apps/v1')
    document(workloads / 'worker.yaml', worker)
    docs.append('worker.yaml')
    document(workloads / 'ingress.yaml', resource('Ingress', 'ksi', {'ingressClassName': 'traefik', 'rules': rules}, namespace, 'networking.k8s.io/v1'))
    docs.append('ingress.yaml')
    kustomize(workloads, docs)
    definitions = [flux(slug + '-prerequisites', f'environments/{slug}/prerequisites'),
        flux(slug + '-database', f'environments/{slug}/database', [slug + '-prerequisites', 'ksi-infrastructure'], database_checks),
        flux(slug + '-migration', f'environments/{slug}/migration', [slug + '-database'], [{'apiVersion': 'batch/v1', 'kind': 'Job', 'name': migration_name, 'namespace': namespace}]),
        flux(slug + '-workloads', f'environments/{slug}/workloads', [slug + '-migration'] + ([] if production else [slug + '-seed']), [{'apiVersion': 'apps/v1', 'kind': 'Deployment', 'name': app, 'namespace': namespace} for app in images])]
    if not production:
        definitions.insert(-1, flux(slug + '-seed', f'environments/{slug}/seed', [slug + '-migration'], [{'apiVersion': 'batch/v1', 'kind': 'Job', 'name': 'initial-seed', 'namespace': namespace}]))
    for definition in definitions:
        definition['metadata']['labels'] = {'ksi.release': commit}
        for dependency in definition['spec'].get('dependsOn', []):
            if dependency['name'].startswith(slug + '-'):
                dependency['readyExpr'] = "dep.metadata.labels['ksi.release'] == self.metadata.labels['ksi.release'] && dep.metadata.generation == dep.status.observedGeneration && dep.status.conditions.exists(c, c.type == 'Ready' && c.status == 'True')"
    document(target / 'flux.yaml', {'apiVersion': 'v1', 'kind': 'List', 'items': definitions})
    if production:
        # The cleanup job holds preview database and DNS credentials, so it only runs images built from master.
        configure_cleanup_controller(cluster, images['server'])
    refresh(cluster)
    return slug


def configure_cleanup_controller(cluster, image):
    namespace = 'ksi-preview-data'
    account = {'apiVersion': 'v1', 'kind': 'ServiceAccount', 'metadata': {'name': 'preview-cleanup', 'namespace': namespace}}
    role = resource('ClusterRole', 'ksi-preview-cleanup', {}, api='rbac.authorization.k8s.io/v1')
    role.pop('spec')
    role['rules'] = [{'apiGroups': [''], 'resources': ['namespaces'], 'verbs': ['get']}]
    binding = {'apiVersion': 'rbac.authorization.k8s.io/v1', 'kind': 'ClusterRoleBinding', 'metadata': {'name': 'ksi-preview-cleanup'}, 'roleRef': {'apiGroup': 'rbac.authorization.k8s.io', 'kind': 'ClusterRole', 'name': 'ksi-preview-cleanup'}, 'subjects': [{'kind': 'ServiceAccount', 'name': 'preview-cleanup', 'namespace': namespace}]}
    local_role = {'apiVersion': 'rbac.authorization.k8s.io/v1', 'kind': 'Role', 'metadata': {'name': 'preview-cleanup', 'namespace': namespace}, 'rules': [{'apiGroups': [''], 'resources': ['configmaps'], 'verbs': ['get', 'list', 'patch']}]}
    local_binding = {'apiVersion': 'rbac.authorization.k8s.io/v1', 'kind': 'RoleBinding', 'metadata': {'name': 'preview-cleanup', 'namespace': namespace}, 'roleRef': {'apiGroup': 'rbac.authorization.k8s.io', 'kind': 'Role', 'name': 'preview-cleanup'}, 'subjects': [{'kind': 'ServiceAccount', 'name': 'preview-cleanup', 'namespace': namespace}]}
    template = job('cleanup', namespace, image, ['bun', 'scripts/deployment/cleanup.ts'], 'preview-cleanup')['spec']
    template['template']['spec']['serviceAccountName'] = 'preview-cleanup'
    template['template']['spec']['automountServiceAccountToken'] = True
    template['template']['spec']['containers'][0]['envFrom'].append({'secretRef': {'name': 'preview-postgres-admin'}})
    cron = resource('CronJob', 'preview-cleanup', {'schedule': '*/15 * * * *', 'concurrencyPolicy': 'Forbid', 'successfulJobsHistoryLimit': 1, 'failedJobsHistoryLimit': 3, 'jobTemplate': {'spec': template}}, namespace, 'batch/v1')
    document(cluster / 'infrastructure' / 'cleanup-controller.yaml', {'apiVersion': 'v1', 'kind': 'List', 'items': [account, role, binding, local_role, local_binding, cron]})
    path = cluster / 'infrastructure' / 'kustomization.yaml'
    if path.exists():
        k = json.loads(path.read_text())
        if 'cleanup-controller.yaml' not in k['resources']:
            k['resources'].append('cleanup-controller.yaml')
        document(path, k)


def refresh(cluster):
    paths = sorted(str(p.relative_to(cluster / 'environments')) for p in (cluster / 'environments').glob('*/flux.yaml'))
    kustomize(cluster / 'environments', paths)
    cleanup_root = cluster / 'cleanup'
    kustomize(cleanup_root, sorted(p.name for p in cleanup_root.glob('*/kustomization.yaml') for p in [p.parent]))


def cleanup(cluster, branch):
    if branch == 'master':
        raise ValueError('Production cleanup is prohibited')
    slug = branch_slug(branch)
    target = cluster / 'environments' / slug
    if target.exists():
        # Drop only after Flux workloads have been pruned. Operator/controller verifies this before running cleanup.
        destination = cluster / 'cleanup' / slug
        destination.mkdir(parents=True, exist_ok=True)
        shutil.copy(target / 'release.json', destination / 'release.json')
        document(destination / 'queue.yaml', {'apiVersion': 'v1', 'kind': 'ConfigMap', 'metadata': {'name': 'cleanup-' + slug, 'namespace': 'ksi-preview-data', 'labels': {'ksi.cleanup': 'true'}}, 'data': {'release': (target / 'release.json').read_text()}})
        kustomize(destination, ['queue.yaml'])
        shutil.rmtree(target)
    refresh(cluster)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['slug', 'promote', 'cleanup'])
    parser.add_argument('--branch', required=True)
    parser.add_argument('--cluster', type=Path)
    parser.add_argument('--commit')
    parser.add_argument('--images', type=Path)
    args = parser.parse_args()
    if args.action == 'slug':
        print(branch_slug(args.branch))
    elif args.action == 'cleanup':
        cleanup(args.cluster, args.branch)
    else:
        print(promote(args.cluster, args.branch, args.commit, json.loads(args.images.read_text())))
