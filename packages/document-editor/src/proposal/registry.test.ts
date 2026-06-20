import { expect, test } from "bun:test"

import { proposalEditorRegistry } from "./registry"

test("proposal editor registry has unique and executable block definitions", () => {
  const ids = proposalEditorRegistry.blocks.map(({ id }) => id)
  expect(new Set(ids).size).toBe(ids.length)

  for (const block of proposalEditorRegistry.blocks) {
    expect(block.searchTerms.length).toBeGreaterThan(0)
    if (block.kind === "action") continue
    expect(block.nodeType).toBeTruthy()
    if (block.createContent) {
      expect(block.createContent().type).toBe(block.nodeType)
    }
  }
})

test("host toolbar actions do not embed application callbacks", () => {
  const hostActions = proposalEditorRegistry.toolbarActions.filter(
    ({ hostAction }) => hostAction
  )
  expect(hostActions.map(({ id }) => id)).toEqual(["export", "send"])
  expect(hostActions.every(({ command }) => command === undefined)).toBe(true)
})
