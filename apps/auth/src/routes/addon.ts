import { logger } from "@workspace/logger"
import { Hono } from "hono"

export const addonRouter = new Hono<{
  Variables: {
    user: { id: string; email: string } | null
    session: { id: string } | null
    logContext: Record<string, unknown>
  }
}>()

/**
 * Returns Google Workspace Add-on Manifest configuration (Non-Sensitive scopes)
 */
addonRouter.get("/manifest", (c) => {
  return c.json({
    oauthScopes: [
      "https://www.googleapis.com/auth/gmail.addons.execute",
      "https://www.googleapis.com/auth/gmail.addons.current.action.compose",
      "https://www.googleapis.com/auth/gmail.addons.current.message.readonly",
    ],
    gmail: {
      name: "Parliament Operational Sidebar",
      logoUrl: "https://parliament.app/logo.png",
      contextualTriggers: [
        {
          unconditional: {},
          onTriggerFunction: "onGmailMessageOpen",
        },
      ],
      composeTrigger: {
        selectActions: [
          {
            text: "Insert Proposal Magic Link",
            runFunction: "onInsertProposalLink",
          },
        ],
      },
    },
  })
})

/**
 * Contextual Active-Message endpoint called when user opens an email in native Gmail sidebar
 */
addonRouter.post("/context", async (c) => {
  try {
    const body = await c.req.json()
    const { senderEmail, messageId } = body

    logger.info(
      { senderEmail, messageId },
      "Google Workspace Add-on contextual sidebar activated"
    )

    // Mock active client operations matching sender email
    return c.json({
      success: true,
      clientEmail: senderEmail,
      messageId,
      activeProposals: [
        {
          id: "prop_1",
          title: "Website Redesign v2",
          status: "pending",
          amount: "$5,000",
        },
      ],
      unpaidInvoices: [
        {
          id: "inv_101",
          title: "Deposit Invoice",
          dueDate: "2026-08-15",
          amount: "$2,500",
        },
      ],
      quickActions: [
        "turn_into_change_request",
        "send_payment_reminder",
        "prepare_revision_draft",
      ],
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error"
    logger.error({ err }, "Failed to process Add-on contextual request")
    return c.json({ error: errorMsg }, 500)
  }
})
