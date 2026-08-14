const AUTH_SERVER_URL =
  import.meta.env.VITE_AUTH_SERVER_URL || "http://localhost:4000"

export interface UIToolProvider {
  [toolName: string]: (args: Record<string, unknown>) => Promise<unknown>
}

export const uiToolProvider: UIToolProvider = {
  list_deals: async () => {
    const res = await fetch(`${AUTH_SERVER_URL}/api/agent/tools/list_deals`, {
      credentials: "include",
    })
    return res.json()
  },
  deal_analytics: async () => {
    const res = await fetch(
      `${AUTH_SERVER_URL}/api/agent/tools/deal_analytics`,
      { credentials: "include" }
    )
    return res.json()
  },
  list_customers: async () => {
    const res = await fetch(
      `${AUTH_SERVER_URL}/api/agent/tools/list_customers`,
      { credentials: "include" }
    )
    return res.json()
  },
  customer_analytics: async () => {
    const res = await fetch(
      `${AUTH_SERVER_URL}/api/agent/tools/customer_analytics`,
      { credentials: "include" }
    )
    return res.json()
  },
  customer_details: async (args: Record<string, unknown>) => {
    const id = String(args.id || "")
    const res = await fetch(
      `${AUTH_SERVER_URL}/api/agent/tools/customer_details?id=${encodeURIComponent(id)}`,
      { credentials: "include" }
    )
    return res.json()
  },
  list_proposals: async () => {
    const res = await fetch(
      `${AUTH_SERVER_URL}/api/agent/tools/list_proposals`,
      { credentials: "include" }
    )
    return res.json()
  },
  list_invoices: async () => {
    const res = await fetch(
      `${AUTH_SERVER_URL}/api/agent/tools/list_invoices`,
      { credentials: "include" }
    )
    return res.json()
  },
  gcal_list_events: async (args: Record<string, unknown>) => {
    const days = String(args.days || 7)
    const res = await fetch(
      `${AUTH_SERVER_URL}/api/agent/tools/gcal_list_events?days=${encodeURIComponent(days)}`,
      { credentials: "include" }
    )
    return res.json()
  },
}
