import { describe, expect, test } from "bun:test"
import { backfillSnapshotDocument } from "./backfill"
import {
  defaultDocumentTemplate,
  webStudioProposalTemplate,
} from "./presentation"
import { createProposalDraft } from "./proposal"

describe("Snapshot Backfill & Read-Repair", () => {
  test("backfills legacy proposal snapshot with missing overrides", () => {
    const legacyDraft = createProposalDraft({ id: "prop-legacy" })
    legacyDraft.template = {
      id: "proposal-classic",
      version: 1,
    } as any

    const result = backfillSnapshotDocument(legacyDraft, "light")

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.kind).toBe("proposal")
      expect(result.changed).toBe(true)
      expect(result.document.template.id).toBe("proposal-classic")
      expect(result.document.template.overrides).toEqual(
        defaultDocumentTemplate.tokens
      )
      expect(result.contentHash).toBeTruthy()
    }
  })

  test("idempotently processes already normalized snapshot", () => {
    const draft = createProposalDraft({ id: "prop-normalized" })
    draft.template = {
      id: "proposal-web-studio",
      version: 1,
      overrides: webStudioProposalTemplate.tokens,
    }

    const result = backfillSnapshotDocument(draft, "light")

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.changed).toBe(false)
      expect(result.document.template.overrides).toEqual(
        webStudioProposalTemplate.tokens
      )
    }
  })

  test("handles invalid payload safely", () => {
    const result = backfillSnapshotDocument({ invalid: "data" })
    expect(result.success).toBe(false)
  })
})
