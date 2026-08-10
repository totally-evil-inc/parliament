import { describe, expect, test } from "bun:test"
import { buildPublicLink } from "./public-links"

describe("buildPublicLink", () => {
  test("builds proposal links on the gate app", () => {
    expect(buildPublicLink("proposal", "token/with spaces")).toBe(
      "http://localhost:4100/p/token%2Fwith%20spaces"
    )
  })

  test("builds invoice links on the gate app", () => {
    expect(buildPublicLink("invoice", "invoice-token")).toBe(
      "http://localhost:4100/i/invoice-token"
    )
  })
})
