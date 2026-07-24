export type IntegrationStatus = "connected" | "available" | "pending"

export type IntegrationCategory =
  | "productivity"
  | "developer"
  | "issue-tracking"
  | "knowledge"

export type IntegrationFeature = {
  label: string
  description: string
}

export type Integration = {
  id: string
  providerId: string
  title: string
  description: string
  longDescription: string
  url: string
  category: IntegrationCategory
  status: IntegrationStatus
  scopes?: string[]
  features: IntegrationFeature[]
  actions: string[]
}

export const integrationCategories = [
  { value: "all", label: "All" },
  { value: "connected", label: "Connected" },
  { value: "available", label: "Available" },
] as const

export const DEFAULT_INTEGRATIONS: Array<Integration> = [
  {
    id: "google",
    providerId: "google",
    title: "Google Calendar & Account",
    description: "Connect Google Calendar for event scheduling and identity.",
    longDescription:
      "Grant the AI Agent access to your Google Calendar so it can create, update, and delete events on your behalf. The agent can also read your schedule to find available time slots and manage attendees for meetings.",
    url: "https://calendar.google.com",
    category: "productivity",
    status: "available",
    scopes: [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
    ],
    features: [
      {
        label: "Calendar Reading",
        description: "List upcoming events and check your schedule for free/busy slots.",
      },
      {
        label: "Event Creation",
        description: "Create new calendar events with title, time, description, and attendees.",
      },
      {
        label: "Event Management",
        description: "Update or delete existing events by event ID or natural language search.",
      },
      {
        label: "Identity",
        description: "Read your Google account email and profile for contextual personalization.",
      },
    ],
    actions: [
      "gcal_create_event",
      "gcal_list_events",
      "gcal_delete_event",
      "gcal_get_event",
    ],
  },
  {
    id: "github",
    providerId: "github",
    title: "GitHub",
    description: "Repository access, pull request creation, and code issue inspection.",
    longDescription:
      "Allow the AI Agent to interact with your GitHub repositories. It can open pull requests, create or comment on issues, browse repository contents, and read CI/CD run statuses.",
    url: "https://github.com",
    category: "developer",
    status: "available",
    scopes: ["repo", "read:org", "user"],
    features: [
      {
        label: "Pull Requests",
        description: "Create, list, and comment on pull requests across your repositories.",
      },
      {
        label: "Issues",
        description: "Open, search, and update GitHub issues with labels and assignees.",
      },
      {
        label: "Repository Browsing",
        description: "Read file contents, directory trees, and commit histories.",
      },
      {
        label: "Organization Access",
        description: "Read organization memberships and team structures.",
      },
    ],
    actions: [
      "github_create_pull_request",
      "github_list_issues",
      "github_create_issue",
      "github_get_file",
      "github_list_repos",
    ],
  },
  {
    id: "linear",
    providerId: "linear",
    title: "Linear",
    description: "Sync tasks, create issue tickets, and manage project backlogs.",
    longDescription:
      "Connect Linear to allow the AI Agent to create and manage issues, update issue statuses, and query your team's project cycles and backlogs. Ideal for keeping engineering workflows in sync with agent-driven tasks.",
    url: "https://linear.app",
    category: "issue-tracking",
    status: "available",
    scopes: ["read", "write"],
    features: [
      {
        label: "Issue Creation",
        description: "Create new issues with titles, descriptions, priorities, and assignees.",
      },
      {
        label: "Issue Queries",
        description: "Search and list issues by project, team, label, or status.",
      },
      {
        label: "Status Updates",
        description: "Transition issues between workflow states (e.g. In Progress → Done).",
      },
      {
        label: "Project & Cycle Overview",
        description: "Read active project cycles and roadmap milestones.",
      },
    ],
    actions: [
      "linear_create_issue",
      "linear_list_issues",
      "linear_update_issue",
      "linear_get_teams",
    ],
  },
  {
    id: "notion",
    providerId: "notion",
    title: "Notion",
    description: "Query databases, read documentation pages, and create notes.",
    longDescription:
      "Grant the AI Agent read and write access to your Notion workspace. It can search pages, query structured databases, create new pages, and append content blocks to existing documents.",
    url: "https://notion.so",
    category: "knowledge",
    status: "available",
    features: [
      {
        label: "Page Search",
        description: "Search across your Notion workspace for specific pages or content.",
      },
      {
        label: "Database Queries",
        description: "Query Notion databases with filters and sorts to retrieve structured data.",
      },
      {
        label: "Page Creation",
        description: "Create new pages inside Notion with rich content and nested blocks.",
      },
      {
        label: "Block Appending",
        description: "Append new content blocks (text, tables, checklists) to existing pages.",
      },
    ],
    actions: [
      "notion_search",
      "notion_query_database",
      "notion_create_page",
      "notion_append_block",
    ],
  },
]
