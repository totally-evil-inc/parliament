import openUiSpecJson from "./generated/spec.json"

export const OPENUI_SPEC = openUiSpecJson as Record<string, unknown>

export const OPENUI_COMPONENT_SIGNATURES = [
  'Stack(children: any[], direction?: "row" | "column", gap?: number, align?: "start" | "center" | "end" | "stretch", justify?: "start" | "center" | "end" | "between") — Flexible stack layout container for arranging elements horizontally or vertically.',
  'Layout(children: any[], type?: "bento" | "grid" | "sidebar", cols?: number) — Bento or grid layout container for structured dash cards and widgets.',
  "Content(title?: string, subtitle?: string, body?: string) — Text content block with optional title, subtitle and body markdown.",
  'Data(label: string, value: string, trend?: "up" | "down" | "neutral", badge?: string) — Key-value data tile with trend indicator or badge.',
  "EventCard(summary: string, start: string, end?: string, location?: string, attendees?: string[], htmlLink?: string) — Calendar event badge displaying title, time range, attendees, and link.",
  'DocumentSentCard(documentTitle: string, documentType: "proposal" | "invoice", shareUrl: string, recipientEmail?: string, status?: string, valueFormatted?: string) — Document dispatch card showing proposal or invoice sent status, share URL, and recipient.',
  "MetricGroup(metrics: {label: string, value: string, change?: string}[]) — Horizontal bar of 2 to 4 metric callouts.",
  'Chart(type?: "bar" | "line" | "pie", title?: string, data: Record<string, any>[], dataKeys?: string[]) — Bar, line, or pie visualization chart.',
  "DataTable(columns: {key: string, header: string}[], data: Record<string, any>[]) — Structured data table with columns and rows.",
  'Callout(title?: string, description: string, variant?: "info" | "success" | "warning" | "error") — Important message callout box with severity color.',
  "LinkCard(title: string, description?: string, url: string, badge?: string) — External or internal link button card.",
  "Divider(label?: string) — Horizontal visual divider line with optional label.",
]

export const OPENUI_SYNTAX_RULES = [
  "Wrap all Generative UI programs in a single fenced ```openui-lang block.",
  "The FIRST line MUST be `root = Stack([child1, child2])` or `root = Layout([child1, child2])` for progressive streaming.",
  "Arguments are strictly POSITIONAL (order matters). NEVER use keyword/named arguments (e.g. columns=, data=, metrics=, title=) or colons.",
  '- Correct: t1 = DataTable([{"key": "title", "header": "Deal Title"}], [{"title": "Cloud Platform"}])',
  '- Incorrect: t1 = DataTable(columns=[{"key": "title", "header": "Deal Title"}], data=[{"title": "Cloud Platform"}])',
  '- Incorrect: t1 = DataTable(columns: [{"key": "title", "header": "Deal Title"}], data: [{"title": "Cloud Platform"}])',
  "Define each child component on its own line and reference it in root Stack/Layout.",
  "Do not put explanatory markdown inside the ```openui-lang block. Place any summary text before or after the code block.",
]
