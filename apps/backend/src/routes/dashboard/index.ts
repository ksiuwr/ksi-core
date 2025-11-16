import { createElysia } from "@ksi-core/backend/lib/createElysia";
import { discordRank, rankRequired } from "@ksi-core/backend/middlewares/rankRequired";
import admin from "@ksi-core/backend/routes/dashboard/admin";

export default createElysia({
    prefix: "/dashboard",
    protectedRoute: true
})
    .use(rankRequired())
    .get("/user", ({ user, discordRank }) => ({ ...user, discordRank }))
    .use(admin)
