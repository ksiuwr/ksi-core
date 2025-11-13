import { auth } from "@/lib/auth";
import cors from "@elysiajs/cors";
import { Context, Elysia } from "elysia";
import { appUrls } from "shared";

const betterAuthView = (context: Context) => {
    const BETTER_AUTH_ACCEPT_METHODS = ["POST", "GET"]
    // validate request method
    if (BETTER_AUTH_ACCEPT_METHODS.includes(context.request.method)) {
        return auth.handler(context.request);
    } else {
        context.status(405)
    }
}

const app = new Elysia().use(cors({
    origin: appUrls.frontendBaseUrl?.replace(/^https?:\/\//, "")
})).all("/api/auth/*", betterAuthView).listen(3000);

export default typeof app;