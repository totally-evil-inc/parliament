import { describe, expect, test } from "bun:test"
import {
  buildInvoiceRenderModel,
  buildProposalRenderModel,
  getDocumentTemplate,
  getDocumentTemplateStyle,
  webStudioProposalTemplate,
} from "@workspace/document"
import { renderToString } from "react-dom/server"
import { parsePathname } from "../App"
import { DrawnCanvas } from "./DrawnCanvas"
import { DocumentBlockRenderer } from "./document-block-renderer"
import { DocumentHeaderRenderer } from "./document-header-renderer"
import { GateChallenge } from "./GateChallenge"
import { InvoiceView } from "./InvoiceView"
import { ProposalView } from "./ProposalView"
import { RichTextRenderer } from "./RichTextRenderer"
import { StatusScreen } from "./StatusScreen"

const mockProposalInput = {
  id: "prop_123",
  kind: "proposal",
  schemaVersion: 1,
  revision: 1,
  status: "draft",
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
  locale: "en-US",
  timezone: "UTC",
  template: { id: "proposal-classic", version: 1 },
  assets: [],
  data: {
    title: "Mobile App Development Proposal",
    issueDate: "2026-08-01",
    validUntil: "2026-09-01",
    seller: {
      name: "Acme Software Studio",
      email: "hello@acme.com",
      address: "123 Tech Lane\nSan Francisco, CA",
      phone: "+1 555 0199",
      website: "https://acme.com",
      taxId: "US-987654",
      customFields: [],
    },
    customer: {
      name: "Global Retail Corp",
      email: "procurement@globalretail.com",
      address: "456 Market St\nNew York, NY",
      phone: "+1 555 0200",
      website: "https://globalretail.com",
      taxId: "US-123456",
      customFields: [],
    },
    pricing: {
      currency: "USD",
      items: [
        {
          id: "item_1",
          description: "iOS & Android Mobile App",
          details: "Native Swift & Kotlin development",
          quantity: "1",
          unitPriceMinor: 1500000,
          showDetails: true,
          showImage: false,
        },
        {
          id: "item_2",
          description: "Cloud Backend API",
          details: "Serverless Node.js + PostgreSQL",
          quantity: "2",
          unitPriceMinor: 250000,
          showDetails: true,
          showImage: false,
        },
      ],
      signerName: "",
      signerTitle: "Authorized Representative",
    },
  },
  composition: {
    version: 1,
    blocks: [
      {
        id: "block_pricing",
        version: 1,
        type: "pricing",
        binding: "proposal.pricing",
        config: { title: "Investment Breakdown" },
      },
      {
        id: "block_text",
        version: 1,
        type: "richText",
        content: {
          type: "doc",
          content: [
            {
              type: "heading",
              attrs: { level: 2 },
              content: [{ type: "text", text: "Scope of Work" }],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "We will build a high performance mobile application.",
                },
              ],
            },
          ],
        },
      },
      {
        id: "block_faq",
        version: 1,
        type: "faq",
        variant: "list",
        items: [
          {
            id: "faq_1",
            question: {
              type: "doc",
              content: [{ type: "text", text: "What is the timeline?" }],
            },
            answer: {
              type: "doc",
              content: [
                { type: "text", text: "12 calendar weeks from kickoff." },
              ],
            },
          },
        ],
      },
    ],
  },
}

const mockInvoiceInput = {
  id: "inv_456",
  kind: "invoice",
  schemaVersion: 1,
  revision: 1,
  status: "draft",
  createdAt: "2026-08-05T00:00:00Z",
  updatedAt: "2026-08-05T00:00:00Z",
  locale: "en-US",
  timezone: "UTC",
  template: { id: "classic-light", version: 1 },
  assets: [],
  data: {
    title: "Invoice for Milestone 1",
    invoiceNumber: "INV-2026-001",
    issueDate: "2026-08-05",
    dueDate: "2026-08-19",
    paymentTerms: "Net 14",
    seller: {
      name: "Apex Engineering LLC",
      email: "billing@apex.dev",
      address: "789 Innovation Way\nAustin, TX",
      phone: "+1 555 0300",
      website: "https://apex.dev",
      taxId: "TAX-APEX-99",
      customFields: [],
    },
    customer: {
      name: "Venture Partners Inc",
      email: "ap@venturepartners.com",
      address: "100 Wall Street\nNew York, NY",
      phone: "+1 555 0400",
      website: "https://venturepartners.com",
      taxId: "TAX-VP-100",
      customFields: [],
    },
    pricing: {
      currency: "USD",
      items: [
        {
          id: "inv_item_1",
          description: "Phase 1 UI Design & Architecture",
          details: "Figma wireframes & system specs",
          quantity: "1",
          unitPriceMinor: 500000,
          showDetails: true,
          showImage: false,
        },
      ],
    },
  },
  composition: {
    version: 1,
    blocks: [
      {
        id: "block_inv_pricing",
        version: 1,
        type: "pricing",
        binding: "invoice.pricing",
        config: { title: "Invoice Details" },
      },
      {
        id: "block_inv_section",
        version: 1,
        type: "section",
        eyebrow: {
          type: "doc",
          content: [{ type: "text", text: "Payment Notice" }],
        },
        title: {
          type: "doc",
          content: [{ type: "text", text: "Wire Transfer Instructions" }],
        },
        lead: {
          type: "doc",
          content: [
            { type: "text", text: "Please include invoice number in memo." },
          ],
        },
        variant: "default",
        content: { type: "doc", content: [] },
      },
    ],
  },
}

describe("Document Presentation Components (apps/gate)", () => {
  describe("RichTextRenderer", () => {
    test("renders string content", () => {
      const html = renderToString(<RichTextRenderer doc="Hello Rich Text" />)
      expect(html).toContain("Hello Rich Text")
      expect(html).toContain("leading-relaxed")
    })

    test("renders RichTextDoc with headings, paragraphs, marks, and lists", () => {
      const doc = {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: "Main Title" }],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Bold text ",
                marks: [{ type: "bold" }],
              },
              {
                type: "text",
                text: "and link",
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
                content: [{ type: "text", text: "List item 1" }],
              },
            ],
          },
        ],
      }
      const html = renderToString(<RichTextRenderer doc={doc} />)
      expect(html).toContain("Main Title")
      expect(html).toContain("<strong>Bold text </strong>")
      expect(html).toContain('href="https://example.com"')
      expect(html).toContain("List item 1")
    })

    test("returns null for null/undefined doc", () => {
      expect(renderToString(<RichTextRenderer doc={null} />)).toBe("")
      expect(renderToString(<RichTextRenderer doc={undefined} />)).toBe("")
    })
  })

  describe("DocumentHeaderRenderer Layouts", () => {
    const seller = mockProposalInput.data.seller
    const customer = mockProposalInput.data.customer

    test("renders mark-left-dates-right layout", () => {
      const html = renderToString(
        <DocumentHeaderRenderer
          kind="proposal"
          layout="mark-left-dates-right"
          title="Custom Architecture Proposal"
          issueDate="2026-08-01"
          validUntil="2026-09-01"
          seller={seller}
          customer={customer}
        />
      )
      expect(html).toContain("Custom Architecture Proposal")
      expect(html).toContain("Prepared By")
      expect(html).toContain("Prepared For")
      expect(html).toContain("Acme Software Studio")
      expect(html).toContain("Global Retail Corp")
      expect(html).toContain("Valid Until")
    })

    test("renders centered-stack layout", () => {
      const html = renderToString(
        <DocumentHeaderRenderer
          kind="proposal"
          layout="centered-stack"
          title="Centered Proposal"
          issueDate="2026-08-01"
          seller={seller}
          customer={customer}
        />
      )
      expect(html).toContain("Centered Proposal")
      expect(html).toContain("items-center")
      expect(html).toContain("text-center")
    })

    test("renders editorial-band layout with invoice numbers", () => {
      const html = renderToString(
        <DocumentHeaderRenderer
          kind="invoice"
          layout="editorial-band"
          title="Editorial Invoice"
          issueDate="2026-08-05"
          dueDate="2026-08-19"
          invoiceNumber="INV-1001"
          paymentTerms="Net 30"
          seller={seller}
          customer={customer}
        />
      )
      expect(html).toContain("Editorial Invoice")
      expect(html).toContain("INV-1001")
      expect(html).toContain("Net 30")
      expect(html).toContain("Billed By")
      expect(html).toContain("Billed To")
    })

    test("renders left-stack layout", () => {
      const html = renderToString(
        <DocumentHeaderRenderer
          kind="proposal"
          layout="left-stack"
          title="Left Stack Proposal"
          issueDate="2026-08-01"
          seller={seller}
          customer={customer}
        />
      )
      expect(html).toContain("Left Stack Proposal")
      expect(html).toContain("max-w-3xl space-y-5")
    })
  })

  describe("DocumentBlockRenderer Block Variants", () => {
    const seller = mockProposalInput.data.seller
    const customer = mockProposalInput.data.customer

    test("renders section block with accent variant", () => {
      const block = {
        id: "sec_1",
        version: 1 as const,
        type: "section" as const,
        variant: "accent" as const,
        eyebrow: {
          type: "doc" as const,
          content: [{ type: "text" as const, text: "Executive Summary" }],
        },
        title: {
          type: "doc" as const,
          content: [{ type: "text" as const, text: "Strategic Overview" }],
        },
        lead: {
          type: "doc" as const,
          content: [
            {
              type: "text" as const,
              text: "Key strategic pillars for execution.",
            },
          ],
        },
        content: {
          type: "doc" as const,
          content: [
            {
              type: "paragraph" as const,
              content: [
                { type: "text" as const, text: "Detailed description." },
              ],
            },
          ],
        },
      }
      const html = renderToString(
        <DocumentBlockRenderer
          block={block}
          title="Test"
          issueDate="2026-08-01"
          seller={seller}
          customer={customer}
        />
      )
      expect(html).toContain("Executive Summary")
      expect(html).toContain("Strategic Overview")
      expect(html).toContain("Key strategic pillars for execution.")
      expect(html).toContain("Detailed description.")
      expect(html).toContain("rounded-[calc(var(--document-radius)*1.5)]")
    })

    test("renders metrics (keyNumbers) block with large typography", () => {
      const block = {
        id: "metrics_1",
        version: 1 as const,
        type: "metrics" as const,
        columns: 3 as const,
        items: [
          {
            id: "m_1",
            value: {
              type: "doc" as const,
              content: [{ type: "text" as const, text: "99.9%" }],
            },
            label: {
              type: "doc" as const,
              content: [{ type: "text" as const, text: "Uptime SLA" }],
            },
            detail: {
              type: "doc" as const,
              content: [
                { type: "text" as const, text: "Enterprise guaranteed" },
              ],
            },
          },
        ],
      }
      const html = renderToString(
        <DocumentBlockRenderer
          block={block}
          title="Test"
          issueDate="2026-08-01"
          seller={seller}
          customer={customer}
        />
      )
      expect(html).toContain("99.9%")
      expect(html).toContain("Uptime SLA")
      expect(html).toContain("Enterprise guaranteed")
      expect(html).toContain("text-[var(--document-accent)]")
    })

    test("renders team block with avatars", () => {
      const block = {
        id: "team_1",
        version: 1 as const,
        type: "team" as const,
        columns: 2 as const,
        items: [
          {
            id: "tm_1",
            name: {
              type: "doc" as const,
              content: [{ type: "text" as const, text: "Sarah Connor" }],
            },
            role: {
              type: "doc" as const,
              content: [{ type: "text" as const, text: "Lead Architect" }],
            },
            bio: {
              type: "doc" as const,
              content: [
                {
                  type: "text" as const,
                  text: "10+ years scaling cloud platforms",
                },
              ],
            },
          },
        ],
      }
      const html = renderToString(
        <DocumentBlockRenderer
          block={block}
          title="Test"
          issueDate="2026-08-01"
          seller={seller}
          customer={customer}
        />
      )
      expect(html).toContain("Sarah Connor")
      expect(html).toContain("Lead Architect")
      expect(html).toContain("10+ years scaling cloud platforms")
    })

    test("renders testimonials block with quotes", () => {
      const block = {
        id: "test_1",
        version: 1 as const,
        type: "testimonials" as const,
        columns: 1 as const,
        items: [
          {
            id: "t_1",
            quote: {
              type: "doc" as const,
              content: [
                {
                  type: "text" as const,
                  text: "Delivered on time and exceeded expectations.",
                },
              ],
            },
            author: {
              type: "doc" as const,
              content: [{ type: "text" as const, text: "Alex Rivera" }],
            },
            role: {
              type: "doc" as const,
              content: [{ type: "text" as const, text: "VP Engineering" }],
            },
          },
        ],
      }
      const html = renderToString(
        <DocumentBlockRenderer
          block={block}
          title="Test"
          issueDate="2026-08-01"
          seller={seller}
          customer={customer}
        />
      )
      expect(html).toContain("Delivered on time and exceeded expectations.")
      expect(html).toContain("Alex Rivera")
      expect(html).toContain("VP Engineering")
      expect(html).toContain("border-[var(--document-accent)]")
    })
  })

  describe("StatusScreen", () => {
    test("renders not_found status correctly", () => {
      const html = renderToString(
        <StatusScreen status="not_found" documentType="proposal" />
      )
      expect(html).toContain("Proposal Not Found")
      expect(html).toContain("does not exist or may have been removed")
    })

    test("renders expired status correctly", () => {
      const html = renderToString(
        <StatusScreen status="expired" documentType="invoice" />
      )
      expect(html).toContain("Invoice Link Expired")
      expect(html).toContain("contact the sender for an updated link")
    })

    test("renders unavailable (revoked) status correctly", () => {
      const html = renderToString(
        <StatusScreen
          status="unavailable"
          reason="revoked"
          documentType="proposal"
        />
      )
      expect(html).toContain("Proposal Link Unavailable")
      expect(html).toContain("revoked by the issuer")
    })
  })

  describe("GateChallenge", () => {
    test("renders unchangeable bound email and Request OTP action", () => {
      const html = renderToString(
        <GateChallenge
          title="Mobile App Proposal"
          sellerName="Acme Corp"
          boundEmail="recipient@example.com"
          documentType="proposal"
          onVerified={() => {}}
        />
      )

      expect(html).toContain("Verification Required")
      expect(html).toContain("Acme Corp")
      expect(html).toContain("recipient@example.com")
      expect(html).toContain("Unchangeable")
      expect(html).toContain("Request OTP")
      expect(html).not.toContain('placeholder="you@company.com"')
    })

    test("displays fallback text when boundEmail is null/missing", () => {
      const html = renderToString(
        <GateChallenge
          title="Invoice #101"
          sellerName="Beta Ltd"
          boundEmail={null}
          documentType="invoice"
          onVerified={() => {}}
        />
      )

      expect(html).toContain("No recipient email bound")
      expect(html).toContain("Request OTP")
    })
  })

  describe("ProposalView", () => {
    test("renders proposal model with seller, customer, title, dates, and pricing", () => {
      const model = buildProposalRenderModel(mockProposalInput)
      const html = renderToString(
        <ProposalView proposal={model} appTheme="light" />
      )

      expect(html).toContain("Mobile App Development Proposal")
      expect(html).toContain("Acme Software Studio")
      expect(html).toContain("Global Retail Corp")
      expect(html).toContain("iOS &amp; Android Mobile App")
      expect(html).toContain("Cloud Backend API")
      expect(html).toContain("$20,000.00") // total calculation: 15,000 + 2*2,500 = 20,000
      expect(html).toContain("Scope of Work")
      expect(html).toContain("What is the timeline?")
    })

    test("renders accepted state badge when accepted prop is present", () => {
      const model = buildProposalRenderModel(mockProposalInput)
      const accepted = {
        id: "acc_1",
        proposalSnapshotId: "snap_1",
        publicLinkId: "link_1",
        signerName: "Jane Doe",
        signerEmail: "jane@globalretail.com",
        signatureText: "Jane Doe",
        signatureImage: null,
        otpVerified: true,
        agreedTerms: true,
        acceptedAt: "2026-08-06T12:00:00Z",
        ipAddress: "127.0.0.1",
        userAgent: "Mozilla",
      }

      const html = renderToString(
        <ProposalView proposal={model} accepted={accepted} />
      )
      expect(html).toContain("Proposal Accepted")
      expect(html).toContain("Jane Doe")
      expect(html).toContain("jane@globalretail.com")
      expect(html).toContain("OTP Verified")
    })

    test("renders acceptance form when onAccept handler is passed and proposal not accepted", () => {
      const model = buildProposalRenderModel(mockProposalInput)
      const html = renderToString(
        <ProposalView proposal={model} onAccept={async () => {}} />
      )

      expect(html).toContain("Accept &amp; Sign Proposal")
      expect(html).toContain("signerName")
      expect(html).toContain("signerEmail")
      expect(html).toContain("agreedTerms")
      expect(html).toContain("Accept Proposal")
    })

    test("uses responsive container and CSS variable design tokens", () => {
      const model = buildProposalRenderModel(mockProposalInput)
      const html = renderToString(
        <ProposalView proposal={model} appTheme="light" />
      )

      expect(html).toContain("min-h-screen")
      expect(html).toContain('data-testid="proposal-view-container"')
      expect(html).toContain("bg-[var(--document-canvas-background)]")
      expect(html).toContain("bg-[var(--document-page-background)]")
    })

    test("applies Web Studio template tokens when configured in proposal template", () => {
      const webStudioInput = {
        ...mockProposalInput,
        template: {
          id: webStudioProposalTemplate.id,
          version: 1,
        },
      }
      const model = buildProposalRenderModel(webStudioInput)
      const template = getDocumentTemplate(model.template, "light")
      const style = getDocumentTemplateStyle(template)
      const html = renderToString(
        <ProposalView proposal={model} appTheme="light" />
      )

      expect(style["--document-accent"]).toBe("#0f766e")
      expect(style["--document-canvas-background"]).toBe("#eef4f1")
      expect(html).toContain("--document-canvas-background:#eef4f1")
    })

    test("renders typed vs drawn signature mode buttons when onAccept is provided", () => {
      const model = buildProposalRenderModel(mockProposalInput)
      const html = renderToString(
        <ProposalView proposal={model} onAccept={async () => {}} />
      )

      expect(html).toContain("Typed Signature")
      expect(html).toContain("Drawn Signature")
      expect(html).toContain('data-testid="signature-mode-typed"')
      expect(html).toContain('data-testid="signature-mode-drawn"')
    })
  })

  describe("DrawnCanvas Component", () => {
    test("renders canvas element and clear button in SSR HTML", () => {
      const html = renderToString(<DrawnCanvas onChange={() => {}} />)

      expect(html).toContain('data-testid="signature-canvas"')
      expect(html).toContain('data-testid="clear-signature-button"')
      expect(html).toContain("Draw your signature above")
    })
  })

  describe("InvoiceView", () => {
    test("renders invoice model with number, dates, terms, seller, customer, and pricing", () => {
      const model = buildInvoiceRenderModel(mockInvoiceInput)
      const html = renderToString(
        <InvoiceView
          invoice={model}
          paymentLinkUrl="https://pay.stripe.com/invoice123"
        />
      )

      expect(html).toContain("Invoice for Milestone 1")
      expect(html).toContain("INV-2026-001")
      expect(html).toContain("Net 14")
      expect(html).toContain("Apex Engineering LLC")
      expect(html).toContain("Venture Partners Inc")
      expect(html).toContain("Phase 1 UI Design &amp; Architecture")
      expect(html).toContain("$5,000.00")
      expect(html).toContain("Pay Now")
      expect(html).toContain("https://pay.stripe.com/invoice123")
      expect(html).toContain("Wire Transfer Instructions")
    })

    test("renders invoice accepted badge when accepted prop is present", () => {
      const model = buildInvoiceRenderModel(mockInvoiceInput)
      const accepted = {
        id: "inv_acc_1",
        invoiceSnapshotId: "snap_inv_1",
        publicLinkId: "link_inv_1",
        signerName: "Alice Smith",
        signerEmail: "alice@venturepartners.com",
        signatureText: "Alice Smith",
        signatureImage:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        otpVerified: false,
        agreedTerms: true,
        acceptedAt: "2026-08-06T15:30:00Z",
        ipAddress: "127.0.0.1",
        userAgent: "Mozilla",
      }

      const html = renderToString(
        <InvoiceView invoice={model} accepted={accepted} />
      )

      expect(html).toContain("Invoice Accepted")
      expect(html).toContain("Alice Smith")
      expect(html).toContain("alice@venturepartners.com")
      expect(html).toContain('alt="Drawn Signature"')
      expect(html).toContain("data:image/png;base64")
    })

    test("renders payment link and pay-now-button data-testid when paymentLinkUrl is provided", () => {
      let payNowCalled = false
      const onPayNow = () => {
        payNowCalled = true
      }
      const model = buildInvoiceRenderModel(mockInvoiceInput)
      const html = renderToString(
        <InvoiceView
          invoice={model}
          paymentLinkUrl="https://pay.stripe.com/test_123"
          onPayNow={onPayNow}
        />
      )

      expect(html).toContain('data-testid="pay-now-button"')
      expect(html).toContain("https://pay.stripe.com/test_123")
      expect(html).toContain("Pay Now")
      onPayNow()
      expect(payNowCalled).toBe(true)
    })

    test("renders typed vs drawn signature mode buttons when onAccept is provided", () => {
      const model = buildInvoiceRenderModel(mockInvoiceInput)
      const html = renderToString(
        <InvoiceView invoice={model} onAccept={async () => {}} />
      )

      expect(html).toContain("Typed Signature")
      expect(html).toContain("Drawn Signature")
      expect(html).toContain('data-testid="inv-signature-mode-typed"')
      expect(html).toContain('data-testid="inv-signature-mode-drawn"')
    })
  })

  describe("Client Route Parsing", () => {
    test("parsePathname correctly matches proposal and invoice tokens", () => {
      expect(parsePathname("/p/token_abc123")).toEqual({
        type: "proposal",
        token: "token_abc123",
      })

      expect(parsePathname("/i/inv_xyz789")).toEqual({
        type: "invoice",
        token: "inv_xyz789",
      })

      expect(parsePathname("/p/token%20with%20spaces")).toEqual({
        type: "proposal",
        token: "token with spaces",
      })

      expect(parsePathname("/other/path")).toEqual({
        type: "unknown",
      })
    })
  })
})
