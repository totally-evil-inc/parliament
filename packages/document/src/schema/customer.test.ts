import { describe, expect, it } from "bun:test"
import {
  createCustomerInputSchema,
  customerAnalyticsSchema,
  customerSchema,
  customerStatusEnumSchema,
  updateCustomerInputSchema,
} from "./customer"

describe("Customer Domain Models & Schemas", () => {
  it("validates customer status enum values", () => {
    expect(customerStatusEnumSchema.parse("active")).toBe("active")
    expect(customerStatusEnumSchema.parse("lead")).toBe("lead")
    expect(customerStatusEnumSchema.parse("inactive")).toBe("inactive")
    expect(customerStatusEnumSchema.parse("churned")).toBe("churned")
    expect(() => customerStatusEnumSchema.parse("invalid_status")).toThrow()
  })

  it("validates full Customer entity", () => {
    const validCustomer = {
      id: "019fecc1-a5fb-7cd8-93f8-4b3f218f6d91",
      organizationId: "019fecc1-a4fd-7086-b102-f7f5d78e9f82",
      name: "Acme Corporation",
      billingEmail: "billing@acme.com",
      phone: "+1 555 123 4567",
      website: "https://acme.com",
      domain: "acme.com",
      vatNumber: "US998877665",
      addressLine1: "100 Market St",
      city: "San Francisco",
      state: "CA",
      zip: "94105",
      country: "USA",
      status: "active",
      preferredCurrency: "USD",
      defaultPaymentTerms: 30,
      isArchived: false,
      createdAt: "2026-08-10T12:00:00.000Z",
      updatedAt: "2026-08-10T12:00:00.000Z",
    }
    expect(customerSchema.parse(validCustomer)).toEqual(validCustomer)
  })

  it("parses CreateCustomerInput with default status and currency", () => {
    const input = createCustomerInputSchema.parse({
      name: "Stripe Inc",
      billingEmail: "invoices@stripe.com",
    })
    expect(input.status).toBe("active")
    expect(input.preferredCurrency).toBe("USD")
    expect(input.defaultPaymentTerms).toBe(30)
  })

  it("parses UpdateCustomerInput", () => {
    const update = updateCustomerInputSchema.parse({
      id: "cust-123",
      status: "churned",
      isArchived: true,
    })
    expect(update.status).toBe("churned")
    expect(update.isArchived).toBe(true)
  })

  it("parses CustomerAnalytics metrics structure", () => {
    const analytics = customerAnalyticsSchema.parse({
      totalCustomersCount: 42,
      topRevenueClient: { name: "Acme Corp", revenueMinorUnits: 1500000 },
      mostActiveClient: { name: "Acme Corp", proposalsCount: 8 },
      inactiveClientsCount: 3,
      newCustomersThisMonth: 5,
    })
    expect(analytics.totalCustomersCount).toBe(42)
    expect(analytics.topRevenueClient?.revenueMinorUnits).toBe(1500000)
  })
})
