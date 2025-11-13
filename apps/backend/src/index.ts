import { auth } from "@ksi-core/backend/lib/auth";
import { discordBot } from "@ksi-core/backend/lib/discord";
import routes from "./routes";
import cors from "@elysiajs/cors";
import { type Context, Elysia } from "elysia";
import { getFrontendUrl } from "shared";

const betterAuthView = (context: Context) => {
    const BETTER_AUTH_ACCEPT_METHODS = ["POST", "GET"]
    // validate request method
    if (BETTER_AUTH_ACCEPT_METHODS.includes(context.request.method)) {
        return auth.handler(context.request);
    } else {
        context.status(405)
    }
}

discordBot.ping()

const app = new Elysia()
    .use(cors(
        {
            origin: "localhost:5173",
            methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            credentials: true,
            allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
        }
    ))
    .all("/api/auth/*", betterAuthView)
    .use(routes)

app.listen(3000);

export type App = typeof app;
