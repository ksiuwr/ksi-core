import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import * as schema from '../db/schema';
import { db } from '../db';
import { getUrls } from '@ksi-core/shared';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: schema,
    usePlural: true,
    camelCase: true
  }),
  emailAndPassword: { enabled: true },
  trustedOrigins: getUrls().frontend.all,
  baseURL: getUrls().backend + '/auth',
  socialProviders: {
    discord: {
      clientId: process.env.OAUTH2_DISCORD_ID!,
      clientSecret: process.env.OAUTH2_DISCORD_SECRET!
    },
    google: {
      clientId: process.env.OAUTH2_GOOGLE_ID!,
      clientSecret: process.env.OAUTH2_GOOGLE_SECRET!
    }
  }
});
