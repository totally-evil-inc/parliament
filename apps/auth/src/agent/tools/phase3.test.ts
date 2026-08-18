import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { db, eq, schema } from "@workspace/database"
import type { AgentContext } from "../tool-ctx"
import {
  customerAnalyticsTool,
  customerDetailsTool,
  listCustomersTool,
} from "./customers-impl"
import {
  getInvoiceSummaryTool,
  getProposalSummaryTool,
  listInvoicesTool,
  listProposalsTool,
} from "./documents-impl"
import { listIntegrationsTool } from "./integrations"

describe("Phase 3 business read tools (apps/auth)", () => {
  let orgId: string
  let foreignOrgId: string
  let userId: string
  let companyId: string

  const ctx = (): AgentContext => ({
    organizationId: orgId,
    userId,
    userEmail: "phase3@test.local",
    orgName: "Phase 3 Test Org",
  })

  beforeAll(async () => {
    const now = new Date()
    const [org] = await db
      .insert(schema.organization)
      .values({
        name: "Phase 3 Test Org",
        slug: `phase3-org-${crypto.randomUUID()}`,
        createdAt: now,
      })
      .returning()
    orgId = org.id

    const [foreignOrg] = await db
      .insert(schema.organization)
      .values({
        name: "Foreign Org",
        slug: `foreign-org-${crypto.randomUUID()}`,
        createdAt: now,
      })
      .returning()
    foreignOrgId = foreignOrg.id

    const [user] = await db
      .insert(schema.user)
      .values({
        id: crypto.randomUUID(),
        name: "Phase 3 User",
        email: `phase3-${crypto.randomUUID()}@test.local`,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
    userId = user.id

    const [company] = await db
      .insert(schema.company)
      .values({
        organizationId: orgId,
        name: "Acme Corp",
        billingEmail: "billing@acme.test",
        status: "active",
        preferredCurrency: "USD",
        createdAt: now,
        updatedAt: now,
      })
      .returning()
    companyId = company.id

    // Foreign company (should be excluded from results)
    await db.insert(schema.company).values({
      organizationId: foreignOrgId,
      name: "Foreign Corp",
      billingEmail: "billing@foreign.test",
      status: "active",
      preferredCurrency: "USD",
      createdAt: now,
      updatedAt: now,
    })
  })

  afterAll(async () => {
    if (companyId) {
      await db.delete(schema.company).where(eq(schema.company.id, companyId))
    }
    if (orgId) {
      await db
        .delete(schema.organization)
        .where(eq(schema.organization.id, orgId))
    }
    if (foreignOrgId) {
      await db
        .delete(schema.organization)
        .where(eq(schema.organization.id, foreignOrgId))
    }
    if (userId) {
      await db.delete(schema.user).where(eq(schema.user.id, userId))
    }
  })

  test("listCustomersTool returns org-scoped customers", async () => {
    const res = await listCustomersTool({}, ctx())
    expect(res.rows).toBeDefined()
    expect(res.rows).toHaveLength(1)
    expect(res.rows[0].name).toBe("Acme Corp")
  })

  test("customerAnalyticsTool returns org customer analytics", async () => {
    const res = await customerAnalyticsTool({}, ctx())
    expect(res.totalCustomersCount).toBe(1)
  })

  test("customerDetailsTool returns customer profile or not_found error", async () => {
    // Exact UUID lookup
    const res = await customerDetailsTool({ id: companyId }, ctx())
    if ("customer" in res && res.customer) {
      expect(res.customer.name).toBe("Acme Corp")
    } else {
      throw new Error("Expected customer profile")
    }

    // Name fallback lookup
    const nameRes = await customerDetailsTool({ id: "Acme Corp" }, ctx())
    if ("customer" in nameRes && nameRes.customer) {
      expect(nameRes.customer.name).toBe("Acme Corp")
    } else {
      throw new Error("Expected customer profile from name lookup")
    }

    // Padded UUID lookup
    const paddedRes = await customerDetailsTool({ id: `  ${companyId}  ` }, ctx())
    if ("customer" in paddedRes && paddedRes.customer) {
      expect(paddedRes.customer.name).toBe("Acme Corp")
    } else {
      throw new Error("Expected customer profile from padded UUID lookup")
    }

    const notFoundRes = await customerDetailsTool(
      { id: crypto.randomUUID() },
      ctx()
    )
    if ("error" in notFoundRes && notFoundRes.error) {
      expect(notFoundRes.error.code).toBe("not_found")
    } else {
      throw new Error("Expected not_found error")
    }
  })

  test("listProposalsTool & listInvoicesTool return empty arrays when none exist", async () => {
    const pRes = await listProposalsTool({}, ctx())
    expect(pRes.rows).toEqual([])

    const iRes = await listInvoicesTool({}, ctx())
    expect(iRes.rows).toEqual([])
  })

  test("getProposalSummaryTool & getInvoiceSummaryTool return not_found for missing IDs", async () => {
    const pRes = await getProposalSummaryTool(
      { id: crypto.randomUUID() },
      ctx()
    )
    if ("error" in pRes && pRes.error) {
      expect(pRes.error.code).toBe("not_found")
    } else {
      throw new Error("Expected not_found error")
    }

    const iRes = await getInvoiceSummaryTool({ id: crypto.randomUUID() }, ctx())
    if ("error" in iRes && iRes.error) {
      expect(iRes.error.code).toBe("not_found")
    } else {
      throw new Error("Expected not_found error")
    }
  })

  test("listIntegrationsTool returns connected accounts for user", async () => {
    const wrapped = listIntegrationsTool(ctx())
    const output = await (
      wrapped as unknown as {
        execute: (
          args: Record<string, never>
        ) => Promise<{ accounts: unknown[] }>
      }
    ).execute({})
    expect(output.accounts).toBeDefined()
  })
})
