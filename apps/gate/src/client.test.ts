import { describe, expect, test } from "bun:test"
import { getPublicProposalMetaResultSchema } from "@workspace/document/public-api"
import { parsePathname } from "./App"
import { getAuthServerUrl } from "./lib/auth-client"

describe("Gate Client Utilities & Route Parsing", () => {
  test("parsePathname parses proposal and invoice routes correctly", () => {
    expect(parsePathname("/p/token123")).toEqual({
      type: "proposal",
      token: "token123",
    })
    expect(parsePathname("/i/inv456")).toEqual({
      type: "invoice",
      token: "inv456",
    })
    expect(parsePathname("/p/token%20with%20spaces")).toEqual({
      type: "proposal",
      token: "token with spaces",
    })
    expect(parsePathname("/unknown/route")).toEqual({
      type: "unknown",
    })
  })

  test("getAuthServerUrl constructs target auth URL correctly", () => {
    const defaultUrl = getAuthServerUrl()
    expect(defaultUrl).toBe("http://localhost:4000")
  })

  test("response payload parses cleanly with shared public-api Zod contract", () => {
    const validMetaPayload = {
      status: "ready",
      token: "token_123",
      title: "Sample Proposal",
      sellerName: "Acme Corp",
      recipientEmail: "client@example.com",
    }

    const parsed = getPublicProposalMetaResultSchema.safeParse(validMetaPayload)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.status).toBe("ready")
      if (parsed.data.status === "ready") {
        expect(parsed.data.title).toBe("Sample Proposal")
      }
    }
  })
})
