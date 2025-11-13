import { createElysia } from "@ksi-core/backend/lib/createElysia";
import { discordRank, rankRequired } from "@ksi-core/backend/middlewares/rankRequired";

export default createElysia({
    prefix: "/dashboard",
    protectedRoute: true
})
    .use(rankRequired())
    .get("/user", ({ user, discordRank }) => ({ ...user, discordRank }))
