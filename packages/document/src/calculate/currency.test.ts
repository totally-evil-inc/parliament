import { describe, expect, it } from "bun:test"
import { convertCurrencyMinorUnits, type ExchangeRateMap } from "./currency"

describe("convertCurrencyMinorUnits", () => {
  const exchangeRates: ExchangeRateMap = {
    baseCurrency: "USD",
    rates: {
      USD: 1.0,
      EUR: 0.92,
      GBP: 0.79,
      JPY: 155.0,
    },
  }

  it("returns exact amount when converting same currency", () => {
    const result = convertCurrencyMinorUnits({
      amountMinorUnits: 10000,
      fromCurrency: "USD",
      toCurrency: "USD",
      exchangeRates,
    })
    expect(result).toBe(10000)
  })

  it("converts USD cents to EUR cents with integer minor units precision", () => {
    // $100.00 USD (10000 cents) -> EUR at rate 0.92 = €92.00 (9200 cents)
    const result = convertCurrencyMinorUnits({
      amountMinorUnits: 10000,
      fromCurrency: "USD",
      toCurrency: "EUR",
      exchangeRates,
    })
    expect(result).toBe(9200)
  })

  it("converts EUR cents to GBP pence through USD base currency", () => {
    // €100.00 EUR (10000 cents) -> USD base (10000 / 0.92) -> GBP (base * 0.79) = 8586.956... -> 8587 pence
    const result = convertCurrencyMinorUnits({
      amountMinorUnits: 10000,
      fromCurrency: "EUR",
      toCurrency: "GBP",
      exchangeRates,
    })
    expect(result).toBe(8587)
  })

  it("throws an error when exchange rate is missing", () => {
    expect(() =>
      convertCurrencyMinorUnits({
        amountMinorUnits: 10000,
        fromCurrency: "USD",
        toCurrency: "CAD",
        exchangeRates,
      })
    ).toThrow("Missing exchange rate for USD or CAD")
  })
})
