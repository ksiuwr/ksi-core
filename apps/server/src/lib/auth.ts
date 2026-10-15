import { splitProfileName } from '../domain/profile-name';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@ksi-core/server/db';
import { getUrls } from 'shared';
import { recordEvent } from './audit';
import * as schema from '../db/schema';

const urls = getUrls();
async function enqueueMail(to: string, subject: string, url: string) {
  await db.insert(schema.mailJobs).values({ to, subject, body: url });
}
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', schema, usePlural: true }),
  secret: Bun.env.BETTER_AUTH_SECRET,
  trustedOrigins: urls.frontend.all,
  baseURL: `${urls.frontend.auth}/api/auth`,
  basePath: '/api/auth',
  advanced: {
    cookiePrefix: `ksi-${urls.environment}`,
    useSecureCookies: Bun.env.NODE_ENV === 'production'
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) =>
      enqueueMail(user.email, 'KSI: reset hasła / password reset', url)
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) =>
      enqueueMail(user.email, 'KSI: potwierdź adres / verify email', url)
  },
  socialProviders: {
    ...(Bun.env.OAUTH_GITHUB_ID && Bun.env.OAUTH_GITHUB_SECRET
      ? { github: { clientId: Bun.env.OAUTH_GITHUB_ID, clientSecret: Bun.env.OAUTH_GITHUB_SECRET } }
      : {}),
    ...(Bun.env.OAUTH_GOOGLE_ID && Bun.env.OAUTH_GOOGLE_SECRET
      ? { google: { clientId: Bun.env.OAUTH_GOOGLE_ID, clientSecret: Bun.env.OAUTH_GOOGLE_SECRET } }
      : {})
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => ({
          data: { ...user, ...splitProfileName(user.name), image: null }
        }),
        after: async (user) => {
          await db.transaction(async (tx) => {
            await recordEvent(tx, {
              actorId: user.id,
              action: 'users.membership.requested',
              targetId: user.id
            });
          });
        }
      },
      // Provider synchronization and Better Auth's update-user route cannot bypass avatar review.
      update: { before: async (user) => ({ data: { ...user, image: undefined } }) }
    }
  },
  user: {
    additionalFields: {
      firstName: { type: 'string', defaultValue: '', input: false },
      lastName: { type: 'string', defaultValue: '', input: false },
      nickname: { type: 'string', required: false, input: false },
      bio: { type: 'string', required: false, input: false },
      github: { type: 'string', required: false, input: false },
      linkedin: { type: 'string', required: false, input: false },
      publicPrivacy: {
        type: ['full-name', 'last-initial', 'initials'],
        defaultValue: 'last-initial',
        input: false
      },
      membershipStatus: {
        type: ['pending', 'active', 'suspended', 'deleted'],
        defaultValue: 'pending',
        input: false
      },
      role: { type: ['member', 'board', 'administrator'], defaultValue: 'member', input: false },
      flags: { type: 'string[]', defaultValue: [], input: false }
    }
  }
});
