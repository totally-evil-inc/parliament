import { describe, expect, test } from "bun:test"
import { createInvoiceDraftFromBlueprint } from "@workspace/document/invoice"
import {
  darkDocumentTemplate,
  resolveDocumentTemplate,
  webStudioProposalTemplate,
} from "@workspace/document/presentation"
import {
  createProposalDraft,
  createProposalDraftFromBlueprint,
} from "@workspace/document/proposal"
import {
  buildInvoiceRenderModel,
  buildProposalRenderModel,
} from "@workspace/document/render"
import { generateDocumentPdfBlob, generateModelPdfBlob } from "./pdf-exporter"
import { resolvePdfTheme } from "./pdf-styles"

describe("React-PDF Document Export Engine", () => {
  test("resolves theme tokens accurately into PDF styles and colors", () => {
    const theme = resolvePdfTheme(webStudioProposalTemplate)
    expect(theme.accent).toBe("#0f766e")
    expect(theme.canvasBackground).toBe("#eef4f1")
    expect(theme.radius).toBeGreaterThan(0)
    expect(theme.headingFont).toBe("Helvetica-Bold")
    expect(theme.accentTintSubtle).toContain("rgba(")
  })

  test("generates valid PDF Blob from standard Proposal blueprint", async () => {
    const draft = createProposalDraftFromBlueprint({
      blueprint: "web-design",
      id: "test-proposal-pdf",
      sellerName: "Studio North",
    })

    const blob = await generateDocumentPdfBlob({
      document: draft,
      appTheme: "light",
    })

    expect(blob).toBeDefined()
    expect(blob.size).toBeGreaterThan(500)
    expect(blob.type).toBe("application/pdf")
  })

  test("generates valid PDF Blob from standard Invoice blueprint", async () => {
    const draft = createInvoiceDraftFromBlueprint({
      blueprint: "standard",
      id: "test-invoice-pdf",
      sellerName: "Northstar Studio",
    })

    const blob = await generateDocumentPdfBlob({
      document: draft,
      appTheme: "light",
    })

    expect(blob).toBeDefined()
    expect(blob.size).toBeGreaterThan(500)
    expect(blob.type).toBe("application/pdf")
  })

  test("renders dark mode template and custom presets faithfully", async () => {
    const draft = createProposalDraft({
      id: "dark-mode-test",
      sellerName: "Cyberpunk Studio",
    })
    draft.template = {
      id: "classic-dark",
      version: 1,
      overrides: darkDocumentTemplate.tokens,
    }

    const blob = await generateDocumentPdfBlob({
      document: draft,
      appTheme: "dark",
      template: darkDocumentTemplate,
    })

    expect(blob).toBeDefined()
    expect(blob.size).toBeGreaterThan(500)
  })

  test("renders invoice with custom tax, discounts, and payment terms", async () => {
    const draft = createInvoiceDraftFromBlueprint({
      blueprint: "standard",
      id: "tax-discount-invoice",
      sellerName: "Acme Corp",
    })

    draft.data.pricing = {
      currency: "USD",
      items: [
        {
          id: "item-1",
          description: "Consulting Hours",
          details: "Architecture and implementation",
          quantity: "10",
          unitPriceMinor: 15000,
          showDetails: true,
          showImage: false,
        },
      ],
      discount: {
        kind: "rate",
        basisPoints: 1000, // 10%
      },
      tax: {
        kind: "rate",
        basisPoints: 800, // 8%
      },
    }
    draft.data.paymentTerms = "Due within 30 days via Wire or ACH."

    const model = buildInvoiceRenderModel(draft, "light")
    const template = resolveDocumentTemplate(draft.template, "light")

    const blob = await generateModelPdfBlob({ model, template })
    expect(blob).toBeDefined()
    expect(blob.size).toBeGreaterThan(500)
  })

  test("renders LaTeX math, rich-text marks, and structured lists", async () => {
    const draft = createProposalDraft({ id: "math-test" })
    draft.composition.blocks = [
      {
        id: "rt-1",
        type: "richText",
        version: 1,
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Euler equation: " },
                { type: "inlineMath", attrs: { latex: "e^{i\\pi} + 1 = 0" } },
              ],
            },
            {
              type: "blockMath",
              attrs: {
                latex: "\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}",
              },
            },
            {
              type: "orderedList",
              content: [
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "First point" }],
                    },
                  ],
                },
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Second point" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    ]

    const blob = await generateDocumentPdfBlob({
      document: draft,
      appTheme: "light",
    })

    expect(blob).toBeDefined()
    expect(blob.size).toBeGreaterThan(500)
  })

  test("renders all 14 canonical block types into PDF without error", async () => {
    const draft = createProposalDraft({
      id: "all-blocks-test",
      sellerName: "Acme Corp",
    })

    draft.composition.blocks = [
      {
        id: "header-1",
        type: "partyHeader",
        version: 1,
        binding: "proposal.parties",
        config: { layout: "mark-left-dates-right" },
      },
      {
        id: "cover-1",
        type: "cover",
        version: 1,
        title: {
          type: "doc",
          content: [{ type: "text", text: "Project Cover" }],
        },
        variant: "split",
        eyebrow: {
          type: "doc",
          content: [{ type: "text", text: "CONFIDENTIAL" }],
        },
        subtitle: {
          type: "doc",
          content: [{ type: "text", text: "Transforming the future" }],
        },
      },
      {
        id: "section-1",
        type: "section",
        version: 1,
        title: {
          type: "doc",
          content: [{ type: "text", text: "Scope of Work" }],
        },
        eyebrow: { type: "doc", content: [] },
        lead: { type: "doc", content: [] },
        variant: "accent",
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Here is regular text with " },
                {
                  type: "text",
                  text: "bold styling",
                  marks: [{ type: "bold" }],
                },
                { type: "text", text: " and " },
                {
                  type: "text",
                  text: "a link",
                  marks: [
                    { type: "link", attrs: { href: "https://example.com" } },
                  ],
                },
              ],
            },
            {
              type: "bulletList",
              content: [
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Deliverable 1" }],
                    },
                  ],
                },
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Deliverable 2" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      {
        id: "columns-1",
        type: "columns",
        version: 1,
        columns: 2,
        title: {
          type: "doc",
          content: [{ type: "text", text: "Key Objectives" }],
        },
        items: [
          {
            id: "col-item-1",
            heading: {
              type: "doc",
              content: [{ type: "text", text: "Objective Alpha" }],
            },
            body: {
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Fast performance" }],
                },
              ],
            },
          },
          {
            id: "col-item-2",
            heading: {
              type: "doc",
              content: [{ type: "text", text: "Objective Beta" }],
            },
            body: {
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "High conversion" }],
                },
              ],
            },
          },
        ],
      },
      {
        id: "metrics-1",
        type: "metrics",
        version: 1,
        columns: 3,
        items: [
          {
            id: "metric-1",
            value: { type: "doc", content: [{ type: "text", text: "99.9%" }] },
            label: { type: "doc", content: [{ type: "text", text: "Uptime" }] },
            detail: {
              type: "doc",
              content: [{ type: "text", text: "Guaranteed SLA" }],
            },
          },
        ],
      },
      {
        id: "team-1",
        type: "team",
        version: 1,
        columns: 2,
        items: [
          {
            id: "tm-1",
            name: {
              type: "doc",
              content: [{ type: "text", text: "Jane Doe" }],
            },
            role: {
              type: "doc",
              content: [{ type: "text", text: "Lead Architect" }],
            },
            bio: {
              type: "doc",
              content: [{ type: "text", text: "10+ years experience" }],
            },
          },
        ],
      },
      {
        id: "testimonials-1",
        type: "testimonials",
        version: 1,
        columns: 2,
        items: [
          {
            id: "test-1",
            quote: {
              type: "doc",
              content: [
                { type: "text", text: "Incredible attention to detail." },
              ],
            },
            author: {
              type: "doc",
              content: [{ type: "text", text: "Alex Smith" }],
            },
            role: {
              type: "doc",
              content: [{ type: "text", text: "CTO, Global Tech" }],
            },
          },
        ],
      },
      {
        id: "image-text-1",
        type: "imageText",
        version: 1,
        title: {
          type: "doc",
          content: [{ type: "text", text: "Seamless Integration" }],
        },
        eyebrow: { type: "doc", content: [] },
        reverse: false,
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Connects with existing tools." },
              ],
            },
          ],
        },
      },
      {
        id: "image-cards-1",
        type: "imageCards",
        version: 1,
        columns: 2,
        variant: "vertical",
        items: [
          {
            id: "ic-1",
            title: {
              type: "doc",
              content: [{ type: "text", text: "Design System" }],
            },
            body: {
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Tokens and themes" }],
                },
              ],
            },
          },
        ],
      },
      {
        id: "timeline-1",
        type: "timeline",
        version: 1,
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Phase 1: Discovery (Week 1-2)" },
              ],
            },
          ],
        },
      },
      {
        id: "gallery-1",
        type: "gallery",
        version: 1,
        columns: 2,
        images: [{ id: "g-1", alt: "Screenshot 1" }],
      },
      {
        id: "faq-1",
        type: "faq",
        version: 1,
        variant: "list",
        items: [
          {
            id: "faq-q1",
            question: {
              type: "doc",
              content: [{ type: "text", text: "What is the timeline?" }],
            },
            answer: {
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Typically 4 to 6 weeks." }],
                },
              ],
            },
          },
        ],
      },
      {
        id: "pricing-1",
        type: "pricing",
        version: 1,
        binding: "proposal.pricing",
        config: { title: "Investment" },
      },
      {
        id: "signature-1",
        type: "signature",
        version: 1,
        binding: "proposal.pricing.signer",
        title: {
          type: "doc",
          content: [{ type: "text", text: "Acceptance of Proposal" }],
        },
        terms: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "By signing below, you agree to the terms.",
                },
              ],
            },
          ],
        },
      },
    ]

    const model = buildProposalRenderModel(draft, "light")
    const template = resolveDocumentTemplate(draft.template, "light")

    const blob = await generateModelPdfBlob({ model, template })
    expect(blob).toBeDefined()
    expect(blob.size).toBeGreaterThan(1000)
  })

  test("generates valid server byte Buffer with %PDF signature", async () => {
    const { generateDocumentPdfBuffer, generateModelPdfBuffer } = await import(
      "./pdf-exporter"
    )
    const draft = createProposalDraftFromBlueprint({
      blueprint: "web-design",
      id: "test-buffer-pdf",
      sellerName: "Studio North",
    })

    const buffer = await generateDocumentPdfBuffer({
      document: draft,
      appTheme: "light",
    })

    expect(Buffer.isBuffer(buffer)).toBe(true)
    expect(buffer.length).toBeGreaterThan(500)
    // Check %PDF- signature
    expect(buffer.subarray(0, 5).toString("utf-8")).toBe("%PDF-")

    const model = buildProposalRenderModel(draft, "light")
    const template = resolveDocumentTemplate(draft.template, "light")
    const modelBuffer = await generateModelPdfBuffer({ model, template })
    expect(Buffer.isBuffer(modelBuffer)).toBe(true)
    expect(modelBuffer.length).toBeGreaterThan(500)
    expect(modelBuffer.subarray(0, 5).toString("utf-8")).toBe("%PDF-")
  })

  test("generates valid Base64 string for browser and server environments", async () => {
    const { generateDocumentPdfBase64 } = await import("./pdf-exporter")
    const draft = createProposalDraftFromBlueprint({
      blueprint: "web-design",
      id: "test-base64-pdf",
      sellerName: "Studio North",
    })

    const base64 = await generateDocumentPdfBase64({
      document: draft,
      appTheme: "light",
    })

    expect(typeof base64).toBe("string")
    expect(base64.length).toBeGreaterThan(500)
    // Verify decoded content begins with %PDF-
    const decoded = Buffer.from(base64, "base64")
    expect(decoded.subarray(0, 5).toString("utf-8")).toBe("%PDF-")
  })
})
