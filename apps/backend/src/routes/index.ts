import { createElysia } from "@ksi-core/backend/lib/createElysia";
import dashboardRouter from "@ksi-core/backend/routes/dashboard";

export default createElysia()
    .use(dashboardRouter)