import { resolve } from 'node:path';
import { unlink, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { uploadEncryptedBackup, retainEncryptedBackups } from './lib/storage';
import { and, eq, sql } from 'drizzle-orm';
import { db, auditEvents, outbox, sessions, users } from './db';
import { auth } from './lib/auth';
import { effectivePermissions, type Role } from './domain/permissions';
import { anonymizeUser, manageUser } from './services/users';
import { getUrls } from 'shared';

const help = `Execute the KSI operator inside the target namespace with its runtime Secret.
Usage: bun apps/server/src/operator.ts COMMAND --option value
 bootstrap       --email address --name name             KSI_BOOTSTRAP_PASSWORD required; only before the first active administrator
 create-admin    --actor id --email address --name name  KSI_BOOTSTRAP_PASSWORD required
 activate        --actor id --user id
 role            --actor id --user id --role member|board|administrator
 suspend         --actor id --user id
 revoke-sessions --actor id --user id
 reset-link      --actor id --user id                     queues reset email; never prints its token
 anonymize       --actor id --user id --confirm anonymize:USER_ID
 migrate                                                 executes versioned Drizzle migrations
 seed                                                    development/preview only
 backup-r2                                               encrypted backup to private R2; 14-day retention
 backup          --file /path/backup.enc                  KSI_BACKUP_KEY required
 restore         --file /path/backup.enc --confirm restore:ENVIRONMENT
Requires pg_dump/pg_restore and openssl for backups. Backup files are encrypted custom-format dumps.
Passwords/backup keys are environment inputs, never command-line arguments. No command resets a database implicitly.`;
export function parseOperatorArguments(args: string[]) {
  const [command = 'help', ...rest] = args;
  const options: Record<string, string> = {};
  for (let i = 0; i < rest.length; i += 2) {
    const key = rest[i],
      value = rest[i + 1];
    if (
      !key?.startsWith('--') ||
      !value ||
      value.startsWith('--') ||
      options[key.slice(2)] !== undefined
    )
      throw new Error('INVALID_ARGUMENTS');
    options[key.slice(2)] = value;
  }
  return { command, options };
}
function need(options: Record<string, string>, key: string) {
  const value = options[key];
  if (!value) throw new Error(`MISSING_${key.toUpperCase()}`);
  return value;
}
async function administrator(actorId: string) {
  const [actor] = await db.select().from(users).where(eq(users.id, actorId));
  if (
    !actor ||
    actor.membershipStatus !== 'active' ||
    actor.role !== 'administrator' ||
    !effectivePermissions(actor).has('users.accounts.anonymize')
  )
    throw new Error('FORBIDDEN');
  return actor;
}
async function newAccount(options: Record<string, string>) {
  const email = need(options, 'email');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('INVALID_EMAIL');
  const password = Bun.env.KSI_BOOTSTRAP_PASSWORD;
  if (!password || password.length < 12) throw new Error('KSI_BOOTSTRAP_PASSWORD_MIN_12');
  const result = await auth.api.signUpEmail({
    body: { email, password, name: need(options, 'name') }
  });
  return result.user.id;
}
function databaseEnvironment() {
  const url = new URL(Bun.env.DATABASE_URL ?? '');
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.pathname === '/')
    throw new Error('INVALID_DATABASE_URL');
  return {
    ...process.env,
    PGHOST: url.hostname,
    PGPORT: url.port || '5432',
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
    PGSSLMODE:
      url.searchParams.get('sslmode') ?? (Bun.env.NODE_ENV === 'production' ? 'require' : 'prefer')
  };
}
async function backup(file: string) {
  if (!Bun.env.KSI_BACKUP_KEY || Bun.env.KSI_BACKUP_KEY.length < 32)
    throw new Error('KSI_BACKUP_KEY_MIN_32');
  const dump = Bun.spawn(['pg_dump', '--format=custom', '--no-owner', '--no-privileges'], {
    env: databaseEnvironment(),
    stdout: 'pipe',
    stderr: 'pipe'
  });
  const encrypt = Bun.spawn(
    [
      'openssl',
      'enc',
      '-aes-256-cbc',
      '-salt',
      '-pbkdf2',
      '-iter',
      '200000',
      '-pass',
      'env:KSI_BACKUP_KEY',
      '-out',
      file
    ],
    { stdin: dump.stdout, stdout: 'ignore', stderr: 'pipe' }
  );
  // Drain diagnostic streams without printing them: external tools may include credentials in errors.
  const [dumpCode, encryptionCode] = await Promise.all([
    dump.exited,
    encrypt.exited,
    new Response(dump.stderr).text(),
    new Response(encrypt.stderr).text()
  ]);
  if (dumpCode || encryptionCode) {
    await unlink(file).catch(() => {});
    throw new Error('BACKUP_FAILED');
  }
}
async function restore(file: string) {
  if (!Bun.env.KSI_BACKUP_KEY || Bun.env.KSI_BACKUP_KEY.length < 32)
    throw new Error('KSI_BACKUP_KEY_MIN_32');
  const decrypt = Bun.spawn(
    [
      'openssl',
      'enc',
      '-d',
      '-aes-256-cbc',
      '-pbkdf2',
      '-iter',
      '200000',
      '-pass',
      'env:KSI_BACKUP_KEY',
      '-in',
      file
    ],
    { stdout: 'pipe', stderr: 'pipe' }
  );
  const restoreProcess = Bun.spawn(
    [
      'pg_restore',
      '--clean',
      '--if-exists',
      '--no-owner',
      '--no-privileges',
      '--exit-on-error',
      '--single-transaction',
      '--dbname',
      databaseEnvironment().PGDATABASE
    ],
    { env: databaseEnvironment(), stdin: decrypt.stdout, stdout: 'ignore', stderr: 'pipe' }
  );
  const [decryptionCode, restoreCode] = await Promise.all([
    decrypt.exited,
    restoreProcess.exited,
    new Response(decrypt.stderr).text(),
    new Response(restoreProcess.stderr).text()
  ]);
  if (decryptionCode || restoreCode) throw new Error('RESTORE_FAILED');
}
async function record(
  actorId: string,
  action: string,
  targetId: string,
  operation: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<void>
) {
  await db.transaction(async (tx) => {
    await operation(tx);
    const [event] = await tx.insert(auditEvents).values({ actorId, targetId, action }).returning();
    await tx.insert(outbox).values({ eventId: event!.id });
  });
}
export async function runOperator(args: string[]) {
  const { command, options } = parseOperatorArguments(args);
  if (command === 'help' || command === '--help') {
    console.log(help);
    return;
  }
  if (command === 'backup-r2') {
    const directory = await mkdtemp(resolve(tmpdir(), 'ksi-backup-'));
    try {
      const file = resolve(directory, 'database.enc');
      await backup(file);
      const key = await uploadEncryptedBackup(file);
      await retainEncryptedBackups();
      console.log(JSON.stringify({ key }));
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
    return;
  }
  if (command === 'backup') {
    await backup(need(options, 'file'));
    return;
  }
  if (command === 'restore') {
    if (need(options, 'confirm') !== `restore:${getUrls().environment}`)
      throw new Error('RESTORE_CONFIRMATION_MISMATCH');
    await restore(need(options, 'file'));
    return;
  }
  if (command === 'migrate' || command === 'seed') {
    if (command === 'seed' && getUrls().environment === 'production')
      throw new Error('PRODUCTION_SEED_FORBIDDEN');
    const child = Bun.spawn(
      command === 'migrate' ? ['bun', 'run', 'db:migrate'] : ['bun', 'run', 'src/db/seed.ts'],
      { cwd: resolve(import.meta.dir, '..'), stdout: 'inherit', stderr: 'inherit' }
    );
    if (await child.exited) throw new Error(`${command.toUpperCase()}_FAILED`);
    return;
  }
  if (command === 'bootstrap') {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, 'administrator'), eq(users.membershipStatus, 'active')))
      .limit(1);
    if (existing.length) throw new Error('ADMIN_ALREADY_EXISTS');
    const id = await newAccount(options);
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(842501)`);
      const admins = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.role, 'administrator'), eq(users.membershipStatus, 'active')));
      if (admins.length) throw new Error('ADMIN_ALREADY_EXISTS');
      await tx
        .update(users)
        .set({ role: 'administrator', membershipStatus: 'active', emailVerified: true })
        .where(eq(users.id, id));
      const [event] = await tx
        .insert(auditEvents)
        .values({ actorId: id, targetId: id, action: 'operator.administrator.bootstrapped' })
        .returning();
      await tx.insert(outbox).values({ eventId: event!.id });
    });
    console.log(JSON.stringify({ userId: id }));
    return;
  }
  const actorId = need(options, 'actor');
  if (command === 'activate') {
    await manageUser(actorId, need(options, 'user'), { membershipStatus: 'active' });
    return;
  }
  if (command === 'role') {
    const role = need(options, 'role');
    if (!['member', 'board', 'administrator'].includes(role)) throw new Error('INVALID_ROLE');
    await manageUser(actorId, need(options, 'user'), { role: role as Role });
    return;
  }
  if (command === 'suspend') {
    await manageUser(actorId, need(options, 'user'), { membershipStatus: 'suspended' });
    return;
  }
  await administrator(actorId);
  if (command === 'create-admin') {
    const userId = await newAccount(options);
    await manageUser(actorId, userId, { role: 'administrator', membershipStatus: 'active' });
    console.log(JSON.stringify({ userId }));
    return;
  }
  const userId = need(options, 'user');
  const [target] = await db.select().from(users).where(eq(users.id, userId));
  if (!target || target.membershipStatus === 'deleted') throw new Error('USER_NOT_FOUND');
  if (command === 'revoke-sessions') {
    await record(actorId, 'operator.sessions.revoked', userId, async (tx) => {
      await tx.delete(sessions).where(eq(sessions.userId, userId));
    });
    return;
  }
  if (command === 'reset-link') {
    await auth.api.requestPasswordReset({
      body: { email: target.email, redirectTo: `${getUrls().frontend.auth}/reset-password` }
    });
    await record(actorId, 'operator.password-reset.queued', userId, async () => {});
    return;
  }
  if (command === 'anonymize') {
    if (need(options, 'confirm') !== `anonymize:${userId}`)
      throw new Error('ANONYMIZATION_CONFIRMATION_MISMATCH');
    await anonymizeUser(actorId, userId);
    return;
  }
  throw new Error('UNKNOWN_COMMAND');
}
if (import.meta.main) {
  try {
    await runOperator(Bun.argv.slice(2));
    console.log(JSON.stringify({ status: 'complete' }));
    process.exit(0);
  } catch (error) {
    const code =
      error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)
        ? error.message
        : 'OPERATION_FAILED';
    console.error(JSON.stringify({ status: 'failed', code }));
    process.exit(1);
  }
}
