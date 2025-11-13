import Elysia, { type ElysiaConfig, status } from "elysia"
import { db, user } from "@ksi-core/backend/db"
import { type InferSelectModel } from "drizzle-orm"
import { auth } from "@ksi-core/backend/lib/auth"

// Define the context types based on protection level
type ProtectedContext = {
    user: NonNullable<InferSelectModel<typeof user>>
    db: typeof db
    unauthorizedError: null
}

type UnprotectedContext = {
    user: InferSelectModel<typeof user> | null
    db: typeof db
    unauthorizedError: string | null
}

/**
 * Accept either a plain record or a Headers object and return a Headers instance.
 * This removes the type mismatch depending on what Elysia provides.
 */
function toHeaders(headers: Headers | Record<string, string | undefined>): Headers {
    if (headers instanceof Headers) return headers

    const h = new Headers()
    for (const k in headers) {
        const v = headers[k]
        if (typeof v === "string") h.append(k, v)
    }
    return h
}

/**
 * Overloads for contextHandler so TS understands the boolean -> return type mapping.
 */
async function contextHandler(params: {
    headers: Headers | Record<string, string | undefined>
    protectedRoute: true
}): Promise<ProtectedContext>
async function contextHandler(params: {
    headers: Headers | Record<string, string | undefined>
    protectedRoute: false
}): Promise<UnprotectedContext>
async function contextHandler(params: {
    headers: Headers | Record<string, string | undefined>
    protectedRoute: boolean
}): Promise<ProtectedContext | UnprotectedContext> {
    const { headers, protectedRoute } = params
    const hdrs = toHeaders(headers)

    const session = await auth.api.getSession({
        headers: hdrs
    })

    // If there is no session -> behave differently depending on protectedRoute
    if (!session?.session) {
        if (protectedRoute) {
            // protected route: explicitly throw 401 (runtime behavior)
            throw status(401)
        }

        // unprotected route: return UnprotectedContext
        return {
            user: null,
            unauthorizedError: "Invalid auth token",
            db
        }
    }

    // At this point we have a session (session.session exists). However TypeScript
    // may still treat session.user as possibly null/undefined depending on the auth lib's types.
    // For protected routes we assert it is non-nullable (runtime check earlier ensures it).
    if (protectedRoute) {
        // Force the narrower type for ProtectedContext.
        return {
            user: session.user as NonNullable<InferSelectModel<typeof user>>,
            unauthorizedError: null,
            db
        }
    }

    return {
        // @ts-ignore
        user: session.user ?? null,
        unauthorizedError: null,
        db
    }
}

// Simplified createContext without complex overloads
export const createContext = <T extends boolean>(protectedRoute: T) => {
    return (app: Elysia) =>
        app.derive(async function buildContext({ headers }) {
            // @ts-ignore
            return await contextHandler({ headers, protectedRoute })
        })
}

// Simplified createElysia without complex overloads
export const createElysia = <P extends string = "">(
    config?: ElysiaConfig<P> & { protectedRoute?: boolean }
) => {
    const protectedRoute = config?.protectedRoute ?? false
    return new Elysia(config).use(createContext(protectedRoute))
}

// Type-safe factory functions for specific use cases
export const createProtectedElysia = <P extends string = "">(
    config?: Omit<ElysiaConfig<P>, "protectedRoute">
) => {
    return new Elysia(config).use(createContext(true))
}

export const createUnprotectedElysia = <P extends string = "">(
    config?: Omit<ElysiaConfig<P>, "protectedRoute">
) => {
    return new Elysia(config).use(createContext(false))
}
