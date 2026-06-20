import type { ProposalDraft } from "./schema"

function dateOnly(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-")
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
