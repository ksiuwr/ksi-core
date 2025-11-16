import { alert } from "@ksi-core/backend/db";
import { createElysia } from "@ksi-core/backend/lib/createElysia";
import { eq } from "drizzle-orm";
import { t } from "elysia";

export default createElysia({
    prefix: '/alerts',
    protectedRoute: true
})
    .get("/", async ({ db, query }) => {
        db.query.alert.findMany({
            ...query
        })
    }, {
        query: t.Object({
            limit: t.Number(),
            offset: t.Number()
        })
    })