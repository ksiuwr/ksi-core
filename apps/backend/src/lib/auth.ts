import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@ksi-core/backend/db";
import { getFrontendUrl } from "packages/shared";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
    }),
    trustedOrigins: [getFrontendUrl()],

    socialProviders: {
        discord: {
            clientId: Bun.env.OAUTH2_DISCORD_ID!,
            clientSecret: Bun.env.OAUTH2_DISCORD_SECRET!
        }
    }
});