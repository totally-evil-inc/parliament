import {
  Image01Icon,
  LayoutTableIcon,
  PlusSignIcon,
  QuillWrite02Icon,
  TextFontIcon,
  Tick01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons"
import { MetricPreview } from "./metric-preview"
import { TeamPreview } from "./team-preview"
import { TestimonialPreview } from "./testimonial-preview"
import type { DocumentBlockDefinition } from "../../core/types"

import { Gallery } from "../extensions/gallery"
import { Faq } from "../extensions/faq"
import { KeyNumbers } from "../extensions/key-numbers"
import { ProposalSection } from "../extensions/proposal-section"
import { TeamMembers } from "../extensions/team-members"
import { Testimonials } from "../extensions/testimonials"

const field = (text: string) => ({
  type: "doc",
  content: text ? [{ type: "text", text }] : [],
})

const paragraph = (text: string) => ({
  type: "doc",
  content: text
    ? [{ type: "paragraph", content: [{ type: "text", text }] }]
    : [],
})

const timelineContent = {
  type: "timeline",
  content: [
    {
      type: "timelineItem",
      content: [
        {
          type: "timelineDate",
          content: [{ type: "text", text: "March 15, 2024" }],
        },
        {
          type: "timelineTitle",
          content: [{ type: "text", text: "Project Kickoff" }],
        },
        {
          type: "timelineDescription",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Initial team meeting and project scope definition. Established key milestones and resource allocation.",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}

export const proposalBlocks: Array<DocumentBlockDefinition> = [
  {
    kind: "insertable",
    id: "proposal-section",
    nodeType: "proposalSection",
    label: "Section",
    description: "Add a structured proposal narrative section.",
    searchTerms: ["section", "summary", "scope", "deliverables", "content"],
    icon: TextFontIcon,
    extension: ProposalSection,
    showInSlashMenu: true,
    showInFloatingMenu: true,
    showInSidebar: true,
    createContent: (layout) => ({
      type: "proposalSection",
      attrs: {
        eyebrow: layout?.attrs?.eyebrow ?? field("Section"),
        title: layout?.attrs?.title ?? field("Section title"),
        lead:
          layout?.attrs?.lead ??
          field("Add a concise lead-in for this section."),
        variant: layout?.attrs?.variant ?? "default",
        content:
          layout?.attrs?.content ??
          paragraph("Explain the important details, outcomes, and decisions."),
      },
    }),
    preview: (
      <div className="mt-2 space-y-1.5">
        <div className="h-1.5 w-14 rounded-full bg-primary/60" />
        <div className="h-2.5 w-3/4 rounded-full bg-muted/70" />
        <div className="h-1.5 w-full rounded-full bg-muted/50" />
        <div className="h-1.5 w-2/3 rounded-full bg-muted/50" />
      </div>
    ),
    layouts: [
      {
        id: "section-default",
        name: "Narrative Section",
        description: "Standard heading, lead, and body copy",
        attrs: {
          eyebrow: field("Overview"),
          title: field("What we will accomplish"),
          lead: field(
            "Summarize the client outcome in one confident sentence."
          ),
          variant: "default",
          content: paragraph(
            "Use this section to explain the recommendation, scope, assumptions, or next decision."
          ),
        },
        preview: (
          <div className="flex h-20 w-full flex-col justify-center gap-1.5">
            <div className="h-1.5 w-12 rounded-full bg-primary/70" />
            <div className="h-2.5 w-4/5 rounded-full bg-muted/60" />
            <div className="h-1.5 w-full rounded-full bg-muted/40" />
            <div className="h-1.5 w-2/3 rounded-full bg-muted/40" />
          </div>
        ),
      },
      {
        id: "section-accent",
        name: "Accent Section",
        description: "Framed section for summaries and next steps",
        attrs: {
          eyebrow: field("Recommendation"),
          title: field("The clearest path forward"),
          lead: field("Highlight the main proposal argument."),
          variant: "accent",
          content: paragraph(
            "Use this section for executive summaries, recommendations, or approval steps."
          ),
        },
        preview: (
          <div className="flex h-20 w-full flex-col justify-center gap-1.5 rounded-xl border border-primary/20 bg-primary/10 p-3">
            <div className="h-1.5 w-12 rounded-full bg-primary/70" />
            <div className="h-2.5 w-4/5 rounded-full bg-muted/70" />
            <div className="h-1.5 w-full rounded-full bg-muted/50" />
          </div>
        ),
      },
      {
        id: "section-compact",
        name: "Compact Section",
        description: "Tighter section for deliverables and notes",
        attrs: {
          eyebrow: field("Deliverables"),
          title: field("What is included"),
          lead: field(""),
          variant: "compact",
          content: paragraph("List the concrete deliverables or constraints."),
        },
        preview: (
          <div className="flex h-20 w-full flex-col justify-center gap-1.5 border-t border-border/60 pt-3">
            <div className="h-1.5 w-16 rounded-full bg-primary/60" />
            <div className="h-2.5 w-2/3 rounded-full bg-muted/60" />
            <div className="h-1.5 w-4/5 rounded-full bg-muted/40" />
          </div>
        ),
      },
    ],
  },
  {
    kind: "insertable",
    id: "key-numbers",
    nodeType: "keyNumbers",
    label: "Key Numbers",
    description: "Highlight important metrics.",
    searchTerms: ["key numbers", "metrics", "stats", "highlights"],
    icon: PlusSignIcon,
    extension: KeyNumbers,
    showInSlashMenu: true,
    showInFloatingMenu: true,
    showInSidebar: true,
    createContent: (layout) => {
      const columns = layout?.attrs?.columns ?? 3
      const metrics = layout?.attrs?.metrics ?? [
        {
          value: "150+",
          label: "Projects Delivered",
          detail: "Successfully completed across multiple industries",
        },
        {
          value: "$10M",
          label: "Managed budget",
          detail: "Add muted context that supports this metric.",
        },
        {
          value: "24/7",
          label: "Support coverage",
          detail: "Describe the promise, impact, or scope behind it.",
        },
      ]
      return {
        type: "keyNumbers",
        attrs: {
          columns,
          items: metrics.map((metric: any, index: number) => ({
            id: metric.id ?? `metric-${index + 1}`,
            value: field(metric.value ?? ""),
            label: field(metric.label ?? ""),
            detail: field(metric.detail ?? ""),
          })),
        },
      }
    },
    preview: (
      <div className="mt-2 flex h-12 w-full gap-1.5">
        <MetricPreview value="99%" label="Stat" />
        <MetricPreview value="$10M" label="Stat" />
        <MetricPreview value="24/7" label="Stat" />
      </div>
    ),
    layouts: [
      {
        id: "key-numbers-1",
        name: "1-Column Metrics",
        description: "Feature one headline metric with supporting context",
        attrs: {
          columns: 1,
          metrics: [
            {
              value: "99%",
              label: "Projects Delivered",
              detail: "Briefly explain what makes this result meaningful.",
            },
          ],
        },
        preview: (
          <div className="flex h-20 w-full items-center justify-center">
            <MetricPreview value="99%" label="Projects" detail />
          </div>
        ),
      },
      {
        id: "key-numbers-2",
        name: "2-Column Metrics",
        description: "Compare two important numbers side by side",
        attrs: {
          columns: 2,
          metrics: [
            {
              value: "99%",
              label: "Projects Delivered",
              detail: "Briefly explain what makes this result meaningful.",
            },
            {
              value: "$10M",
              label: "Managed budget",
              detail: "Add muted context that supports this metric.",
            },
          ],
        },
        preview: (
          <div className="flex h-20 w-full gap-2.5">
            <MetricPreview value="99%" label="Projects" detail />
            <MetricPreview value="$10M" label="Budget" detail />
          </div>
        ),
      },
      {
        id: "key-numbers-3",
        name: "3-Column Metrics",
        description: "Showcase three core metrics or KPIs in a clean grid",
        attrs: {
          columns: 3,
          metrics: [
            {
              value: "150+",
              label: "Projects Delivered",
              detail: "Successfully completed across multiple industries",
            },
            {
              value: "$10M",
              label: "Managed budget",
              detail: "Add muted context that supports this metric.",
            },
            {
              value: "24/7",
              label: "Support coverage",
              detail: "Describe the promise, impact, or scope behind it.",
            },
          ],
        },
        preview: (
          <div className="flex h-20 w-full gap-2.5">
            <MetricPreview value="150+" label="Projects" detail />
            <MetricPreview value="$10M" label="Budget" detail />
            <MetricPreview value="24/7" label="Support" detail />
          </div>
        ),
      },
    ],
  },
  {
    kind: "insertable",
    id: "team-members",
    nodeType: "teamMembers",
    label: "Team Members",
    description: "Showcase your team experts.",
    searchTerms: ["team", "members", "people", "staff"],
    icon: UserIcon,
    extension: TeamMembers,
    showInSlashMenu: true,
    showInFloatingMenu: true,
    showInSidebar: true,
    createContent: (layout) => {
      const columns = layout?.attrs?.columns ?? 3
      const members = layout?.attrs?.members ?? [
        {
          name: "Alex Morgan",
          role: "Project Lead",
          bio: "Guides delivery strategy and keeps every milestone aligned.",
        },
        {
          name: "Jamie Chen",
          role: "Design Director",
          bio: "Shapes the customer experience across every touchpoint.",
        },
        {
          name: "Taylor Brooks",
          role: "Technical Lead",
          bio: "Owns the implementation plan from architecture to launch.",
        },
      ]
      return {
        type: "teamMembers",
        attrs: {
          columns,
          items: members.map((member: any, index: number) => ({
            id: member.id ?? `member-${index + 1}`,
            name: field(member.name ?? ""),
            role: field(member.role ?? ""),
            bio: field(member.bio ?? ""),
          })),
        },
      }
    },
    preview: (
      <div className="mt-2 flex h-12 w-full items-center justify-center gap-4">
        <TeamPreview />
        <TeamPreview />
        <TeamPreview />
      </div>
    ),
    layouts: [
      {
        id: "team-members-1",
        name: "1-Member Team",
        description: "Highlight one project owner or point of contact",
        attrs: {
          columns: 1,
          members: [
            {
              name: "Alex Morgan",
              role: "Project Lead",
              bio: "Guides delivery strategy and keeps every milestone aligned.",
            },
          ],
        },
        preview: (
          <div className="flex h-20 w-full items-center justify-center px-8">
            <TeamPreview />
          </div>
        ),
      },
      {
        id: "team-members-2",
        name: "2-Member Team",
        description: "Introduce two leads with clear responsibilities",
        attrs: {
          columns: 2,
          members: [
            {
              name: "Alex Morgan",
              role: "Project Lead",
              bio: "Guides delivery strategy and keeps every milestone aligned.",
            },
            {
              name: "Jamie Chen",
              role: "Design Director",
              bio: "Shapes the customer experience across every touchpoint.",
            },
          ],
        },
        preview: (
          <div className="flex h-20 w-full items-center justify-around gap-4 px-4">
            <TeamPreview />
            <TeamPreview />
          </div>
        ),
      },
      {
        id: "team-members-3",
        name: "3-Member Team",
        description: "Display your core team members in a clean grid",
        attrs: {
          columns: 3,
          members: [
            {
              name: "Alex Morgan",
              role: "Project Lead",
              bio: "Guides delivery strategy and keeps every milestone aligned.",
            },
            {
              name: "Jamie Chen",
              role: "Design Director",
              bio: "Shapes the customer experience across every touchpoint.",
            },
            {
              name: "Taylor Brooks",
              role: "Technical Lead",
              bio: "Owns the implementation plan from architecture to launch.",
            },
          ],
        },
        preview: (
          <div className="flex h-20 w-full items-center justify-around gap-2 px-2">
            <TeamPreview />
            <TeamPreview />
            <TeamPreview />
          </div>
        ),
      },
    ],
  },
  {
    kind: "insertable",
    id: "testimonials",
    nodeType: "testimonials",
    label: "Testimonials",
    description: "Showcase client quotes and social proof.",
    searchTerms: ["testimonials", "quotes", "clients", "reviews"],
    icon: QuillWrite02Icon,
    extension: Testimonials,
    showInSlashMenu: true,
    showInFloatingMenu: true,
    showInSidebar: true,
    createContent: (layout) => {
      const columns = layout?.attrs?.columns ?? 3
      const testimonials = layout?.attrs?.testimonials ?? [
        {
          content:
            "The team brought clarity, speed, and care to every phase of the project.",
          author: "Jane Doe",
          role: "CEO, Tech Corp",
        },
        {
          content:
            "Their process helped us move faster without sacrificing quality or alignment.",
          author: "Michael Smith",
          role: "Founder, Northstar Labs",
        },
        {
          content:
            "We had confidence in the plan from kickoff through final delivery.",
          author: "Priya Patel",
          role: "COO, Atlas Studio",
        },
      ]
      return {
        type: "testimonials",
        attrs: {
          columns,
          items: testimonials.map((testimonial: any, index: number) => ({
            id: testimonial.id ?? `testimonial-${index + 1}`,
            quote: field(testimonial.content ?? testimonial.quote ?? ""),
            author: field(testimonial.author ?? ""),
            role: field(testimonial.role ?? ""),
          })),
        },
      }
    },
    preview: (
      <div className="mt-2 flex h-12 w-full items-center gap-2">
        <TestimonialPreview />
        <TestimonialPreview />
      </div>
    ),
    layouts: [
      {
        id: "testimonials-1",
        name: "1-Column Testimonials",
        description: "Feature one quote with attribution",
        attrs: {
          columns: 1,
          testimonials: [
            {
              content:
                "The team brought clarity, speed, and care to every phase of the project.",
              author: "Jane Doe",
              role: "CEO, Tech Corp",
              avatar: "",
            },
          ],
        },
        preview: (
          <div className="flex h-20 w-full items-center px-6">
            <TestimonialPreview />
          </div>
        ),
      },
      {
        id: "testimonials-2",
        name: "2-Column Testimonials",
        description: "Showcase two client quotes side by side",
        attrs: {
          columns: 2,
          testimonials: [
            {
              content:
                "The team brought clarity, speed, and care to every phase of the project.",
              author: "Jane Doe",
              role: "CEO, Tech Corp",
              avatar: "",
            },
            {
              content:
                "Their process helped us move faster without sacrificing quality or alignment.",
              author: "Michael Smith",
              role: "Founder, Northstar Labs",
              avatar: "",
            },
          ],
        },
        preview: (
          <div className="flex h-20 w-full items-center gap-3">
            <TestimonialPreview />
            <TestimonialPreview />
          </div>
        ),
      },
      {
        id: "testimonials-3",
        name: "3-Column Testimonials",
        description: "Display three concise testimonials in a clean grid",
        attrs: {
          columns: 3,
          testimonials: [
            {
              content:
                "The team brought clarity, speed, and care to every phase of the project.",
              author: "Jane Doe",
              role: "CEO, Tech Corp",
              avatar: "",
            },
            {
              content:
                "Their process helped us move faster without sacrificing quality or alignment.",
              author: "Michael Smith",
              role: "Founder, Northstar Labs",
              avatar: "",
            },
            {
              content:
                "We had confidence in the plan from kickoff through final delivery.",
              author: "Priya Patel",
              role: "COO, Atlas Studio",
              avatar: "",
            },
          ],
        },
        preview: (
          <div className="flex h-20 w-full items-center gap-2">
            <TestimonialPreview />
            <TestimonialPreview />
            <TestimonialPreview />
          </div>
        ),
      },
    ],
  },
  {
    kind: "insertable",
    id: "faq",
    nodeType: "proposalFaq",
    label: "FAQ",
    description: "Answer common client questions.",
    searchTerms: ["faq", "questions", "answers", "objections"],
    icon: QuillWrite02Icon,
    extension: Faq,
    showInSlashMenu: true,
    showInFloatingMenu: true,
    showInSidebar: true,
    createContent: (layout) => ({
      type: "proposalFaq",
      attrs: {
        variant: "list",
        items: layout?.attrs?.items ?? [
          {
            id: "faq-1",
            question: field("What happens after approval?"),
            answer: paragraph(
              "We confirm stakeholders, collect access, and schedule the kickoff session."
            ),
          },
          {
            id: "faq-2",
            question: field("Can the scope change later?"),
            answer: paragraph(
              "Yes. We will document any changes and confirm the impact before work continues."
            ),
          },
        ],
      },
    }),
    preview: (
      <div className="mt-2 space-y-2">
        <div className="h-2 w-4/5 rounded-full bg-muted/70" />
        <div className="h-1.5 w-full rounded-full bg-muted/40" />
        <div className="h-2 w-2/3 rounded-full bg-muted/70" />
        <div className="h-1.5 w-5/6 rounded-full bg-muted/40" />
      </div>
    ),
    layouts: [
      {
        id: "faq-list",
        name: "Simple FAQ",
        description: "A clean list of questions and answers",
        attrs: {
          items: [
            {
              id: "faq-1",
              question: field("What happens after approval?"),
              answer: paragraph(
                "We confirm stakeholders, collect access, and schedule the kickoff session."
              ),
            },
            {
              id: "faq-2",
              question: field("Can the scope change later?"),
              answer: paragraph(
                "Yes. We will document any changes and confirm the impact before work continues."
              ),
            },
            {
              id: "faq-3",
              question: field("How will updates be shared?"),
              answer: paragraph(
                "You will receive weekly updates, milestone reviews, and a final handover."
              ),
            },
          ],
        },
        preview: (
          <div className="flex h-20 w-full flex-col justify-center gap-2">
            <div className="h-2 w-4/5 rounded-full bg-muted/70" />
            <div className="h-1.5 w-full rounded-full bg-muted/40" />
            <div className="h-2 w-2/3 rounded-full bg-muted/70" />
            <div className="h-1.5 w-5/6 rounded-full bg-muted/40" />
          </div>
        ),
      },
    ],
  },
  {
    kind: "insertable",
    id: "gallery",
    nodeType: "gallery",
    label: "Gallery",
    description: "Showcase images in a grid.",
    searchTerms: ["gallery", "images", "photos", "grid"],
    icon: Image01Icon,
    extension: Gallery,
    showInSlashMenu: true,
    showInFloatingMenu: true,
    showInSidebar: true,
    createContent: () => ({ type: "gallery" }),
    preview: (
      <div className="mt-2 grid h-12 w-full grid-cols-3 gap-1">
        <div className="col-span-2 rounded-lg border border-border/30 bg-muted/65" />
        <div className="flex flex-col gap-1">
          <div className="flex-1 rounded-lg border border-border/30 bg-muted/60" />
          <div className="flex-1 rounded-lg border border-border/30 bg-muted/60" />
        </div>
      </div>
    ),
    layouts: [
      {
        id: "gallery-grid",
        name: "Grid Layout Gallery",
        description:
          "A beautiful staggered grid layout for case studies and media",
        preview: (
          <div className="grid h-20 w-full grid-cols-3 gap-1.5">
            <div className="col-span-2 rounded-xl border border-border/40 bg-muted/50 shadow-sm" />
            <div className="flex flex-col gap-1.5">
              <div className="flex-1 rounded-xl border border-border/40 bg-muted/50 shadow-sm" />
              <div className="flex-1 rounded-xl border border-border/40 bg-muted/50 shadow-sm" />
            </div>
          </div>
        ),
      },
    ],
  },
  {
    kind: "insertable",
    id: "timeline",
    nodeType: "timeline",
    label: "Timeline",
    description: "Create a vertical timeline of events.",
    searchTerms: ["timeline", "events", "milestones", "history", "roadmap"],
    icon: Tick01Icon,
    showInSlashMenu: true,
    showInFloatingMenu: true,
    showInSidebar: true,
    createContent: (layout) => ({
      type: "timeline",
      content: layout?.content ?? timelineContent.content,
    }),
    preview: (
      <div className="mt-2 flex h-12 w-full flex-col justify-center gap-2 px-3">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-primary/70" />
          <div className="h-1 w-full rounded-full bg-muted/50" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
          <div className="h-1 w-2/3 rounded-full bg-muted/50" />
        </div>
      </div>
    ),
    layouts: [
      {
        id: "project-timeline",
        name: "Project Timeline",
        description: "Deliverables checklist and phase progression dates",
        content: timelineContent.content,
        preview: (
          <div className="flex h-20 w-full flex-col justify-center gap-2 px-4">
            <div className="flex items-center gap-2.5">
              <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary/80" />
              <div className="flex flex-1 flex-col gap-1">
                <div className="h-2 w-3/4 rounded-full bg-muted/40" />
                <div className="h-1 w-1/2 rounded-full bg-muted/30" />
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary/80" />
              <div className="flex flex-1 flex-col gap-1">
                <div className="h-2 w-2/3 rounded-full bg-muted/40" />
                <div className="h-1 w-1/3 rounded-full bg-muted/30" />
              </div>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    kind: "singleton",
    id: "line-items",
    nodeType: "lineItems",
    label: "Pricing Table",
    description: "Compare plans, rates, pricing, and scope list features.",
    searchTerms: ["pricing", "table", "line items", "rates", "scope"],
    icon: LayoutTableIcon,
    showInSidebar: true,
    createContent: () => ({ type: "lineItems" }),
    preview: (
      <div className="mt-2 flex h-12 w-full flex-col justify-center gap-1 rounded-lg border border-border/25 bg-muted/30 p-1.5">
        <div className="flex gap-1 border-b border-border/20 pb-0.5">
          <div className="h-1.5 flex-1 rounded-full bg-muted/65" />
          <div className="h-1.5 flex-1 rounded-full bg-muted/65" />
        </div>
        <div className="mt-0.5 flex gap-1">
          <div className="h-1 flex-1 rounded-full bg-muted/50" />
          <div className="h-1 flex-1 rounded-full bg-muted/50" />
        </div>
        <div className="flex gap-1">
          <div className="h-1 flex-1 rounded-full bg-muted/50" />
          <div className="h-1 flex-1 rounded-full bg-muted/50" />
        </div>
      </div>
    ),
    layouts: [
      {
        id: "pricing-comparison",
        name: "Pricing Comparison Table",
        description: "Compare plans, rates, pricing, and scope list features",
        preview: (
          <div className="flex h-20 w-full flex-col justify-center gap-1.5 rounded-xl border border-border/40 bg-muted/20 p-2.5 shadow-sm">
            <div className="flex gap-2 border-b border-border/30 pb-1.5">
              <div className="h-2 flex-1 rounded-full bg-muted/50" />
              <div className="h-2 flex-1 rounded-full bg-muted/50" />
            </div>
            <div className="flex gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-muted/40" />
              <div className="h-1.5 flex-1 rounded-full bg-muted/40" />
            </div>
            <div className="flex gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-muted/40" />
              <div className="h-1.5 flex-1 rounded-full bg-muted/40" />
            </div>
          </div>
        ),
      },
    ],
  },
]
