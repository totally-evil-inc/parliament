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

test("card layout presets insert atomic items matching their column count", () => {
  for (const blockId of ["key-numbers", "team-members", "testimonials"]) {
    const block = proposalEditorRegistry.blocks.find(({ id }) => id === blockId)
    expect(block?.kind).toBe("insertable")
    if (block?.kind !== "insertable") continue

    for (const columns of [2, 3]) {
      const layout = block.layouts?.find(
        ({ attrs }) => attrs?.columns === columns
      )
      expect(layout).toBeDefined()
      const content = block.createContent(layout)
      expect(content.content).toHaveLength(columns)
      expect(content.attrs?.columns).toBe(columns)
      expect(content.attrs?.items).toBeUndefined()
    }
  }
})
