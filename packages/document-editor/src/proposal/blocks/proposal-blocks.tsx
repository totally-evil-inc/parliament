import {
  Image01Icon,
  LayoutTableIcon,
  PlusSignIcon,
  QuillWrite02Icon,
  TextFontIcon,
  Tick01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons"
import type { DocumentBlockDefinition } from "../../core/types"
import { Faq } from "../extensions/faq"
import { Gallery } from "../extensions/gallery"
import { KeyNumbers } from "../extensions/key-numbers"
import { ProposalSection } from "../extensions/proposal-section"
import { TeamMembers } from "../extensions/team-members"
import { Testimonials } from "../extensions/testimonials"
import {
  ProposalColumns,
  ProposalCover,
  ProposalImageCards,
  ProposalImageText,
  ProposalSignature,
} from "../extensions/visual-blocks"
import { MetricPreview } from "./metric-preview"
import { TeamPreview } from "./team-preview"
import { TestimonialPreview } from "./testimonial-preview"

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

type RichDoc = ReturnType<typeof field> | ReturnType<typeof paragraph>

const inlineField = (type: string, value: RichDoc) => ({
  type,
  content: value.content,
})

const blockField = (type: string, value: RichDoc) => ({
  type,
  content: value.content.length ? value.content : [{ type: "paragraph" }],
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

const coverSplitPreview = (
  <div className="grid h-20 w-full grid-cols-[1fr_3rem] gap-2">
    <div className="flex flex-col justify-center gap-1.5">
      <div className="h-1.5 w-10 rounded-full bg-primary/70" />
      <div className="h-2.5 w-full rounded-full bg-muted/70" />
      <div className="h-1.5 w-4/5 rounded-full bg-muted/40" />
    </div>
    <div className="rounded-lg bg-muted/60" />
  </div>
)

const coverMinimalPreview = (
  <div className="flex h-20 w-full flex-col justify-center gap-1.5">
    <div className="h-1.5 w-10 rounded-full bg-primary/70" />
    <div className="h-2.5 w-4/5 rounded-full bg-muted/70" />
    <div className="h-1.5 w-full rounded-full bg-muted/40" />
  </div>
)

const twoColumnPreview = (
  <div className="grid h-20 w-full grid-cols-2 gap-2">
    <div className="rounded-lg border-border border-t bg-muted/40" />
    <div className="rounded-lg border-border border-t bg-muted/40" />
  </div>
)

const threeColumnPreview = (
  <div className="grid h-20 w-full grid-cols-3 gap-1.5">
    <div className="rounded-lg border-border border-t bg-muted/40" />
    <div className="rounded-lg border-border border-t bg-muted/40" />
    <div className="rounded-lg border-border border-t bg-muted/40" />
  </div>
)

const imageTextPreview = (
  <div className="grid h-20 w-full grid-cols-2 gap-2">
    <div className="rounded-lg bg-muted/60" />
    <div className="flex flex-col justify-center gap-1.5">
      <div className="h-1.5 w-10 rounded-full bg-primary/70" />
      <div className="h-2.5 w-full rounded-full bg-muted/70" />
      <div className="h-1.5 w-4/5 rounded-full bg-muted/40" />
    </div>
  </div>
)

const imageCardsPreview = (
  <div className="grid h-20 w-full grid-cols-3 gap-1.5">
    <div className="rounded-lg border border-border/40 bg-muted/45" />
    <div className="rounded-lg border border-border/40 bg-muted/45" />
    <div className="rounded-lg border border-border/40 bg-muted/45" />
  </div>
)

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
        variant: layout?.attrs?.variant ?? "default",
      },
      content: [
        inlineField(
          "proposalSectionEyebrow",
          layout?.attrs?.eyebrow ?? field("Section")
        ),
        inlineField(
          "proposalSectionTitle",
          layout?.attrs?.title ?? field("Section title")
        ),
        inlineField(
          "proposalSectionLead",
          layout?.attrs?.lead ??
            field("Add a concise lead-in for this section.")
        ),
        blockField(
          "proposalSectionBody",
          layout?.attrs?.content ??
            paragraph("Explain the important details, outcomes, and decisions.")
        ),
      ],
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
          <div className="flex h-20 w-full flex-col justify-center gap-1.5 border-border/60 border-t pt-3">
            <div className="h-1.5 w-16 rounded-full bg-primary/60" />
            <div className="h-2.5 w-2/3 rounded-full bg-muted/60" />
            <div className="h-1.5 w-4/5 rounded-full bg-muted/40" />
          </div>
        ),
      },
      {
        id: "section-executive-summary",
        name: "Executive Summary",
        description: "Recommendation-led summary for decision makers",
        attrs: {
          eyebrow: field("Executive Summary"),
          title: field("The clearest path forward"),
          lead: field("Summarize the business outcome and recommendation."),
          variant: "accent",
          content: paragraph(
            "Explain why this plan is the right next move and what approval unlocks."
          ),
        },
        preview: (
          <div className="flex h-20 w-full flex-col justify-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 p-3">
            <div className="h-1.5 w-16 rounded-full bg-primary/70" />
            <div className="h-2.5 w-4/5 rounded-full bg-muted/70" />
            <div className="h-1.5 w-full rounded-full bg-muted/50" />
          </div>
        ),
      },
      {
        id: "section-scope-narrative",
        name: "Scope Narrative",
        description: "Describe the work and boundaries clearly",
        attrs: {
          eyebrow: field("Scope"),
          title: field("What is included"),
          lead: field("Set expectations before pricing and delivery details."),
          variant: "default",
          content: paragraph(
            "Describe the work, deliverables, assumptions, and collaboration required."
          ),
        },
        preview: (
          <div className="flex h-20 w-full flex-col justify-center gap-1.5">
            <div className="h-1.5 w-10 rounded-full bg-primary/70" />
            <div className="h-2.5 w-2/3 rounded-full bg-muted/60" />
            <div className="h-1.5 w-full rounded-full bg-muted/40" />
            <div className="h-1.5 w-5/6 rounded-full bg-muted/40" />
          </div>
        ),
      },
      {
        id: "section-deliverables",
        name: "Deliverables List",
        description: "Compact section for included outputs",
        attrs: {
          eyebrow: field("Deliverables"),
          title: field("What you will receive"),
          lead: field(""),
          variant: "compact",
          content: paragraph(
            "List the concrete assets, handover materials, and outcomes."
          ),
        },
        preview: (
          <div className="flex h-20 w-full flex-col justify-center gap-1.5 border-border/60 border-t pt-3">
            <div className="h-1.5 w-16 rounded-full bg-primary/60" />
            <div className="h-2.5 w-3/4 rounded-full bg-muted/60" />
            <div className="h-1.5 w-4/5 rounded-full bg-muted/40" />
          </div>
        ),
      },
      {
        id: "section-next-steps",
        name: "Next Steps",
        description: "Close with a clear approval path",
        attrs: {
          eyebrow: field("Next Steps"),
          title: field("How we move forward"),
          lead: field("Make the approval path obvious and low-friction."),
          variant: "accent",
          content: paragraph(
            "Confirm approval, schedule kickoff, collect access, and begin the first milestone."
          ),
        },
        preview: (
          <div className="flex h-20 w-full flex-col justify-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 p-3">
            <div className="h-1.5 w-14 rounded-full bg-primary/70" />
            <div className="h-2.5 w-3/4 rounded-full bg-muted/70" />
            <div className="h-1.5 w-5/6 rounded-full bg-muted/50" />
          </div>
        ),
      },
      {
        id: "section-risk-assumptions",
        name: "Risk Note",
        description: "Capture risks, dependencies, or assumptions",
        attrs: {
          eyebrow: field("Assumptions"),
          title: field("What this plan depends on"),
          lead: field("Surface important constraints before approval."),
          variant: "compact",
          content: paragraph(
            "Document client inputs, access needs, timing dependencies, and known risks."
          ),
        },
        preview: (
          <div className="flex h-20 w-full flex-col justify-center gap-1.5 border-border/60 border-t pt-3">
            <div className="h-1.5 w-20 rounded-full bg-primary/60" />
            <div className="h-2.5 w-4/5 rounded-full bg-muted/60" />
            <div className="h-1.5 w-full rounded-full bg-muted/40" />
          </div>
        ),
      },
    ],
  },
  {
    kind: "insertable",
    id: "proposal-cover",
    nodeType: "proposalCover",
    label: "Cover",
    description: "Add a visual proposal opening section.",
    searchTerms: ["cover", "hero", "title", "opening"],
    icon: Image01Icon,
    extension: ProposalCover,
    showInSlashMenu: true,
    showInFloatingMenu: true,
    showInSidebar: true,
    createContent: (layout) => ({
      type: "proposalCover",
      attrs: {
        variant: layout?.attrs?.variant ?? "split",
      },
      content: [
        inlineField(
          "proposalCoverEyebrow",
          layout?.attrs?.eyebrow ?? field("Proposal")
        ),
        inlineField(
          "proposalCoverTitle",
          layout?.attrs?.title ?? field("Project proposal")
        ),
        inlineField(
          "proposalCoverSubtitle",
          layout?.attrs?.subtitle ??
            field("A focused plan for the next phase of work.")
        ),
      ],
    }),
    preview: (
      <div className="mt-2 grid h-12 w-full grid-cols-[1fr_2.5rem] gap-2">
        <div className="space-y-1.5">
          <div className="h-1.5 w-10 rounded-full bg-primary/70" />
          <div className="h-2.5 w-full rounded-full bg-muted/70" />
          <div className="h-1.5 w-4/5 rounded-full bg-muted/40" />
        </div>
        <div className="rounded-lg bg-muted/60" />
      </div>
    ),
    layouts: [
      {
        id: "cover-split",
        name: "Split Cover",
        description: "Headline and supporting visual",
        attrs: {
          eyebrow: field("Proposal"),
          title: field("Website redesign and growth platform"),
          subtitle: field("A focused plan for strategy, design, and launch."),
          variant: "split",
        },
        preview: coverSplitPreview,
      },
      {
        id: "cover-band",
        name: "Band Cover",
        description: "Editorial opening with broad visual emphasis",
        attrs: {
          eyebrow: field("Proposal"),
          title: field("A practical path to launch"),
          subtitle: field("Structured milestones, clear scope, and pricing."),
          variant: "band",
        },
        preview: coverSplitPreview,
      },
      {
        id: "cover-minimal",
        name: "Minimal Cover",
        description: "Text-first opening for formal proposals",
        attrs: {
          eyebrow: field("Proposal"),
          title: field("Project proposal"),
          subtitle: field("Prepared for review and approval."),
          variant: "minimal",
        },
        preview: coverMinimalPreview,
      },
    ],
  },
  {
    kind: "insertable",
    id: "proposal-columns",
    nodeType: "proposalColumns",
    label: "Columns",
    description: "Compare scope, value props, or deliverables.",
    searchTerms: ["columns", "layout", "compare", "deliverables"],
    icon: LayoutTableIcon,
    extension: ProposalColumns,
    showInSlashMenu: true,
    showInFloatingMenu: true,
    showInSidebar: true,
    createContent: (layout) => {
      const columns = layout?.attrs?.columns ?? 3
      const items = layout?.attrs?.items ?? [
        {
          id: "column-1",
          heading: field("Discover"),
          body: paragraph("Clarify goals, constraints, and success measures."),
        },
        {
          id: "column-2",
          heading: field("Design"),
          body: paragraph("Shape the experience and visual system."),
        },
        {
          id: "column-3",
          heading: field("Launch"),
          body: paragraph("Build, QA, hand over, and support launch."),
        },
      ]
      return {
        type: "proposalColumns",
        attrs: {
          columns,
        },
        content: [
          inlineField(
            "proposalColumnsTitle",
            layout?.attrs?.title ?? field("How we will approach the work")
          ),
          ...items.map((item: any) => ({
            type: "proposalColumnItem",
            attrs: { id: item.id },
            content: [
              inlineField("proposalColumnHeading", item.heading),
              blockField("proposalColumnBody", item.body),
            ],
          })),
        ],
      }
    },
    preview: (
      <div className="mt-2 grid h-12 w-full grid-cols-3 gap-1.5">
        <div className="rounded-lg border-border border-t bg-muted/40" />
        <div className="rounded-lg border-border border-t bg-muted/40" />
        <div className="rounded-lg border-border border-t bg-muted/40" />
      </div>
    ),
    layouts: [
      {
        id: "columns-two",
        name: "Two Columns",
        description: "Side-by-side comparison or split narrative",
        attrs: {
          columns: 2,
          title: field("Two clear workstreams"),
          items: [
            {
              id: "column-1",
              heading: field("Strategy"),
              body: paragraph("Define the direction, content, and priorities."),
            },
            {
              id: "column-2",
              heading: field("Delivery"),
              body: paragraph("Execute the plan with clear milestones."),
            },
          ],
        },
        preview: twoColumnPreview,
      },
      {
        id: "columns-three",
        name: "Three Columns",
        description: "Three-part process or value proposition",
        attrs: {
          columns: 3,
          title: field("How we will approach the work"),
          items: [
            {
              id: "column-1",
              heading: field("Discover"),
              body: paragraph(
                "Clarify goals, constraints, and success measures."
              ),
            },
            {
              id: "column-2",
              heading: field("Design"),
              body: paragraph("Shape the experience and visual system."),
            },
            {
              id: "column-3",
              heading: field("Launch"),
              body: paragraph("Build, QA, hand over, and support launch."),
            },
          ],
        },
        preview: threeColumnPreview,
      },
    ],
  },
  {
    kind: "insertable",
    id: "proposal-image-text",
    nodeType: "proposalImageText",
    label: "Image + Text",
    description: "Pair one visual with explanatory content.",
    searchTerms: ["image", "text", "media", "case study"],
    icon: Image01Icon,
    extension: ProposalImageText,
    showInSlashMenu: true,
    showInFloatingMenu: true,
    showInSidebar: true,
    createContent: (layout) => ({
      type: "proposalImageText",
      attrs: {
        reverse: layout?.attrs?.reverse ?? false,
      },
      content: [
        inlineField(
          "proposalImageTextEyebrow",
          layout?.attrs?.eyebrow ?? field("Approach")
        ),
        inlineField(
          "proposalImageTextTitle",
          layout?.attrs?.title ?? field("A clear visual direction")
        ),
        blockField(
          "proposalImageTextBody",
          layout?.attrs?.content ??
            paragraph("Explain the idea, proof point, or recommended approach.")
        ),
      ],
    }),
    preview: (
      <div className="mt-2 grid h-12 w-full grid-cols-2 gap-2">
        <div className="rounded-lg bg-muted/60" />
        <div className="space-y-1.5">
          <div className="h-1.5 w-10 rounded-full bg-primary/70" />
          <div className="h-2.5 w-full rounded-full bg-muted/70" />
          <div className="h-1.5 w-4/5 rounded-full bg-muted/40" />
        </div>
      </div>
    ),
    layouts: [
      {
        id: "image-text-left",
        name: "Image Left",
        description: "Visual first, explanation second",
        attrs: {
          eyebrow: field("Approach"),
          title: field("A clear visual direction"),
          content: paragraph("Explain the idea or proof point."),
          reverse: false,
        },
        preview: imageTextPreview,
      },
      {
        id: "image-text-right",
        name: "Image Right",
        description: "Explanation first, visual second",
        attrs: {
          eyebrow: field("Proof"),
          title: field("Relevant work and evidence"),
          content: paragraph("Describe the outcome and why it matters."),
          reverse: true,
        },
        preview: imageTextPreview,
      },
    ],
  },
  {
    kind: "insertable",
    id: "proposal-image-cards",
    nodeType: "proposalImageCards",
    label: "Image Cards",
    description: "Add visual cards for services or examples.",
    searchTerms: ["cards", "image cards", "portfolio", "services"],
    icon: Image01Icon,
    extension: ProposalImageCards,
    showInSlashMenu: true,
    showInFloatingMenu: true,
    showInSidebar: true,
    createContent: (layout) => ({
      type: "proposalImageCards",
      attrs: {
        columns: layout?.attrs?.columns ?? 3,
        variant: layout?.attrs?.variant ?? "vertical",
      },
      content: (
        layout?.attrs?.items ?? [
          {
            id: "image-card-1",
            title: field("Strategy"),
            body: paragraph("Define the right direction before production."),
          },
          {
            id: "image-card-2",
            title: field("Design"),
            body: paragraph("Create a polished system for key journeys."),
          },
          {
            id: "image-card-3",
            title: field("Launch"),
            body: paragraph("Ship with QA, analytics, and handover."),
          },
        ]
      ).map((item: any) => ({
        type: "proposalImageCardItem",
        attrs: { id: item.id, image: item.image },
        content: [
          inlineField("proposalImageCardTitle", item.title),
          blockField("proposalImageCardBody", item.body),
        ],
      })),
    }),
    preview: (
      <div className="mt-2 grid h-12 w-full grid-cols-3 gap-1.5">
        <div className="rounded-lg border border-border/40 bg-muted/45" />
        <div className="rounded-lg border border-border/40 bg-muted/45" />
        <div className="rounded-lg border border-border/40 bg-muted/45" />
      </div>
    ),
    layouts: [
      {
        id: "image-cards-vertical",
        name: "Vertical Cards",
        description: "Image above text in a card grid",
        attrs: {
          columns: 3,
          variant: "vertical",
        },
        preview: imageCardsPreview,
      },
      {
        id: "image-cards-horizontal",
        name: "Horizontal Cards",
        description: "Compact image and text rows",
        attrs: {
          columns: 2,
          variant: "horizontal",
          items: [
            {
              id: "image-card-1",
              title: field("Primary package"),
              body: paragraph("Summarize the strongest recommended option."),
            },
            {
              id: "image-card-2",
              title: field("Optional add-on"),
              body: paragraph("Describe a useful extension or enhancement."),
            },
          ],
        },
        preview: twoColumnPreview,
      },
    ],
  },
  {
    kind: "insertable",
    id: "proposal-signature",
    nodeType: "proposalSignature",
    label: "Signature",
    description: "Add a reusable proposal sign-off section.",
    searchTerms: ["signature", "sign", "approval", "terms"],
    icon: QuillWrite02Icon,
    extension: ProposalSignature,
    showInSlashMenu: true,
    showInFloatingMenu: true,
    showInSidebar: true,
    createContent: () => ({
      type: "proposalSignature",
      attrs: {
        binding: "proposal.pricing.signer",
      },
      content: [
        inlineField("proposalSignatureTitle", field("Ready to move forward?")),
        blockField(
          "proposalSignatureTerms",
          paragraph(
            "Approval confirms the proposed scope, timeline, and pricing so kickoff can be scheduled."
          )
        ),
      ],
    }),
    preview: (
      <div className="mt-2 flex h-12 w-full items-end justify-end border-border border-t pt-2">
        <div className="w-20 space-y-1 text-right">
          <div className="ml-auto h-2 w-16 rounded-full bg-muted/60" />
          <div className="ml-auto h-1.5 w-12 rounded-full bg-muted/40" />
        </div>
      </div>
    ),
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
        },
        content: metrics.map((metric: any, index: number) => ({
          type: "keyNumbersItem",
          attrs: { id: metric.id ?? `metric-${index + 1}` },
          content: [
            inlineField("keyNumbersValue", field(metric.value ?? "")),
            inlineField("keyNumbersLabel", field(metric.label ?? "")),
            blockField("keyNumbersDetail", paragraph(metric.detail ?? "")),
          ],
        })),
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
        },
        content: members.map((member: any, index: number) => ({
          type: "teamMemberItem",
          attrs: {
            id: member.id ?? `member-${index + 1}`,
            sourceId: member.sourceId,
          },
          content: [
            inlineField("teamMemberName", field(member.name ?? "")),
            inlineField("teamMemberRole", field(member.role ?? "")),
            blockField("teamMemberBio", paragraph(member.bio ?? "")),
          ],
        })),
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
        },
        content: testimonials.map((testimonial: any, index: number) => ({
          type: "testimonialItem",
          attrs: {
            id: testimonial.id ?? `testimonial-${index + 1}`,
            sourceId: testimonial.sourceId,
          },
          content: [
            blockField(
              "testimonialQuote",
              paragraph(testimonial.content ?? testimonial.quote ?? "")
            ),
            inlineField("testimonialAuthor", field(testimonial.author ?? "")),
            inlineField("testimonialRole", field(testimonial.role ?? "")),
          ],
        })),
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
      },
      content: (
        layout?.attrs?.items ?? [
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
        ]
      ).map((item: any) => ({
        type: "proposalFaqItem",
        attrs: { id: item.id },
        content: [
          inlineField("proposalFaqQuestion", item.question),
          blockField("proposalFaqAnswer", item.answer),
        ],
      })),
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
      {
        id: "faq-objections",
        name: "Objections & Answers",
        description: "Address common approval concerns",
        attrs: {
          items: [
            {
              id: "faq-objection-1",
              question: field("What if priorities change during the project?"),
              answer: paragraph(
                "We will review changes together, confirm impact, and update the plan before work continues."
              ),
            },
            {
              id: "faq-objection-2",
              question: field("How do we control cost?"),
              answer: paragraph(
                "The scope and pricing are agreed before kickoff, with any additions estimated separately."
              ),
            },
          ],
        },
        preview: (
          <div className="flex h-20 w-full flex-col justify-center gap-2">
            <div className="h-2 w-full rounded-full bg-muted/70" />
            <div className="h-1.5 w-5/6 rounded-full bg-muted/40" />
            <div className="h-2 w-4/5 rounded-full bg-muted/70" />
            <div className="h-1.5 w-3/4 rounded-full bg-muted/40" />
          </div>
        ),
      },
      {
        id: "faq-logistics",
        name: "Project Logistics",
        description: "Clarify communication, access, and handover",
        attrs: {
          items: [
            {
              id: "faq-logistics-1",
              question: field("Who needs to be involved?"),
              answer: paragraph(
                "A single decision owner and relevant subject matter experts keep approvals moving."
              ),
            },
            {
              id: "faq-logistics-2",
              question: field("What do you need from us?"),
              answer: paragraph(
                "We need stakeholder availability, brand assets, platform access, and timely feedback."
              ),
            },
            {
              id: "faq-logistics-3",
              question: field("What happens at handover?"),
              answer: paragraph(
                "You receive documentation, walkthroughs, and agreed launch support."
              ),
            },
          ],
        },
        preview: (
          <div className="flex h-20 w-full flex-col justify-center gap-2">
            <div className="h-2 w-3/4 rounded-full bg-muted/70" />
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
        <div className="flex gap-1 border-border/20 border-b pb-0.5">
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
            <div className="flex gap-2 border-border/30 border-b pb-1.5">
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
