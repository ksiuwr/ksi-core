import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@ksi-core/server/db';
import { getUrls } from '@ksi-core/shared';
import * as schema from '../db/schema';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: schema,
    usePlural: true
  }),
  trustedOrigins: [getUrls().FRONTEND],

  baseURL: getUrls().AUTH,
  socialProviders: {
    discord: {
      clientId: Bun.env.OAUTH2_DISCORD_ID!,
      clientSecret: Bun.env.OAUTH2_DISCORD_SECRET!
    }
  }
});
