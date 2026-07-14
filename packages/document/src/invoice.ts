import type { InvoiceDraft } from "./schema"

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

export function createInvoiceDraft({
  id,
  now = new Date(),
  sellerName = "",
}: {
  id: string
  now?: Date
  sellerName?: string
}): InvoiceDraft {
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
    kind: "invoice",
    schemaVersion: 1,
    revision: 0,
    status: "draft",
    locale: "en-KE",
    timezone: "Africa/Nairobi",
    template: { id: "invoice-classic", version: 1 },
    data: {
      title: "Invoice",
      invoiceNumber: `INV-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${String(Math.floor(1000 + Math.random() * 9000))}`,
      issueDate: dateOnly(now),
      dueDate: dateOnly(addDays(now, 30)),
      seller: { ...emptyParty, name: sellerName },
      customer: { ...emptyParty },
      pricing: {
        currency: "KES",
        items: [],
      },
    },
    composition: {
      version: 1,
      blocks: [
        {
          id: "invoice-header",
          type: "partyHeader",
          version: 1,
          binding: "invoice.parties",
          config: { layout: "mark-left-dates-right" },
        },
        {
          id: "invoice-body",
          type: "richText",
          version: 1,
          content: { type: "doc", content: [{ type: "paragraph" }] },
        },
        {
          id: "invoice-pricing",
          type: "pricing",
          version: 1,
          binding: "invoice.pricing",
          config: { title: "Services & Billing" },
        },
      ],
    },
    assets: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function createInvoiceDraftFromBlueprint({
  blueprint,
  id,
  now = new Date(),
  sellerName = "Northstar Studio",
}: {
  blueprint: "standard" | "classic"
  id: string
  now?: Date
  sellerName?: string
}): InvoiceDraft {
  const draft = createInvoiceDraft({ id, now, sellerName })
  const timestamp = now.toISOString()

  if (blueprint !== "standard") return draft

  return {
    ...draft,
    revision: 0,
    data: {
      ...draft.data,
      title: "Tax Invoice",
      invoiceNumber: `INV-${now.getFullYear()}-001`,
      issueDate: dateOnly(now),
      dueDate: dateOnly(addDays(now, 14)),
      seller: {
        ...draft.data.seller,
        name: sellerName,
        email: "finance@northstar.studio",
        website: "northstar.studio",
        phone: "+254 700 000 000",
        address: "Nairobi, Kenya",
      },
      customer: {
        ...draft.data.customer,
        name: "Acme Safari Co.",
        email: "accounts@acmesafari.example",
        website: "acmesafari.example",
        address: "Mombasa Road, Nairobi",
      },
      pricing: {
        currency: "KES",
        items: [
          {
            id: "invoice-item-1",
            description: "Website Development - Milestone 1",
            details: "Development of CMS collections and pages.",
            quantity: "1",
            unitPriceMinor: 150_000_00,
            showDetails: true,
            showImage: false,
          },
        ],
        tax: { kind: "rate", basisPoints: 1_600 },
      },
      paymentTerms: "Net 14 Days. Please remit payment via bank transfer.",
    },
    composition: {
      version: 1,
      blocks: [
        {
          id: "invoice-header",
          type: "partyHeader",
          version: 1,
          binding: "invoice.parties",
          config: { layout: "editorial-band" },
        },
        {
          id: "invoice-body",
          type: "richText",
          version: 1,
          content: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "Thank you for your business. Please find below the invoice for the website development services rendered.",
                  },
                ],
              },
            ],
          },
        },
        {
          id: "invoice-pricing",
          type: "pricing",
          version: 1,
          binding: "invoice.pricing",
          config: { title: "Invoice Line Items" },
        },
      ],
    },
    assets: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}
