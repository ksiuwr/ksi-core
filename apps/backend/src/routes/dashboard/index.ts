import { createElysia } from "@/lib/createElysia";

export default createElysia({
    protectedRoute: true
})
    .get("/user", ({ user }) => (user))