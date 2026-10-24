import { contentChanges } from 'shared/activity';
import { recordEvent } from '../../lib/audit';
import { and, eq } from 'drizzle-orm';
import { status, t } from 'elysia';
import {
  createCipheriv,
  createDecipheriv,
  createPublicKey,
  randomBytes,
  verify as verifySignature
} from 'node:crypto';
import { createElysia } from '../../lib/createElysia';
import {
  previewCredentials,
  projectGroupMembers,
  projectGroups,
  projectMembers,
  projects
} from '../../db';
import { permissionKeys, type Permission } from '../../domain/permissions';

let cachedKeys: { expiresAt: number; keys: Record<string, unknown>[] } | null = null;
async function verifyOidc(
  token: string,
  expectedAudience: string,
  workflow: 'platform' | 'cleanup' = 'platform'
) {
  const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');
  if (!encodedHeader || !encodedPayload || !encodedSignature)
    throw status(401, { code: 'INVALID_WORKFLOW_TOKEN' });
  let header: Record<string, unknown>, claims: Record<string, unknown>;
  try {
    header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8'));
    claims = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch {
    throw status(401, { code: 'INVALID_WORKFLOW_TOKEN' });
  }
  if (header.alg !== 'RS256' || typeof header.kid !== 'string')
    throw status(401, { code: 'INVALID_WORKFLOW_TOKEN' });
  if (!cachedKeys || cachedKeys.expiresAt < Date.now()) {
    const response = await fetch('https://token.actions.githubusercontent.com/.well-known/jwks');
    if (!response.ok) throw status(503, { code: 'WORKFLOW_IDENTITY_UNAVAILABLE' });
    const data = (await response.json()) as { keys: Record<string, unknown>[] };
    cachedKeys = { keys: data.keys, expiresAt: Date.now() + 60 * 60 * 1000 };
  }
  const jwk = cachedKeys.keys.find((key) => key.kid === header.kid);
  if (!jwk) throw status(401, { code: 'INVALID_WORKFLOW_TOKEN' });
  const signed = `${encodedHeader}.${encodedPayload}`;
  if (
    !verifySignature(
      'RSA-SHA256',
      Buffer.from(signed),
      createPublicKey({ key: jwk, format: 'jwk' } as Parameters<typeof createPublicKey>[0]),
      Buffer.from(encodedSignature, 'base64url')
    )
  )
    throw status(401, { code: 'INVALID_WORKFLOW_TOKEN' });
  const now = Math.floor(Date.now() / 1000);
  const configuredAudience = Bun.env.PREVIEW_CREDENTIALS_OIDC_AUDIENCE;
  const expectedWorkflow = `ksiuwr/ksi-core/.github/workflows/${workflow === 'platform' ? 'platform' : 'cleanup'}.yml@`;
  const eventAllowed =
    workflow === 'platform'
      ? claims.event_name === 'push'
      : ['delete', 'pull_request_target'].includes(String(claims.event_name));
  if (
    !configuredAudience ||
    expectedAudience !== configuredAudience ||
    claims.iss !== 'https://token.actions.githubusercontent.com' ||
    claims.aud !== configuredAudience ||
    claims.repository !== 'ksiuwr/ksi-core' ||
    claims.environment !== 'preview' ||
    !eventAllowed ||
    typeof claims.workflow_ref !== 'string' ||
    !claims.workflow_ref.startsWith(expectedWorkflow) ||
    typeof claims.exp !== 'number' ||
    claims.exp < now ||
    typeof claims.iat !== 'number' ||
    claims.iat > now + 30
  )
    throw status(403, { code: 'WORKFLOW_IDENTITY_NOT_ALLOWED' });
}

function encryptionKey() {
  const encoded = Bun.env.PREVIEW_CREDENTIALS_ENCRYPTION_KEY;
  if (!encoded) throw status(503, { code: 'PREVIEW_CREDENTIAL_STORAGE_DISABLED' });
  const key = Buffer.from(encoded, 'base64');
  if (key.length !== 32) throw status(503, { code: 'PREVIEW_CREDENTIAL_STORAGE_DISABLED' });
  return key;
}
function encryptAccounts(value: { email: string; password: string }[], context: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  cipher.setAAD(Buffer.from(context));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}
function decryptAccounts(value: string, context: string) {
  const data = Buffer.from(value, 'base64url');
  if (data.length < 29) throw status(500, { code: 'PREVIEW_CREDENTIAL_DECRYPTION_FAILED' });
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), data.subarray(0, 12));
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(data.subarray(12, 28));
  try {
    return JSON.parse(
      Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString('utf8')
    ) as { email: string; password: string }[];
  } catch {
    throw status(500, { code: 'PREVIEW_CREDENTIAL_DECRYPTION_FAILED' });
  }
}

const accounts = t.Array(
  t.Object({
    email: t.String({ minLength: 1, maxLength: 254 }),
    password: t.String({ minLength: 12, maxLength: 200 })
  }),
  { minItems: 1, maxItems: 20 }
);

export const previewCredentialRoutes = createElysia({ prefix: '/platform' })
  .post(
    '/internal/projects/:slug/previews/:previewId/credentials',
    async ({ db, params, headers, body }) => {
      const authorization = headers.authorization;
      if (!authorization?.startsWith('Bearer '))
        throw status(401, { code: 'WORKFLOW_TOKEN_REQUIRED' });
      await verifyOidc(authorization.slice(7), body.audience);
      if (
        !/^[a-z0-9][a-z0-9-]{0,50}$/.test(params.previewId) ||
        !body.branch.trim() ||
        body.branch.length > 128
      )
        throw status(422, { code: 'INVALID_PREVIEW_BRANCH' });
      const [project] = await db
        .select({ id: projects.id, slug: projects.slug })
        .from(projects)
        .where(eq(projects.slug, params.slug));
      if (!project || project.slug !== 'ksi-core') throw status(404, { code: 'PROJECT_NOT_FOUND' });
      await db.transaction(async (tx) => {
        await tx
          .select({ id: projects.id })
          .from(projects)
          .where(eq(projects.id, project.id))
          .for('update');
        const [existing] = await tx
          .select()
          .from(previewCredentials)
          .where(
            and(
              eq(previewCredentials.projectId, project.id),
              eq(previewCredentials.previewId, params.previewId)
            )
          );
        const data = {
          projectId: project.id,
          previewId: params.previewId,
          branch: body.branch,
          commit: body.commit,
          previewUrl: body.previewUrl,
          accounts: encryptAccounts(body.accounts, `${project.id}:${params.previewId}`),
          updatedAt: new Date()
        };
        if (existing)
          await tx
            .update(previewCredentials)
            .set(data)
            .where(eq(previewCredentials.id, existing.id));
        else await tx.insert(previewCredentials).values(data);
        await recordEvent(tx, {
          actorId: null,
          projectId: project.id,
          action: 'projects.preview.updated',
          targetId: params.previewId,
          metadata: {
            previewId: params.previewId,
            changes: contentChanges(
              { ...(existing ?? {}), available: !!existing },
              { ...data, available: true },
              ['branch', 'commit', 'previewUrl', 'available']
            )
          }
        });
      });
      return { stored: true };
    },
    {
      body: t.Object({
        audience: t.String({ minLength: 1, maxLength: 200 }),
        branch: t.String({ minLength: 1, maxLength: 128 }),
        commit: t.String({ pattern: '^[a-f0-9]{40}$' }),
        previewUrl: t.String({ pattern: '^https://[^\\s]{1,500}$' }),
        accounts
      })
    }
  )
  .delete(
    '/internal/projects/:slug/previews/:previewId/credentials',
    async ({ db, params, headers, body }) => {
      const authorization = headers.authorization;
      if (!authorization?.startsWith('Bearer '))
        throw status(401, { code: 'WORKFLOW_TOKEN_REQUIRED' });
      await verifyOidc(authorization.slice(7), body.audience, 'cleanup');
      const [project] = await db
        .select({ id: projects.id, slug: projects.slug })
        .from(projects)
        .where(eq(projects.slug, params.slug));
      if (!project || project.slug !== 'ksi-core') throw status(404, { code: 'PROJECT_NOT_FOUND' });
      await db.transaction(async (tx) => {
        await tx
          .select({ id: projects.id })
          .from(projects)
          .where(eq(projects.id, project.id))
          .for('update');
        const [removed] = await tx
          .delete(previewCredentials)
          .where(
            and(
              eq(previewCredentials.projectId, project.id),
              eq(previewCredentials.previewId, params.previewId)
            )
          )
          .returning();
        if (removed)
          await recordEvent(tx, {
            actorId: null,
            projectId: project.id,
            action: 'projects.preview.removed',
            targetId: params.previewId,
            metadata: {
              previewId: params.previewId,
              changes: contentChanges({ ...removed, available: true }, { available: false }, [
                'branch',
                'commit',
                'previewUrl',
                'available'
              ])
            }
          });
      });
      return { deleted: true };
    },
    { body: t.Object({ audience: t.String({ minLength: 1, maxLength: 200 }) }) }
  )
  .get('/projects/by-slug/:slug/previews', async ({ db, user, params }) => {
    if (!user) throw status(401, { code: 'AUTH_REQUIRED' });
    if (user.membershipStatus !== 'active') throw status(403, { code: 'FORBIDDEN' });
    const [project] = await db
      .select({ id: projects.id, slug: projects.slug })
      .from(projects)
      .where(eq(projects.slug, params.slug));
    if (!project || project.slug !== 'ksi-core') throw status(404, { code: 'PROJECT_NOT_FOUND' });
    const groups = await db
      .select({ id: projectGroups.id, permissions: projectGroups.permissions })
      .from(projectGroups)
      .innerJoin(projectGroupMembers, eq(projectGroupMembers.groupId, projectGroups.id))
      .innerJoin(
        projectMembers,
        and(
          eq(projectMembers.projectId, projectGroups.projectId),
          eq(projectMembers.userId, projectGroupMembers.userId)
        )
      )
      .where(and(eq(projectGroups.projectId, project.id), eq(projectGroupMembers.userId, user.id)));
    if (
      !groups.some((group) =>
        group.permissions.includes('projects.preview-credentials.read' as Permission)
      )
    )
      throw status(403, { code: 'FORBIDDEN' });
    const deployments = await db
      .select({
        previewId: previewCredentials.previewId,
        branch: previewCredentials.branch,
        commit: previewCredentials.commit,
        previewUrl: previewCredentials.previewUrl,
        accounts: previewCredentials.accounts,
        updatedAt: previewCredentials.updatedAt
      })
      .from(previewCredentials)
      .where(eq(previewCredentials.projectId, project.id))
      .orderBy(previewCredentials.updatedAt);
    return deployments.map((deployment) => ({
      ...deployment,
      accounts: decryptAccounts(deployment.accounts, `${project.id}:${deployment.previewId}`)
    }));
  });
