import { createMiddleware, createStart } from "@tanstack/react-start"

import { createCommandAuthContext } from "./server/auth-service"

const authMiddleware = createMiddleware({ type: "request" }).server(
  async ({ request, next }) => {
    const auth = await createCommandAuthContext(request)

    return next({
      context: {
        auth,
      },
    })
  }
)

export const startInstance = createStart(() => ({
  requestMiddleware: [authMiddleware],
}))
