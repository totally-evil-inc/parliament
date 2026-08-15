import { describe, expect, it } from "bun:test"
import {
  buildColumnsBlock,
  buildCoverBlock,
  buildFaqBlock,
  buildMetricsBlock,
  buildPartyHeaderBlock,
  buildPricingBlock,
  buildSectionBlock,
  buildSignatureBlock,
  buildTeamBlock,
  buildTestimonialsBlock,
  buildTimelineBlock,
  convertDeclarativeBlock,
  normalizeCompositionBlocks,
} from "./builders"
import { documentBlockSchema } from "./schema"

describe("Server-Safe Semantic Block Builders", () => {
  it("builds a valid section block with schema compliance", () => {
    const block = buildSectionBlock({
      title: "Executive Summary",
      eyebrow: "Overview",
      lead: "Strategic blueprint",
      content: "This is the body content.",
      variant: "accent",
    })
    const parsed = documentBlockSchema.safeParse(block)
    expect(parsed.success).toBe(true)
    if (parsed.success && parsed.data.type === "section") {
      expect(parsed.data.variant).toBe("accent")
    }
  })

  it("builds a valid metrics block with multi-column support", () => {
    const block = buildMetricsBlock({
      columns: 3,
      items: [
        {
          value: "$50K+",
          label: "Cost Savings",
          detail: "Annualized estimate",
        },
        { value: "99.9%", label: "Uptime SLA", detail: "Enterprise grade" },
      ],
    })
    const parsed = documentBlockSchema.safeParse(block)
    expect(parsed.success).toBe(true)
  })

  it("builds a valid timeline block with milestones", () => {
    const block = buildTimelineBlock({
      items: [
        {
          date: "Week 1",
          title: "Kickoff & Discovery",
          description: "Stakeholder alignment",
        },
        {
          date: "Week 2-4",
          title: "Design Phase",
          description: "Figma wireframes",
        },
      ],
    })
    const parsed = documentBlockSchema.safeParse(block)
    expect(parsed.success).toBe(true)
  })

  it("builds team, testimonials, faq, signature, columns, and cover blocks", () => {
    const team = buildTeamBlock({
      items: [
        { name: "Alice", role: "Lead Architect", bio: "10+ years experience" },
      ],
    })
    expect(documentBlockSchema.safeParse(team).success).toBe(true)

    const testimonials = buildTestimonialsBlock({
      items: [{ quote: "Great work!", author: "Bob", role: "VP Eng" }],
    })
    expect(documentBlockSchema.safeParse(testimonials).success).toBe(true)

    const faq = buildFaqBlock({
      items: [{ question: "What is the timeline?", answer: "6 weeks." }],
    })
    expect(documentBlockSchema.safeParse(faq).success).toBe(true)

    const sig = buildSignatureBlock({
      title: "Authorized Signoff",
      terms: "Standard mutual NDA terms apply.",
    })
    expect(documentBlockSchema.safeParse(sig).success).toBe(true)

    const cols = buildColumnsBlock({
      columns: 2,
      items: [
        { heading: "Left Column", body: "Content on the left." },
        { heading: "Right Column", body: "Content on the right." },
      ],
    })
    expect(documentBlockSchema.safeParse(cols).success).toBe(true)

    const cover = buildCoverBlock({
      title: "Strategic Advisory",
      eyebrow: "Proposal",
      subtitle: "Q3 2026 Engagement",
      variant: "split",
    })
    expect(documentBlockSchema.safeParse(cover).success).toBe(true)
  })

  it("converts declarative block definitions uniformly via convertDeclarativeBlock", () => {
    const block = convertDeclarativeBlock({
      type: "section",
      title: "Deliverables",
      content: "All source files will be delivered upon completion.",
    })
    expect(block.type).toBe("section")
    expect(documentBlockSchema.safeParse(block).success).toBe(true)
  })

  it("normalizeCompositionBlocks enforces invariants: single header at index 0 and pricing block", () => {
    const rawBlocks = [
      buildSectionBlock({ title: "Intro", content: "Hello" }),
      buildPartyHeaderBlock({
        id: "header-1",
        layout: "mark-left-dates-right",
      }),
      buildPartyHeaderBlock({ id: "header-2", layout: "editorial-band" }),
      buildPricingBlock({ title: "Pricing 1" }),
      buildPricingBlock({ title: "Pricing 2" }),
      buildSignatureBlock(),
    ]

    const normalized = normalizeCompositionBlocks(rawBlocks)
    expect(normalized[0]?.type).toBe("partyHeader")
    const headerCount = normalized.filter(
      (b) => b.type === "partyHeader"
    ).length
    expect(headerCount).toBe(1)
    const pricingCount = normalized.filter((b) => b.type === "pricing").length
    expect(pricingCount).toBe(1)
  })
})
