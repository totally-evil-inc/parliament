import { Hono } from "hono"
import { buildToolContext, httpStatusFor } from "../../agent/tool-ctx"
import {
  customerAnalyticsTool,
  customerDetailsTool,
  listCustomersTool,
} from "../../agent/tools/customers"
import { dealAnalyticsTool, listDealsTool } from "../../agent/tools/deals"
import {
  listInvoicesTool,
  listProposalsTool,
} from "../../agent/tools/documents"
import { listCalendarEvents } from "../../lib/calendar/events"

export const agentToolsRouter = new Hono<{
  Variables: {
    user: { id: string; email: string } | null
    session: { id: string } | null
    logContext: Record<string, unknown>
  }
}>()

agentToolsRouter.get("/list_deals", async (c) => {
  try {
    const ctx = await buildToolContext(c)
    const tool = listDealsTool(ctx) as any
    const data = await tool.execute({})
    return c.json(data)
  } catch (err: any) {
    return c.json({ error: err.message }, httpStatusFor(err.code ?? "unknown"))
  }
})

agentToolsRouter.get("/deal_analytics", async (c) => {
  try {
    const ctx = await buildToolContext(c)
    const tool = dealAnalyticsTool(ctx) as any
    const data = await tool.execute({})
    return c.json(data)
  } catch (err: any) {
    return c.json({ error: err.message }, httpStatusFor(err.code ?? "unknown"))
  }
})

agentToolsRouter.get("/list_customers", async (c) => {
  try {
    const ctx = await buildToolContext(c)
    const tool = listCustomersTool(ctx) as any
    const data = await tool.execute({})
    return c.json(data)
  } catch (err: any) {
    return c.json({ error: err.message }, httpStatusFor(err.code ?? "unknown"))
  }
})

agentToolsRouter.get("/customer_analytics", async (c) => {
  try {
    const ctx = await buildToolContext(c)
    const tool = customerAnalyticsTool(ctx) as any
    const data = await tool.execute({})
    return c.json(data)
  } catch (err: any) {
    return c.json({ error: err.message }, httpStatusFor(err.code ?? "unknown"))
  }
})

agentToolsRouter.get("/customer_details", async (c) => {
  try {
    const ctx = await buildToolContext(c)
    const id = c.req.query("id")
    if (!id) return c.json({ error: "Missing id query parameter" }, 400)
    const tool = customerDetailsTool(ctx) as any
    const data = await tool.execute({ id })
    return c.json(data)
  } catch (err: any) {
    return c.json({ error: err.message }, httpStatusFor(err.code ?? "unknown"))
  }
})

agentToolsRouter.get("/list_proposals", async (c) => {
  try {
    const ctx = await buildToolContext(c)
    const tool = listProposalsTool(ctx) as any
    const data = await tool.execute({})
    return c.json(data)
  } catch (err: any) {
    return c.json({ error: err.message }, httpStatusFor(err.code ?? "unknown"))
  }
})

agentToolsRouter.get("/list_invoices", async (c) => {
  try {
    const ctx = await buildToolContext(c)
    const tool = listInvoicesTool(ctx) as any
    const data = await tool.execute({})
    return c.json(data)
  } catch (err: any) {
    return c.json({ error: err.message }, httpStatusFor(err.code ?? "unknown"))
  }
})

agentToolsRouter.get("/gcal_list_events", async (c) => {
  try {
    const ctx = await buildToolContext(c)
    const days = Number(c.req.query("days") || 7)
    const events = await listCalendarEvents(ctx.userId, days, 14)
    return c.json({ events })
  } catch (err: any) {
    return c.json({ error: err.message }, httpStatusFor(err.code ?? "unknown"))
  }
})
