import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_workspace/settings/")({
  beforeLoad: () => {
    throw redirect({
      href: "/settings/general",
    })
  },
})
