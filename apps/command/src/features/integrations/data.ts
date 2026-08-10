export type IntegrationStatus =
  | "connected"
  | "available"
  | "pending"
  | "coming_soon"

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
  { value: "coming_soon", label: "Coming Soon" },
] as const

export const DEFAULT_INTEGRATIONS: Array<Integration> = [
  {
    id: "gmail",
    providerId: "gmail",
    title: "Gmail & Email Operations",
    description:
      "Audit-free Gmail dispatches, response velocity analytics, and thread watching.",
    longDescription:
      "Connect your Gmail account to enable direct dispatches (gmail.send), real-time client response velocity heatmaps (gmail.metadata), and automated draft creation.",
    url: "https://mail.google.com",
    category: "productivity",
    status: "available",
    scopes: [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.metadata",
    ],
    features: [
      {
        label: "Direct Gmail Dispatches",
        description:
          "Send proposals, invoices, and deposit follow-ups directly from your authentic Gmail address.",
      },
      {
        label: "Thread Activity Heatmap & Silence Detection",
        description:
          "Track client response velocities and inactivity warnings using audit-free metadata.",
      },
    ],
    actions: [
      "gmail_send_email",
      "gmail_create_draft",
      "gmail_watch_threads",
      "gmail_get_activity",
    ],
  },
  {
    id: "google-calendar",
    providerId: "google-calendar",
    title: "Google Calendar",
    description:
      "Read-only Google Calendar discovery call and meeting detection.",
    longDescription:
      "Connect Google Calendar to flag client discovery calls scheduled on your calendar to automatically create candidate leads.",
    url: "https://calendar.google.com",
    category: "productivity",
    status: "available",
    scopes: [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/calendar.events.readonly",
    ],
    features: [
      {
        label: "Discovery Meeting Lead Detection",
        description:
          "Flag client discovery calls scheduled on Google Calendar to automatically create candidate leads.",
      },
    ],
    actions: ["gcal_list_events"],
  },
  {
    id: "google-drive",
    providerId: "google-drive",
    title: "Google Drive",
    description: "Google Drive document ingestion and PDF drops.",
    longDescription:
      "Connect Google Drive to ingest client invoice PDFs placed into your Command Drops Drive folder.",
    url: "https://drive.google.com",
    category: "productivity",
    status: "available",
    scopes: [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/drive.file",
    ],
    features: [
      {
        label: "Google Drive PDF Drop Folder",
        description:
          "Ingest client invoice PDFs placed into your Command Drops Drive folder.",
      },
    ],
    actions: ["drive_list_files", "drive_upload_file"],
  },
  {
    id: "github",
    providerId: "github",
    title: "GitHub",
    description:
      "Repository access, pull request creation, and code issue inspection.",
    longDescription:
      "Allow the AI Agent to interact with your GitHub repositories. It can open pull requests, create or comment on issues, browse repository contents, and read CI/CD run statuses.",
    url: "https://github.com",
    category: "developer",
    status: "coming_soon",
    scopes: ["repo", "read:org", "user"],
    features: [
      {
        label: "Pull Requests",
        description:
          "Create, list, and comment on pull requests across your repositories.",
      },
      {
        label: "Issues",
        description:
          "Open, search, and update GitHub issues with labels and assignees.",
      },
      {
        label: "Repository Browsing",
        description:
          "Read file contents, directory trees, and commit histories.",
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
    description:
      "Sync tasks, create issue tickets, and manage project backlogs.",
    longDescription:
      "Connect Linear to allow the AI Agent to create and manage issues, update issue statuses, and query your team's project cycles and backlogs. Ideal for keeping engineering workflows in sync with agent-driven tasks.",
    url: "https://linear.app",
    category: "issue-tracking",
    status: "coming_soon",
    scopes: ["read", "write"],
    features: [
      {
        label: "Issue Creation",
        description:
          "Create new issues with titles, descriptions, priorities, and assignees.",
      },
      {
        label: "Issue Queries",
        description:
          "Search and list issues by project, team, label, or status.",
      },
      {
        label: "Status Updates",
        description:
          "Transition issues between workflow states (e.g. In Progress → Done).",
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
    status: "coming_soon",
    features: [
      {
        label: "Page Search",
        description:
          "Search across your Notion workspace for specific pages or content.",
      },
      {
        label: "Database Queries",
        description:
          "Query Notion databases with filters and sorts to retrieve structured data.",
      },
      {
        label: "Page Creation",
        description:
          "Create new pages inside Notion with rich content and nested blocks.",
      },
      {
        label: "Block Appending",
        description:
          "Append new content blocks (text, tables, checklists) to existing pages.",
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
