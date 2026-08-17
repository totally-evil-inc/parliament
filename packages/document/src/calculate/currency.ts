export interface ExchangeRateMap {
  baseCurrency: string
  rates: Record<string, number>
}

export function convertCurrencyMinorUnits({
  amountMinorUnits,
  fromCurrency,
  toCurrency,
  exchangeRates,
}: {
  amountMinorUnits: number
  fromCurrency: string
  toCurrency: string
  exchangeRates: ExchangeRateMap
}): number {
  if (fromCurrency === toCurrency) return amountMinorUnits

  const fromRate = exchangeRates.rates[fromCurrency]
  const toRate = exchangeRates.rates[toCurrency]

  if (!fromRate || !toRate) {
    throw new Error(
      `Missing exchange rate for ${fromCurrency} or ${toCurrency}`
    )
  }

  const baseAmount = amountMinorUnits / fromRate
  const converted = Math.round(baseAmount * toRate)
  return converted
}
