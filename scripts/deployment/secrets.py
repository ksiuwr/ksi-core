"""Encrypt runtime secrets for GitOps. Requires sops and only its public recipient.

Never prints secret material. Reuses an existing preview password on promotion.
"""
import argparse
import base64
import json
import os
import subprocess
import urllib.parse
from pathlib import Path
from deploy import branch_slug

REQUIRED = ['BETTER_AUTH_SECRET', 'PROXY_SECRET', 'OAUTH_GITHUB_ID', 'OAUTH_GITHUB_SECRET',
            'OAUTH_GOOGLE_ID', 'OAUTH_GOOGLE_SECRET']
OPTIONAL = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_FROM', 'SMTP_USER', 'SMTP_PASSWORD', 'R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_PRIVATE_BUCKET', 'R2_PUBLIC_BUCKET', 'R2_PUBLIC_ORIGIN', 'ACTIVATION_CONTACT', 'KSI_BACKUP_KEY']


def token_urlsafe(length):
    # This file's name shadows the standard library secrets module, which offers the same.
    return base64.urlsafe_b64encode(os.urandom(length)).rstrip(b'=').decode('ascii')


def encrypt(path, namespace, name, values, recipient):
    payload = {'apiVersion': 'v1', 'kind': 'Secret', 'metadata': {'name': name, 'namespace': namespace}, 'type': 'Opaque', 'stringData': values}
    result = subprocess.run(['sops', '--encrypt', '--age', recipient, '--encrypted-regex', '^(data|stringData)$', '--input-type', 'json', '--output-type', 'yaml', '/dev/stdin'], input=json.dumps(payload), text=True, capture_output=True)
    if result.returncode:
        raise RuntimeError('SOPS encryption failed; no secret output is logged')
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(result.stdout)


def bootstrap(cluster, branch, recipient):
    slug = 'production' if branch == 'master' else branch_slug(branch)
    path = cluster / 'environments' / slug / 'prerequisites' / 'runtime.sops.yaml'
    if path.exists():
        return  # Preserve branch password/session authority across builds.
    missing = [key for key in REQUIRED if not os.environ.get(key)]
    if missing:
        raise ValueError('Missing configuration: ' + ', '.join(missing))
    values = {key: os.environ[key] for key in REQUIRED + OPTIONAL if os.environ.get(key)}
    if branch == 'master':
        values['DATABASE_URL'] = os.environ['DATABASE_URL']
    else:
        password = token_urlsafe(40)
        database = 'ksi_' + slug.replace('-', '_')
        values['DATABASE_URL'] = f'postgresql://{database}:{urllib.parse.quote(password)}@preview-postgres.ksi-preview-data.svc.cluster.local:5432/{database}'
        # Per-environment session and proxy authorities, regardless of shared preview provider IDs.
        values['BETTER_AUTH_SECRET'] = token_urlsafe(48)
        values['PROXY_SECRET'] = token_urlsafe(48)
        encrypt(cluster / 'environments' / slug / 'database' / 'password.sops.yaml', 'ksi-preview-data', 'db-' + slug, {'password': password}, recipient)
    encrypt(path, 'ksi-' + slug, 'ksi-runtime', values, recipient)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--cluster', required=True, type=Path)
    parser.add_argument('--branch', required=True)
    args = parser.parse_args()
    bootstrap(args.cluster, args.branch, os.environ['SOPS_AGE_RECIPIENT'])
