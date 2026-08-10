import { createMiddleware, createServerFn } from "@tanstack/react-start"
import { and, db, eq, schema } from "@workspace/database"

import type {
  AuthenticatedCommandAuthContext,
  CommandAuthContext,
} from "./auth-context"

function getAuthContext(context: { auth?: CommandAuthContext } | undefined) {
  return (
    context?.auth ?? {
      user: null,
      session: null,
      getBackendJwt: () =>
        Promise.resolve({
          error: "Unauthorized",
          status: 401,
        }),
    }
  )
}

export const requireAuth = createMiddleware({ type: "function" }).server(
  ({ context, next }) => {
    const auth = getAuthContext(context)

    if (!auth.session || !auth.user) {
      throw new Error("Unauthorized")
    }

    return next({
      context: {
        auth: auth as AuthenticatedCommandAuthContext,
      },
    })
  }
)

export async function requireActiveOrganization(
  auth: AuthenticatedCommandAuthContext
) {
  const organizationId = auth.session.session?.activeOrganizationId
  const userId = getUserId(auth)
  if (!organizationId || !userId) throw new Error("Unauthorized")

  const rows = await db
    .select({ id: schema.member.id })
    .from(schema.member)
    .where(
      and(
        eq(schema.member.organizationId, organizationId),
        eq(schema.member.userId, userId)
      )
    )
    .limit(1)

  if (rows.length === 0) throw new Error("Unauthorized")
  return organizationId
}

export function getUserId(auth: AuthenticatedCommandAuthContext) {
  return typeof auth.user?.id === "string" ? auth.user.id : null
}

export const getViewer = createServerFn({ method: "GET" }).handler(
  ({ context }) => {
    const auth = getAuthContext(context)

    if (!auth.session || !auth.user) {
      return null
    }

    return {
      user: auth.user,
    }
  }
)

export const getSession = createServerFn({ method: "GET" }).handler(
  ({ context }) => getAuthContext(context).session
)
