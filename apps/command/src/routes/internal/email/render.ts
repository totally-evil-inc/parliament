import { render } from "@react-email/render"
import { createFileRoute } from "@tanstack/react-router"
import React from "react"
import { InvitationEmail } from "../../../features/email/templates/InvitationEmail"
import { MagicLinkEmail } from "../../../features/email/templates/MagicLinkEmail"

export const Route = createFileRoute("/internal/email/render")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const { template, props } = body

          let element: React.ReactElement
          if (template === "magic-link") {
            element = React.createElement(MagicLinkEmail, props)
          } else if (template === "invitation") {
            element = React.createElement(InvitationEmail, props)
          } else {
            return new Response(JSON.stringify({ error: "Unknown template" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            })
          }

          // Use @react-email/render's render function
          const html = await render(element)
          return new Response(JSON.stringify({ html }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          })
        }
      },
    },
  },
})
