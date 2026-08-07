import { render } from "@react-email/render"
import { createFileRoute } from "@tanstack/react-router"
import React from "react"
import { z } from "zod"
import { InvitationEmail } from "../../../features/email/templates/InvitationEmail"
import { MagicLinkEmail } from "../../../features/email/templates/MagicLinkEmail"

const renderPayloadSchema = z.object({
  template: z.enum(["magic-link", "invitation"]),
  props: z.record(z.unknown()).optional().default({}),
})

const magicLinkPropsSchema = z.object({
  url: z.string().default(""),
  email: z.string().default(""),
})

const invitationPropsSchema = z.object({
  url: z.string().default(""),
  orgName: z.string().default(""),
  inviterName: z.string().default(""),
  email: z.string().default(""),
})

export const Route = createFileRoute("/internal/email/render")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const rawBody = await request.json().catch(() => null)
          const parsed = renderPayloadSchema.safeParse(rawBody)

          if (!parsed.success) {
            return new Response(
              JSON.stringify({ error: "Invalid render request payload" }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }
            )
          }

          const { template, props } = parsed.data

          let element: React.ReactElement
          if (template === "magic-link") {
            const safeProps = magicLinkPropsSchema.parse(props)
            element = React.createElement(MagicLinkEmail, safeProps)
          } else if (template === "invitation") {
            const safeProps = invitationPropsSchema.parse(props)
            element = React.createElement(InvitationEmail, safeProps)
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
        } catch (err: unknown) {
          return new Response(
            JSON.stringify({ error: "Failed to render email template" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }
          )
        }
      },
    },
  },
})
