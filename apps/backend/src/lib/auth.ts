import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import { appUrls } from "shared";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
    }),
    trustedOrigins: [appUrls.frontendBaseUrl],

    socialProviders: {
        discord: {
            clientId: Bun.env.OAUTH2_DISCORD_ID!,
            clientSecret: Bun.env.OAUTH2_DISCORD_SECRET!
        }
    }
});