// Values from .env.example are public, so they must never protect a production deployment.
const examples: Record<string, string> = {
  BETTER_AUTH_SECRET: 'better_auth_secret_goes_here',
  PROXY_SECRET: 'local-proxy-secret',
  KSI_BOOTSTRAP_PASSWORD: 'initial-admin-password',
  KSI_BACKUP_KEY: 'backup-encryption-key-at-least-32-chars'
};
export function rejectExampleSecrets(names: string[]) {
  if (Bun.env.NODE_ENV !== 'production') return;
  for (const name of names)
    if (Bun.env[name] === examples[name])
      throw new Error(`${name} still has its .env.example value`);
}
