export type PricingItem = {
  id: string
  description: string
  details?: string
  quantity: number
  rate: number
  total?: number
  showDetails?: boolean
  showImage?: boolean
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

export function money(value: number) {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0)
}

export function safeNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

export function getLineTotal(item: PricingItem) {
  return safeNumber(item.quantity) * safeNumber(item.rate)
}

export function getLineItemKey(item: PricingItem) {
  return (
    item.id || `line-item-${item.description}-${item.quantity}-${item.rate}`
  )
}
