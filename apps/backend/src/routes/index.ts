import { createElysia } from "@/lib/createElysia";
import dashboardRouter from "@/routes/dashboard";

export default createElysia()
    .use(dashboardRouter)