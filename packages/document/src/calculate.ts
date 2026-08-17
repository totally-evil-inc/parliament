import type { z } from "zod"
import type { invoicePricingSchema, proposalPricingSchema } from "./schema"

export * from "./calculate/currency"

export type ProposalPricing = z.infer<typeof proposalPricingSchema>
export type InvoicePricing = z.infer<typeof invoicePricingSchema>

export type PricingCalculation = {
  lines: Array<{ id: string; amountMinor: number }>
  subtotalMinor: number
  discountMinor: number
  taxableMinor: number
  taxMinor: number
  totalMinor: number
  calculationVersion: "proposal-pricing@1"
}

export type InvoicePricingCalculation = {
  lines: Array<{ id: string; amountMinor: number }>
  subtotalMinor: number
  discountMinor: number
  taxableMinor: number
  taxMinor: number
  totalMinor: number
  calculationVersion: "invoice-pricing@1"
}

function decimalToScaledInteger(value: string) {
  const [whole = "0", fraction = ""] = value.split(".")
  const scale = 10 ** fraction.length
  return { value: Number(whole) * scale + Number(fraction || 0), scale }
}

function roundRatio(value: number, numerator: number, denominator: number) {
  return Math.round((value * numerator) / denominator)
}

export function calculateProposalPricing(
  pricing: ProposalPricing
): PricingCalculation {
  const lines = pricing.items.map((item) => {
    const quantity = decimalToScaledInteger(item.quantity)
    return {
      id: item.id,
      amountMinor: roundRatio(
        item.unitPriceMinor,
        quantity.value,
        quantity.scale
      ),
    }
  })
  const subtotalMinor = lines.reduce((sum, line) => sum + line.amountMinor, 0)
  const requestedDiscount = pricing.discount
    ? pricing.discount.kind === "fixed"
      ? pricing.discount.amountMinor
      : roundRatio(subtotalMinor, pricing.discount.basisPoints, 10_000)
    : 0
  const discountMinor = Math.min(requestedDiscount, subtotalMinor)
  const taxableMinor = subtotalMinor - discountMinor
  const taxMinor = pricing.tax
    ? roundRatio(taxableMinor, pricing.tax.basisPoints, 10_000)
    : 0

  return {
    lines,
    subtotalMinor,
    discountMinor,
    taxableMinor,
    taxMinor,
    totalMinor: taxableMinor + taxMinor,
    calculationVersion: "proposal-pricing@1",
  }
}

export function calculateInvoicePricing(
  pricing: InvoicePricing
): InvoicePricingCalculation {
  const lines = pricing.items.map((item) => {
    const quantity = decimalToScaledInteger(item.quantity)
    return {
      id: item.id,
      amountMinor: roundRatio(
        item.unitPriceMinor,
        quantity.value,
        quantity.scale
      ),
    }
  })
  const subtotalMinor = lines.reduce((sum, line) => sum + line.amountMinor, 0)
  const requestedDiscount = pricing.discount
    ? pricing.discount.kind === "fixed"
      ? pricing.discount.amountMinor
      : roundRatio(subtotalMinor, pricing.discount.basisPoints, 10_000)
    : 0
  const discountMinor = Math.min(requestedDiscount, subtotalMinor)
  const taxableMinor = subtotalMinor - discountMinor
  const taxMinor = pricing.tax
    ? roundRatio(taxableMinor, pricing.tax.basisPoints, 10_000)
    : 0

  return {
    lines,
    subtotalMinor,
    discountMinor,
    taxableMinor,
    taxMinor,
    totalMinor: taxableMinor + taxMinor,
    calculationVersion: "invoice-pricing@1",
  }
}

export function formatMoneyMinor(
  valueMinor: number | string | null | undefined,
  currency: string,
  locale: string
) {
  const numeric =
    typeof valueMinor === "string"
      ? Number.parseFloat(valueMinor)
      : (valueMinor ?? 0)
  const safeNumber = Number.isNaN(numeric) ? 0 : numeric
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(
    safeNumber / 100
  )
}

export function formatDateOnly(value: string, locale: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return value
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3])
  )
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}
