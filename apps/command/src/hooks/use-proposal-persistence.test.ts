import { describe, expect, it } from "bun:test"
import { useProposalPersistence } from "./use-proposal-persistence"

describe("useProposalPersistence hook exports", () => {
  it("exports useProposalPersistence hook function cleanly", () => {
    expect(useProposalPersistence).toBeDefined()
    expect(typeof useProposalPersistence).toBe("function")
  })
})
