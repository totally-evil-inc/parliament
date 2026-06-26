import { webStudioProposalTemplate } from "./presentation"
import type { DocumentBlock, ProposalDraft, RichTextDoc } from "./schema"

function dateOnly(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-")
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function textDoc(text: string): RichTextDoc {
  return {
    type: "doc",
    content: text
      ? [{ type: "paragraph", content: [{ type: "text", text }] }]
      : [],
  }
}

function inlineDoc(text: string): RichTextDoc {
  return {
    type: "doc",
    content: text ? [{ type: "text", text }] : [],
  }
}

function section({
  content,
  eyebrow,
  id,
  lead = "",
  title,
  variant = "default",
}: {
  content: string
  eyebrow: string
  id: string
  lead?: string
  title: string
  variant?: Extract<DocumentBlock, { type: "section" }>["variant"]
}): DocumentBlock {
  return {
    id,
    type: "section",
    version: 1,
    eyebrow: inlineDoc(eyebrow),
    title: inlineDoc(title),
    lead: inlineDoc(lead),
    variant,
    content: textDoc(content),
  }
}

function metricItem(id: string, value: string, label: string, detail: string) {
  return {
    type: "keyNumbersItem",
    attrs: { id },
    content: [
      { type: "keyNumbersValue", content: inlineDoc(value).content },
      { type: "keyNumbersLabel", content: inlineDoc(label).content },
      { type: "keyNumbersDetail", content: inlineDoc(detail).content },
    ],
  }
}

function teamItem(id: string, name: string, role: string, bio: string) {
  return {
    type: "teamMemberItem",
    attrs: { id },
    content: [
      { type: "teamMemberName", content: inlineDoc(name).content },
      { type: "teamMemberRole", content: inlineDoc(role).content },
      { type: "teamMemberBio", content: inlineDoc(bio).content },
    ],
  }
}

function testimonialItem(
  id: string,
  quote: string,
  author: string,
  role: string
) {
  return {
    type: "testimonialItem",
    attrs: { id },
    content: [
      { type: "testimonialQuote", content: inlineDoc(quote).content },
      { type: "testimonialAuthor", content: inlineDoc(author).content },
      { type: "testimonialRole", content: inlineDoc(role).content },
    ],
  }
}

export function createProposalDraft({
  id,
  now = new Date(),
  sellerName = "",
}: {
  id: string
  now?: Date
  sellerName?: string
}): ProposalDraft {
  const timestamp = now.toISOString()
  const emptyParty = {
    name: "",
    email: "",
    address: "",
    phone: "",
    website: "",
    taxId: "",
    customFields: [],
  }

  return {
    id,
    kind: "proposal",
    schemaVersion: 1,
    revision: 0,
    status: "draft",
    locale: "en-KE",
    timezone: "Africa/Nairobi",
    template: { id: "proposal-classic", version: 1 },
    data: {
      title: "",
      issueDate: dateOnly(now),
      seller: { ...emptyParty, name: sellerName },
      customer: { ...emptyParty },
      pricing: {
        currency: "KES",
        items: [],
        signerName: sellerName,
        signerTitle: "Signature",
      },
    },
    composition: {
      version: 1,
      blocks: [
        {
          id: "proposal-header",
          type: "partyHeader",
          version: 1,
          binding: "proposal.parties",
          config: { layout: "mark-left-dates-right" },
        },
        {
          id: "proposal-body",
          type: "richText",
          version: 1,
          content: { type: "doc", content: [{ type: "paragraph" }] },
        },
        {
          id: "proposal-pricing",
          type: "pricing",
          version: 1,
          binding: "proposal.pricing",
          config: { title: "Services & Billing" },
        },
      ],
    },
    assets: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function createProposalDraftFromBlueprint({
  blueprint,
  id,
  now = new Date(),
  sellerName = "Northstar Studio",
}: {
  blueprint: "web-design"
  id: string
  now?: Date
  sellerName?: string
}): ProposalDraft {
  const draft = createProposalDraft({ id, now, sellerName })
  const timestamp = now.toISOString()

  if (blueprint !== "web-design") return draft

  return {
    ...draft,
    revision: 0,
    template: {
      id: webStudioProposalTemplate.id,
      version: 1,
      overrides: webStudioProposalTemplate.tokens,
    },
    data: {
      ...draft.data,
      title: "Website Redesign & Growth Platform",
      validUntil: dateOnly(addDays(now, 14)),
      seller: {
        ...draft.data.seller,
        name: sellerName,
        email: "hello@northstar.studio",
        website: "northstar.studio",
        phone: "+254 700 000 000",
        address: "Nairobi, Kenya",
      },
      customer: {
        ...draft.data.customer,
        name: "Acme Safari Co.",
        email: "hello@acmesafari.example",
        website: "acmesafari.example",
        address: "Mombasa Road, Nairobi",
      },
      pricing: {
        currency: "KES",
        items: [
          {
            id: "pricing-discovery",
            description: "Discovery, strategy, and content architecture",
            details:
              "Stakeholder interviews, analytics review, sitemap, conversion goals, and a prioritized launch roadmap.",
            quantity: "1",
            unitPriceMinor: 180_000_00,
            showDetails: true,
            showImage: false,
          },
          {
            id: "pricing-design",
            description: "Responsive website design system",
            details:
              "High-fidelity designs for core journeys, reusable components, and mobile-first interaction states.",
            quantity: "1",
            unitPriceMinor: 420_000_00,
            showDetails: true,
            showImage: false,
          },
          {
            id: "pricing-build",
            description: "Implementation, CMS setup, and launch support",
            details:
              "Production build, content management workflow, QA, analytics events, handover, and 30 days of launch support.",
            quantity: "1",
            unitPriceMinor: 650_000_00,
            showDetails: true,
            showImage: false,
          },
        ],
        tax: { kind: "rate", basisPoints: 1_600 },
        signerName: sellerName,
        signerTitle: "Project Partner",
      },
    },
    composition: {
      version: 1,
      blocks: [
        {
          id: "proposal-header",
          type: "partyHeader",
          version: 1,
          binding: "proposal.parties",
          config: { layout: "editorial-band" },
        },
        section({
          id: "section-executive-summary",
          eyebrow: "Executive Summary",
          title: "A faster path from visitor interest to qualified enquiry",
          lead: "Acme Safari Co. needs a website that sells trust before it sells a package.",
          variant: "accent",
          content:
            "We will redesign the public website around clear trip discovery, proof-led destination pages, and a content workflow your team can maintain after launch.",
        }),
        {
          id: "metrics-outcomes",
          type: "metrics",
          version: 1,
          columns: 3,
          content: {
            type: "doc",
            content: [
              metricItem(
                "metric-speed",
                "3.5s",
                "Target load time",
                "Lean pages, optimized media, and performance budgets for core journeys."
              ),
              metricItem(
                "metric-conversion",
                "+28%",
                "Enquiry lift",
                "Clearer offers, stronger proof, and fewer steps to start a conversation."
              ),
              metricItem(
                "metric-launch",
                "8 weeks",
                "Launch window",
                "A focused plan from discovery through QA, handover, and launch support."
              ),
            ],
          },
        },
        section({
          id: "section-scope",
          eyebrow: "Scope",
          title: "What we will create",
          lead: "A complete marketing website foundation, not a cosmetic reskin.",
          content:
            "The work covers discovery, messaging, information architecture, visual design, front-end implementation, CMS setup, analytics instrumentation, QA, and launch support.",
        }),
        {
          id: "timeline-project-plan",
          type: "timeline",
          version: 1,
          content: {
            type: "doc",
            content: [
              {
                type: "timelineItem",
                content: [
                  {
                    type: "timelineDate",
                    content: [{ type: "text", text: "Week 1" }],
                  },
                  {
                    type: "timelineTitle",
                    content: [{ type: "text", text: "Discovery and strategy" }],
                  },
                  {
                    type: "timelineDescription",
                    content: [
                      {
                        type: "paragraph",
                        content: [
                          {
                            type: "text",
                            text: "Clarify audiences, offers, conversion paths, and technical constraints.",
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: "timelineItem",
                content: [
                  {
                    type: "timelineDate",
                    content: [{ type: "text", text: "Weeks 2-4" }],
                  },
                  {
                    type: "timelineTitle",
                    content: [
                      { type: "text", text: "Design and content system" },
                    ],
                  },
                  {
                    type: "timelineDescription",
                    content: [
                      {
                        type: "paragraph",
                        content: [
                          {
                            type: "text",
                            text: "Design the priority pages, reusable sections, and content patterns.",
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: "timelineItem",
                content: [
                  {
                    type: "timelineDate",
                    content: [{ type: "text", text: "Weeks 5-8" }],
                  },
                  {
                    type: "timelineTitle",
                    content: [{ type: "text", text: "Build, QA, and launch" }],
                  },
                  {
                    type: "timelineDescription",
                    content: [
                      {
                        type: "paragraph",
                        content: [
                          {
                            type: "text",
                            text: "Implement the site, migrate content, test key flows, and support launch.",
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
        section({
          id: "section-deliverables",
          eyebrow: "Deliverables",
          title: "Launch assets your team can keep using",
          variant: "compact",
          content:
            "You will receive a responsive website, editable CMS collections, launch checklist, analytics event map, component documentation, and a recorded handover session.",
        }),
        {
          id: "team-project",
          type: "team",
          version: 1,
          columns: 3,
          content: {
            type: "doc",
            content: [
              teamItem(
                "member-strategy",
                "Alex Morgan",
                "Strategy Lead",
                "Runs discovery, messaging, and conversion planning."
              ),
              teamItem(
                "member-design",
                "Jamie Chen",
                "Design Director",
                "Owns the visual system and key customer journeys."
              ),
              teamItem(
                "member-engineering",
                "Taylor Brooks",
                "Technical Lead",
                "Builds the production site, CMS, and launch workflow."
              ),
            ],
          },
        },
        {
          id: "testimonials-proof",
          type: "testimonials",
          version: 1,
          columns: 2,
          content: {
            type: "doc",
            content: [
              testimonialItem(
                "testimonial-clarity",
                "The process gave our team clarity from the first workshop through launch.",
                "Maya Patel",
                "Founder, Atlas Tours"
              ),
              testimonialItem(
                "testimonial-speed",
                "We launched faster than expected and finally had pages our sales team trusted.",
                "Daniel Mwangi",
                "Managing Director, Horizon Travel"
              ),
            ],
          },
        },
        {
          id: "proposal-pricing",
          type: "pricing",
          version: 1,
          binding: "proposal.pricing",
          config: { title: "Investment" },
        },
        {
          id: "faq-common-questions",
          type: "faq",
          version: 1,
          variant: "list",
          items: [
            {
              id: "faq-content",
              question: inlineDoc("Who provides the final website copy?"),
              answer: textDoc(
                "We shape the content structure and provide editing guidance. Your team supplies source material, and we refine it into launch-ready pages together."
              ),
            },
            {
              id: "faq-cms",
              question: inlineDoc("Can our team update the site after launch?"),
              answer: textDoc(
                "Yes. The CMS is configured around practical content types, and handover includes a recorded training session."
              ),
            },
            {
              id: "faq-support",
              question: inlineDoc("What happens after launch?"),
              answer: textDoc(
                "The proposal includes 30 days of launch support for bug fixes, analytics checks, and minor content adjustments."
              ),
            },
          ],
        },
        section({
          id: "section-next-steps",
          eyebrow: "Next Steps",
          title: "Approve the proposal and schedule kickoff",
          lead: "Once approved, we will confirm stakeholders, collect access, and book the discovery workshop.",
          variant: "accent",
          content:
            "This proposal is valid for 14 days. We can begin within one week of approval and deposit confirmation.",
        }),
      ],
    },
    assets: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}
