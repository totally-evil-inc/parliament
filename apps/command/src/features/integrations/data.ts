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

export type IntegrationPreview = {
  id: string
  title: string
  subtitle?: string
  gradient: string
  type: "toast" | "card" | "sidebar" | "table" | "timeline"
}

export type Integration = {
  id: string
  providerId: string
  providerAccountId?: string
  title: string
  author: string
  description: string
  longDescription: string
  overview?: string
  howItWorks?: string
  url: string
  documentationUrl?: string
  category: IntegrationCategory
  status: IntegrationStatus
  scopes?: string[]
  features: IntegrationFeature[]
  actions: string[]
  previews?: IntegrationPreview[]
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
    title: "Gmail",
    author: "Google.com",
    description:
      "Gmail: A widely-used email service that offers powerful features like smart sorting, spam filtering, and integration with other Google services.",
    longDescription:
      "Connect your Gmail account to enable direct dispatches (gmail.send), real-time client response velocity heatmaps (gmail.metadata), and automated draft creation.",
    overview:
      "Utilize the Gmail API to generate messages, automate tasks, and create tailored workflows in your applications when specific actions occur in other platforms.",
    howItWorks:
      "The Gmail API offers a ready-to-use solution for automation. While it allows for extensive customization, it is also quick to set up, requires no technical expertise, and integrates with numerous popular tools like Typeform and Google Sheets.\n\nWith the Gmail API, you can automate the creation, updating, and commenting on emails when triggered, as well as initiate other workflows when a new email or comment arrives. For instance, users have set up workflows to send emails when a form is submitted or to generate alerts when emails contain certain keywords.",
    url: "https://mail.google.com",
    documentationUrl: "https://developers.google.com/gmail/api",
    category: "developer",
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
    previews: [
      {
        id: "p1",
        title: "Notification: Your payment has been successfully processed...",
        subtitle: "Visionary Group • 09:30",
        gradient: "from-rose-500 via-red-500 to-amber-500",
        type: "toast",
      },
      {
        id: "p2",
        title: "Alert: Your payment is scheduled for processing.",
        subtitle: "Synergy Squad • To: kate@auna.com",
        gradient: "from-amber-400 via-pink-400 to-purple-500",
        type: "card",
      },
      {
        id: "p3",
        title: "Mails Navigation",
        subtitle: "Inbox, Drafts, Starred, Sent, Deleted",
        gradient: "from-indigo-500 via-purple-500 to-pink-500",
        type: "sidebar",
      },
    ],
  },
  {
    id: "cal",
    providerId: "cal",
    title: "Cal.com",
    author: "Cal.com",
    description:
      "Cal.com: Open source scheduling infrastructure for scheduling meetings and advancing deal pipeline stages.",
    longDescription:
      "Connect Cal.com to sync discovery call bookings directly with your deal pipeline. Automatically advances deals from Lead to Discovery when meetings are booked and handles cancellation rollbacks.",
    overview:
      "Integrate Cal.com webhooks to track customer discovery call bookings, synchronize schedules across team calendars, and automate workflow state transitions.",
    howItWorks:
      "When a client books a slot on your Cal.com scheduling link, a web trigger payload is received. The integration parses attendee contact metadata, verifies the lead identity, and seamlessly advances the associated deal stage from Lead to Discovery.",
    url: "https://cal.com",
    documentationUrl: "https://cal.com/docs",
    category: "productivity",
    status: "available",
    features: [
      {
        label: "Automated Deal Advancement",
        description:
          "Automatically advances deal stage from Lead to Discovery when a customer books a call.",
      },
      {
        label: "Cancellation Rollbacks",
        description:
          "Rolls back deal stage from Discovery to Lead when a scheduled booking is cancelled.",
      },
    ],
    actions: [
      "cal_process_webhook",
      "cal_booking_created",
      "cal_booking_cancelled",
    ],
    previews: [
      {
        id: "cal1",
        title: "30 Min Discovery Call Scheduled",
        subtitle: "Alex Rivera • Tomorrow 14:00 GMT",
        gradient: "from-emerald-400 via-teal-500 to-sky-500",
        type: "card",
      },
      {
        id: "cal2",
        title: "Booking Slots Availability",
        subtitle: "Mon - Fri • 09:00 - 17:00",
        gradient: "from-teal-500 via-cyan-500 to-blue-500",
        type: "toast",
      },
    ],
  },
  {
    id: "github",
    providerId: "github",
    title: "GitHub",
    author: "GitHub.com",
    description:
      "GitHub: A developer platform that allows developers to create, store, manage, and share their code.",
    longDescription:
      "Allow the AI Agent to interact with your GitHub repositories. It can open pull requests, create or comment on issues, browse repository contents, and read CI/CD run statuses.",
    overview:
      "Connect GitHub to grant AI Agents repository access for issue triage, automated pull request generation, build failure checks, and code context lookup.",
    howItWorks:
      "GitHub OAuth integration authorizes tokenized API calls scoped to your user permissions or organization membership. When requested, agents query repository contents, branch refs, and workflow runs via standard GitHub REST and GraphQL APIs.",
    url: "https://github.com",
    documentationUrl: "https://docs.github.com",
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
    previews: [
      {
        id: "gh1",
        title: "PR #142: Add automated integration retry policy",
        subtitle: "4 files changed • CI checks passed",
        gradient: "from-slate-700 via-emerald-600 to-teal-700",
        type: "card",
      },
      {
        id: "gh2",
        title: "Repository Issues Triage",
        subtitle: "12 Open Issues • 3 In Progress",
        gradient: "from-emerald-500 via-teal-600 to-indigo-600",
        type: "toast",
      },
    ],
  },
  {
    id: "linear",
    providerId: "linear",
    title: "Linear",
    author: "Linear.app",
    description:
      "Linear: Purpose-built tool for modern software development to streamline issues, sprints, and product roadmaps.",
    longDescription:
      "Connect Linear to allow the AI Agent to create and manage issues, update issue statuses, and query your team's project cycles and backlogs. Ideal for keeping engineering workflows in sync with agent-driven tasks.",
    overview:
      "Leverage the Linear API to automatically capture task action items, transition issue workflow statuses, and assign priority levels directly from agent activity.",
    howItWorks:
      "Through OAuth authorization, Linear issues and project cycles become accessible to AI workflows. Whenever a document or proposal requires action items, the agent dispatches issue creation requests with labels, estimates, and project links.",
    url: "https://linear.app",
    documentationUrl: "https://developers.linear.app",
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
    previews: [
      {
        id: "lin1",
        title: "PAR-892: Implement custom integration side sheet design",
        subtitle: "In Progress • High Priority",
        gradient: "from-indigo-600 via-purple-600 to-violet-700",
        type: "card",
      },
      {
        id: "lin2",
        title: "Cycle 24 Active Roadmap",
        subtitle: "18 Issues Completed • 4 Blocked",
        gradient: "from-purple-600 via-indigo-500 to-blue-600",
        type: "toast",
      },
    ],
  },
  {
    id: "notion",
    providerId: "notion",
    title: "Notion",
    author: "Notion.so",
    description:
      "Notion: A connected workspace for wiki, docs, and project management with flexible database structures.",
    longDescription:
      "Grant the AI Agent read and write access to your Notion workspace. It can search pages, query structured databases, create new pages, and append content blocks to existing documents.",
    overview:
      "Utilize the Notion API to search workspace documents, query database records, append notes, and synchronize document metadata across your workspace.",
    howItWorks:
      "Connecting Notion authenticates agent requests to selected workspace pages. The agent can construct rich block objects, query structured database tables with dynamic filters, and write newly synthesized research notes.",
    url: "https://notion.so",
    documentationUrl: "https://developers.notion.com",
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
    previews: [
      {
        id: "not1",
        title: "Client Knowledge Base & Guidelines",
        subtitle: "Updated 10m ago by Workspace Agent",
        gradient: "from-amber-500 via-orange-500 to-rose-500",
        type: "card",
      },
      {
        id: "not2",
        title: "Notion Database Table Query",
        subtitle: "34 Records • 4 Columns Filtered",
        gradient: "from-orange-400 via-amber-500 to-yellow-500",
        type: "toast",
      },
    ],
  },
  {
    id: "google-calendar",
    providerId: "google-calendar",
    title: "Google Calendar",
    author: "Google.com",
    description:
      "Google Calendar: Time management and scheduling calendar service developed by Google.",
    longDescription:
      "Connect Google Calendar to flag client discovery calls scheduled on your calendar to automatically create candidate leads.",
    overview:
      "Read-only Google Calendar discovery call and meeting detection to automatically sync event invitations with CRM deal stages.",
    howItWorks:
      "With read-only calendar event access, the integration periodically audits upcoming calendar slots for keywords matching client discovery calls and populates lead pipeline entries.",
    url: "https://calendar.google.com",
    documentationUrl: "https://developers.google.com/calendar",
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
    previews: [
      {
        id: "gcal1",
        title: "Discovery Meeting with Acme Corp",
        subtitle: "Today • 15:30 - 16:15",
        gradient: "from-sky-400 via-blue-500 to-indigo-600",
        type: "card",
      },
    ],
  },
  {
    id: "google-drive",
    providerId: "google-drive",
    title: "Google Drive",
    author: "Google.com",
    description:
      "Google Drive: Cloud storage service allowing file storage, synchronization, and document ingestion.",
    longDescription:
      "Connect Google Drive to ingest client invoice PDFs placed into your Command Drops Drive folder.",
    overview:
      "Google Drive document ingestion and PDF drops for automated client file parsing and document indexing.",
    howItWorks:
      "Google Drive integration watches designated drop folders for incoming PDF or document uploads, extracting client metadata to streamline file management.",
    url: "https://drive.google.com",
    documentationUrl: "https://developers.google.com/drive",
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
    previews: [
      {
        id: "gdrive1",
        title: "Command Drops Folder / Proposal_Invoice_2026.pdf",
        subtitle: "Uploaded 2m ago • 2.4 MB",
        gradient: "from-amber-400 via-yellow-500 to-emerald-500",
        type: "card",
      },
    ],
  },
]
