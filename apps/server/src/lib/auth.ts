import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import * as schema from '../db/schema';
import { db } from '../db';
import { getUrls } from '@ksi-core/shared';
import { username } from 'better-auth/plugins';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: schema,
    usePlural: true,
    camelCase: true
  }),
  emailAndPassword: {
    enabled: true
  },
  plugins: [
    username({
      usernameNormalization: (username) => {
        return username
          .toLowerCase()
          .replaceAll('0', 'o')
          .replaceAll('3', 'e')
          .replaceAll('4', 'a');
      }
    })
  ],
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
