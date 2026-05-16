import { createMiddleware, createServerFn } from "@tanstack/react-start"

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

export const ensureSession = createServerFn({ method: "GET" }).handler(
  ({ context }) => {
    const auth = getAuthContext(context)

    if (!auth.session) {
      throw new Error("Unauthorized")
    }

    return auth.session
  }
)
