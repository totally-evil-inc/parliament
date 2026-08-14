import { createLibrary, defineComponent } from "@openuidev/react-lang"
import { IconCircleCheck, IconLocation, IconUsers } from "nucleo-glass"
import React from "react"
import { z } from "zod"

const defComp = (opts: any) =>
  (defineComponent as any)({
    ...opts,
    // react-lang passes component context as { props, renderNode }.
    // Keep the local renderers ergonomic while forwarding the runtime context.
    component: ({ props, renderNode }: any) =>
      opts.component({ ...props, renderNode }),
  })

export const StackComponent = defComp({
  name: "Stack",
  description:
    "Flexible stack layout container for arranging elements horizontally or vertically.",
  props: z.object({
    children: z.array(z.any()),
    direction: z.enum(["row", "column"]).optional().default("column"),
    gap: z.number().optional().default(3),
    align: z
      .enum(["start", "center", "end", "stretch"])
      .optional()
      .default("stretch"),
    justify: z
      .enum(["start", "center", "end", "between"])
      .optional()
      .default("start"),
  }),
  component: (props: {
    direction?: "row" | "column"
    gap?: number
    align?: string
    justify?: string
    children?: unknown[]
    renderNode?: (node: unknown) => React.ReactNode
  }) => {
    const dir = props.direction === "row" ? "flex-row" : "flex-col"
    return React.createElement(
      "div",
      { className: `flex ${dir} gap-${props.gap ?? 3} w-full` },
      props.children?.map((child) => props.renderNode?.(child))
    )
  },
})

export const LayoutComponent = defComp({
  name: "Layout",
  description:
    "Bento or grid layout container for structured dash cards and widgets.",
  props: z.object({
    children: z.array(z.any()),
    type: z.enum(["bento", "grid", "sidebar"]).optional().default("bento"),
    cols: z.number().optional().default(2),
  }),
  component: (props: {
    type?: string
    cols?: number
    children?: unknown[]
    renderNode?: (node: unknown) => React.ReactNode
  }) => {
    const gridCols =
      props.cols === 3
        ? "grid-cols-1 md:grid-cols-3"
        : "grid-cols-1 md:grid-cols-2"
    return React.createElement(
      "div",
      { className: `grid ${gridCols} gap-4 w-full my-2` },
      props.children?.map((child) => props.renderNode?.(child))
    )
  },
})

export const ContentComponent = defComp({
  name: "Content",
  description:
    "Text content block with optional title, subtitle and body markdown.",
  props: z.object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    body: z.string().optional(),
  }),
  component: (props: { title?: string; subtitle?: string; body?: string }) => {
    return React.createElement(
      "div",
      { className: "space-y-1 my-1" },
      props.title &&
        React.createElement(
          "h4",
          { className: "text-sm font-semibold text-foreground" },
          props.title
        ),
      props.subtitle &&
        React.createElement(
          "p",
          { className: "text-xs text-muted-foreground" },
          props.subtitle
        ),
      props.body &&
        React.createElement(
          "p",
          {
            className:
              "text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap",
          },
          props.body
        )
    )
  },
})

export const DataComponent = defComp({
  name: "Data",
  description: "Key-value data tile with trend indicator or badge.",
  props: z.object({
    label: z.string(),
    value: z.string(),
    trend: z.enum(["up", "down", "neutral"]).optional(),
    badge: z.string().optional(),
  }),
  component: (props: {
    label: string
    value: string
    trend?: "up" | "down" | "neutral"
    badge?: string
  }) => {
    return React.createElement(
      "div",
      {
        className:
          "p-3 rounded-lg border border-border bg-card text-card-foreground shadow-xs",
      },
      React.createElement(
        "span",
        { className: "text-xs font-medium text-muted-foreground" },
        props.label
      ),
      React.createElement(
        "div",
        { className: "text-lg font-bold text-foreground mt-0.5" },
        props.value
      ),
      props.badge &&
        React.createElement(
          "span",
          {
            className:
              "inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium",
          },
          props.badge
        )
    )
  },
})

export const EventCardComponent = defComp({
  name: "EventCard",
  description:
    "Calendar event badge displaying title, time range, attendees, and link.",
  props: z.object({
    summary: z.string(),
    start: z.string(),
    end: z.string().optional(),
    location: z.string().optional(),
    attendees: z.array(z.string()).optional(),
    htmlLink: z.string().optional(),
  }),
  component: (props: {
    summary: string
    start: string
    end?: string
    location?: string
    attendees?: string[]
    htmlLink?: string
  }) => {
    return React.createElement(
      "div",
      {
        className:
          "p-3.5 rounded-xl border border-border bg-background shadow-xs hover:border-primary/40 transition-all space-y-1.5",
      },
      React.createElement(
        "div",
        { className: "flex items-center justify-between" },
        React.createElement(
          "h5",
          { className: "text-xs font-semibold text-foreground" },
          props.summary
        ),
        props.htmlLink &&
          React.createElement(
            "a",
            {
              href: props.htmlLink,
              target: "_blank",
              rel: "noreferrer",
              className: "text-[11px] text-primary hover:underline font-medium",
            },
            "Open"
          )
      ),
      React.createElement(
        "p",
        { className: "text-[11px] text-muted-foreground" },
        `${props.start}${props.end ? ` – ${props.end}` : ""}`
      ),
      props.location &&
        React.createElement(
          "p",
          {
            className:
              "text-[11px] text-muted-foreground flex items-center gap-1",
          },
          React.createElement(IconLocation, { className: "size-3 shrink-0" }),
          props.location
        ),
      props.attendees &&
        props.attendees.length > 0 &&
        React.createElement(
          "p",
          {
            className:
              "text-[10px] text-muted-foreground truncate flex items-center gap-1",
          },
          React.createElement(IconUsers, { className: "size-3 shrink-0" }),
          props.attendees.join(", ")
        )
    )
  },
})

export const DocumentSentCardComponent = defComp({
  name: "DocumentSentCard",
  description:
    "Document dispatch card showing proposal or invoice sent status, share URL, and recipient.",
  props: z.object({
    documentTitle: z.string(),
    documentType: z.enum(["proposal", "invoice"]),
    shareUrl: z.string(),
    recipientEmail: z.string().optional(),
    status: z.string().optional().default("sent"),
    valueFormatted: z.string().optional(),
  }),
  component: (props: {
    documentTitle: string
    documentType: "proposal" | "invoice"
    shareUrl: string
    recipientEmail?: string
    status?: string
    valueFormatted?: string
  }) => {
    return React.createElement(
      "div",
      {
        className:
          "p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-2.5",
      },
      React.createElement(
        "div",
        { className: "flex items-center justify-between" },
        React.createElement(
          "div",
          { className: "flex items-center gap-2" },
          React.createElement(
            "span",
            {
              className:
                "px-2 py-0.5 text-[10px] uppercase font-bold rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
            },
            props.documentType
          ),
          React.createElement(
            "span",
            { className: "text-xs font-semibold text-foreground" },
            props.documentTitle
          )
        ),
        React.createElement(
          "span",
          {
            className:
              "text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1",
          },
          "Sent",
          React.createElement(IconCircleCheck, {
            className: "size-3 text-emerald-600 dark:text-emerald-400",
          })
        )
      ),
      props.recipientEmail &&
        React.createElement(
          "p",
          { className: "text-[11px] text-muted-foreground" },
          `Delivered to ${props.recipientEmail}`
        ),
      props.valueFormatted &&
        React.createElement(
          "p",
          { className: "text-xs font-semibold text-foreground" },
          props.valueFormatted
        ),
      React.createElement(
        "div",
        { className: "pt-1" },
        React.createElement(
          "a",
          {
            href: props.shareUrl,
            target: "_blank",
            rel: "noreferrer",
            className:
              "inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline",
          },
          "View Share Link →"
        )
      )
    )
  },
})

export const MetricGroupComponent = defComp({
  name: "MetricGroup",
  description: "Horizontal bar of 2 to 4 metric callouts.",
  props: z.object({
    metrics: z.array(
      z.object({
        label: z.string(),
        value: z.string(),
        change: z.string().optional(),
      })
    ),
  }),
  component: (props: {
    metrics: Array<{ label: string; value: string; change?: string }>
  }) => {
    return React.createElement(
      "div",
      { className: "grid grid-cols-2 md:grid-cols-4 gap-3 w-full my-2" },
      props.metrics.map((m, idx) =>
        React.createElement(
          "div",
          {
            key: idx,
            className: "p-3 rounded-lg border border-border bg-card shadow-xs",
          },
          React.createElement(
            "p",
            { className: "text-[11px] font-medium text-muted-foreground" },
            m.label
          ),
          React.createElement(
            "p",
            { className: "text-base font-bold text-foreground mt-0.5" },
            m.value
          ),
          m.change &&
            React.createElement(
              "p",
              { className: "text-[10px] text-emerald-600 font-medium mt-0.5" },
              m.change
            )
        )
      )
    )
  },
})

export const ChartComponent = defComp({
  name: "Chart",
  description: "Bar, line, or pie visualization chart.",
  props: z.object({
    type: z.enum(["bar", "line", "pie"]).optional().default("bar"),
    title: z.string().optional(),
    data: z.array(z.record(z.string(), z.unknown())),
    dataKeys: z.array(z.string()).optional(),
  }),
  component: (props: {
    title?: string
    data: Array<Record<string, unknown>>
  }) => {
    return React.createElement(
      "div",
      {
        className:
          "p-3.5 rounded-xl border border-border bg-card shadow-xs space-y-2 w-full",
      },
      props.title &&
        React.createElement(
          "h5",
          { className: "text-xs font-semibold text-foreground" },
          props.title
        ),
      React.createElement(
        "div",
        {
          className:
            "text-xs text-muted-foreground italic py-4 text-center border border-dashed border-border rounded",
        },
        `[Visualization: ${props.data.length} items]`
      )
    )
  },
})

export const DataTableComponent = defComp({
  name: "DataTable",
  description: "Structured data table with columns and rows.",
  props: z.object({
    columns: z.array(z.object({ key: z.string(), header: z.string() })),
    data: z.array(z.record(z.string(), z.unknown())),
  }),
  component: (props: {
    columns: Array<{ key: string; header: string }>
    data: Array<Record<string, unknown>>
  }) => {
    return React.createElement(
      "div",
      { className: "overflow-x-auto border border-border rounded-lg my-2" },
      React.createElement(
        "table",
        { className: "w-full text-left text-xs" },
        React.createElement(
          "thead",
          {
            className:
              "bg-muted/50 text-muted-foreground uppercase text-[10px] font-semibold border-b border-border",
          },
          React.createElement(
            "tr",
            null,
            props.columns.map((c) =>
              React.createElement(
                "th",
                { key: c.key, className: "px-3 py-2" },
                c.header
              )
            )
          )
        ),
        React.createElement(
          "tbody",
          { className: "divide-y divide-border" },
          props.data.map((row, idx) =>
            React.createElement(
              "tr",
              { key: idx, className: "hover:bg-muted/30" },
              props.columns.map((c) =>
                React.createElement(
                  "td",
                  {
                    key: c.key,
                    className:
                      "px-3 py-2 font-medium text-foreground whitespace-nowrap",
                  },
                  String(row[c.key] ?? "")
                )
              )
            )
          )
        )
      )
    )
  },
})

export const CalloutComponent = defComp({
  name: "Callout",
  description: "Important message callout box with severity color.",
  props: z.object({
    title: z.string().optional(),
    description: z.string(),
    variant: z
      .enum(["info", "success", "warning", "error"])
      .optional()
      .default("info"),
  }),
  component: (props: {
    title?: string
    description: string
    variant?: "info" | "success" | "warning" | "error"
  }) => {
    const variantStyles = {
      info: "border-blue-500/20 bg-blue-500/5 text-blue-900 dark:text-blue-200",
      success:
        "border-emerald-500/20 bg-emerald-500/5 text-emerald-900 dark:text-emerald-200",
      warning:
        "border-amber-500/20 bg-amber-500/5 text-amber-900 dark:text-amber-200",
      error:
        "border-rose-500/20 bg-rose-500/5 text-rose-900 dark:text-rose-200",
    }
    const style = variantStyles[props.variant ?? "info"]
    return React.createElement(
      "div",
      { className: `p-3 rounded-lg border text-xs ${style} my-2` },
      props.title &&
        React.createElement(
          "p",
          { className: "font-semibold mb-0.5" },
          props.title
        ),
      React.createElement(
        "p",
        { className: "leading-relaxed" },
        props.description
      )
    )
  },
})

export const LinkCardComponent = defComp({
  name: "LinkCard",
  description: "External or internal link button card.",
  props: z.object({
    title: z.string(),
    description: z.string().optional(),
    url: z.string(),
    badge: z.string().optional(),
  }),
  component: (props: {
    title: string
    description?: string
    url: string
    badge?: string
  }) => {
    return React.createElement(
      "a",
      {
        href: props.url,
        target: "_blank",
        rel: "noreferrer",
        className:
          "block p-3 rounded-xl border border-border bg-card hover:border-primary/40 transition-all text-xs my-1 space-y-1",
      },
      React.createElement(
        "div",
        { className: "flex items-center justify-between" },
        React.createElement(
          "span",
          { className: "font-semibold text-foreground" },
          props.title
        ),
        props.badge &&
          React.createElement(
            "span",
            {
              className:
                "text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground",
            },
            props.badge
          )
      ),
      props.description &&
        React.createElement(
          "p",
          { className: "text-[11px] text-muted-foreground" },
          props.description
        )
    )
  },
})

export const DividerComponent = defComp({
  name: "Divider",
  description: "Horizontal visual divider line with optional label.",
  props: z.object({
    label: z.string().optional(),
  }),
  component: (props: { label?: string }) => {
    return React.createElement(
      "div",
      { className: "relative my-3 flex items-center justify-center" },
      React.createElement(
        "div",
        { className: "absolute inset-0 flex items-center" },
        React.createElement("div", {
          className: "w-full border-t border-border",
        })
      ),
      props.label &&
        React.createElement(
          "span",
          {
            className:
              "relative bg-background px-2 text-[10px] font-medium text-muted-foreground uppercase",
          },
          props.label
        )
    )
  },
})

export const library = (createLibrary as any)({
  name: "parliament-openui",
  root: "Stack",
  components: [
    StackComponent,
    LayoutComponent,
    ContentComponent,
    DataComponent,
    EventCardComponent,
    DocumentSentCardComponent,
    MetricGroupComponent,
    ChartComponent,
    DataTableComponent,
    CalloutComponent,
    LinkCardComponent,
    DividerComponent,
  ],
})
