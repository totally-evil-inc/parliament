import { describe, expect, test } from "bun:test"
import { calculateInvoicePricing } from "./calculate"
import { finalizeInvoiceDraft } from "./finalize"
import { createInvoiceDraftFromBlueprint } from "./invoice"
import { buildInvoiceRenderModel } from "./render"
import { safeParseInvoiceDraft } from "./schema"
import { extractInvoiceText } from "./text"

describe("Invoice Domain Model", () => {
  test("creates valid blueprints and validates with schema", () => {
    const draft = createInvoiceDraftFromBlueprint({
      id: "abc",
      blueprint: "standard",
      sellerName: "Acme Corp",
    })

    const parsed = safeParseInvoiceDraft(draft)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.id).toBe("abc")
      expect(parsed.data.kind).toBe("invoice")
      expect(parsed.data.data.seller.name).toBe("Acme Corp")
      expect(parsed.data.data.dueDate).toBeDefined()
    }
  })

  test("calculates invoice pricing correctly", () => {
    const pricing = {
      currency: "KES",
      items: [
        {
          id: "one",
          description: "Service Acme",
          details: "",
          quantity: "2.5",
          unitPriceMinor: 20_000, // 200 KES
          showDetails: false,
          showImage: false,
        },
      ],
      discount: { kind: "rate" as const, basisPoints: 1_000 }, // 10%
      tax: { kind: "rate" as const, basisPoints: 1_600 }, // 16%
    }

    const calc = calculateInvoicePricing(pricing)
    // 2.5 * 20000 = 50000 KES cents
    expect(calc.subtotalMinor).toBe(50_000)
    // 10% of 50000 = 5000
    expect(calc.discountMinor).toBe(5_000)
    // 16% of (50000 - 5000) = 16% of 45000 = 7200
    expect(calc.taxMinor).toBe(7_200)
    // 45000 + 7200 = 52200
    expect(calc.totalMinor).toBe(52_200)
  })

  test("extracts text correctly", () => {
    const draft = createInvoiceDraftFromBlueprint({
      id: "abc",
      blueprint: "standard",
      sellerName: "Acme Corp",
    })
    draft.data.title = "Project Invoice for Web Dev"

    const text = extractInvoiceText(buildInvoiceRenderModel(draft))
    expect(text).toContain("Project Invoice for Web Dev")
    expect(text).toContain("Acme Corp")
  })

  test("finalizes snapshots correctly", () => {
    const draft = createInvoiceDraftFromBlueprint({
      id: "abc",
      blueprint: "standard",
      sellerName: "Acme Corp",
    })

    const payload = finalizeInvoiceDraft(draft)
    expect(payload.contentHash).toBeDefined()
    expect(payload.templateId).toBe("invoice-classic")
  })
})
