export type IntegrationStatus = "connected" | "available" | "pending"

export type IntegrationCategory =
  | "analytics"
  | "marketing"
  | "cms"
  | "payments"
  | "automation"

export type Integration = {
  id: string
  title: string
  description: string
  url: string
  category: IntegrationCategory
  status: IntegrationStatus
}

export const integrationCategories = [
  { value: "all", label: "All" },
  { value: "connected", label: "Connected" },
  { value: "available", label: "Available" },
  { value: "pending", label: "Pending" },
] as const

export const integrations = [
  {
    id: "posthog",
    title: "PostHog",
    description: "Open-source product analytics for tracking workspace usage.",
    url: "https://posthog.com/",
    category: "analytics",
    status: "connected",
  },
  {
    id: "mailchimp",
    title: "Mailchimp",
    description: "Email campaigns and audience sync for workspace updates.",
    url: "https://mailchimp.com",
    category: "marketing",
    status: "available",
  },
  {
    id: "webflow",
    title: "Webflow",
    description: "Publish approved workspace content into managed sites.",
    url: "https://webflow.com/",
    category: "cms",
    status: "pending",
  },
  {
    id: "stripe",
    title: "Stripe",
    description: "Payment processing and billing events for customers.",
    url: "https://stripe.com",
    category: "payments",
    status: "available",
  },
  {
    id: "sanity",
    title: "Sanity",
    description: "Structured content management for reusable workspace assets.",
    url: "https://sanity.io/",
    category: "cms",
    status: "pending",
  },
  {
    id: "zapier",
    title: "Zapier",
    description: "No-code automation between Parliament and external tools.",
    url: "https://zapier.com",
    category: "automation",
    status: "available",
  },
] satisfies Array<Integration>
