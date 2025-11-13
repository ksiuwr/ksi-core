import Elysia, { type ElysiaConfig, status } from "elysia"
import { db, user } from "@/db"
import { InferSelectModel } from "drizzle-orm"
import { auth } from "@/lib/auth"

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

function recordToHeaders(record: Record<string, string | undefined>): Headers {
    const headers = new Headers();

    for (const key in record) {
        const value = record[key];
        if (typeof value === 'string') {
            headers.append(key, value);
        }
    }

    return headers;
}

const contextHandler = async <T extends boolean>(params: {
    headers: Headers
    protectedRoute: T
}): Promise<T extends true ? ProtectedContext : UnprotectedContext> => {
    const { headers, protectedRoute } = params


    const session = await auth.api.getSession({
        headers: headers
    })
    if (!session?.session) {
        if (protectedRoute) throw status(401)
        return {
            user: null,
            unauthorizedError: "Invalid auth token",
            db: db,
        } as any
    }

    return {
        user: session.user,
        unauthorizedError: null,
        db: db,
    } as any
}

// Simplified createContext without complex overloads
export const createContext = <T extends boolean>(protectedRoute: T) => {
    return (app: Elysia) =>
        app.derive(async function buildContext({ headers }) {
            return await contextHandler({ headers: recordToHeaders(headers), protectedRoute })
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
