import { describe, expect, test } from "bun:test"
import {
  calculateProposalPricing,
  formatDateOnly,
  formatMoneyMinor,
} from "./calculate"

describe("calculateProposalPricing", () => {
  test("uses decimal quantities, discount before tax, and minor-unit rounding", () => {
    const result = calculateProposalPricing({
      currency: "KES",
      items: [
        {
          id: "one",
          description: "Service",
          details: "",
          quantity: "1.5",
          unitPriceMinor: 10_001,
          showDetails: false,
          showImage: false,
        },
      ],
      discount: { kind: "rate", basisPoints: 1_000 },
      tax: { kind: "rate", basisPoints: 1_600 },
      signerName: "",
      signerTitle: "Signature",
    })

    expect(result.subtotalMinor).toBe(15_002)
    expect(result.discountMinor).toBe(1_500)
    expect(result.taxMinor).toBe(2_160)
    expect(result.totalMinor).toBe(15_662)
  })

  test("caps fixed discounts at the subtotal", () => {
    const result = calculateProposalPricing({
      currency: "USD",
      items: [
        {
          id: "one",
          description: "",
          details: "",
          quantity: "1",
          unitPriceMinor: 100,
          showDetails: false,
          showImage: false,
        },
      ],
      discount: { kind: "fixed", amountMinor: 500 },
      signerName: "",
      signerTitle: "Signature",
    })
    expect(result.totalMinor).toBe(0)
  })
})

test("formatters are explicit", () => {
  expect(formatMoneyMinor(123_45, "USD", "en-US")).toBe("$123.45")
  expect(formatDateOnly("2026-06-20", "en-GB")).toBe("20 Jun 2026")
})
