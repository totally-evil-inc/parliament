import { expect, test } from "bun:test"

import { shouldShowEditorBubbleMenu } from "./menus"

const textParent = { inlineContent: true }
const blockParent = { inlineContent: false }

function editor(selection: unknown, options = {}) {
  return {
    isEditable: true,
    isFocused: true,
    state: { selection },
    ...options,
  } as Parameters<typeof shouldShowEditorBubbleMenu>[0]
}

test("bubble menu hides for a collapsed text cursor", () => {
  expect(
    shouldShowEditorBubbleMenu(
      editor({
        empty: true,
        $from: { parent: textParent },
        $to: { parent: textParent },
      })
    )
  ).toBe(false)
})

test("bubble menu shows for a focused editable text range", () => {
  expect(
    shouldShowEditorBubbleMenu(
      editor({
        empty: false,
        $from: { parent: textParent },
        $to: { parent: textParent },
      })
    )
  ).toBe(true)
})

test("bubble menu hides when the editor cannot accept formatting", () => {
  const selection = {
    empty: false,
    $from: { parent: textParent },
    $to: { parent: textParent },
  }

  expect(
    shouldShowEditorBubbleMenu(editor(selection, { isFocused: false }))
  ).toBe(false)
  expect(
    shouldShowEditorBubbleMenu(editor(selection, { isEditable: false }))
  ).toBe(false)
})

test("bubble menu hides for node and table cell selections", () => {
  expect(
    shouldShowEditorBubbleMenu(
      editor({
        empty: false,
        node: {},
        $from: { parent: blockParent },
        $to: { parent: blockParent },
      })
    )
  ).toBe(false)

  expect(
    shouldShowEditorBubbleMenu(
      editor({
        empty: false,
        $anchorCell: {},
        $from: { parent: textParent },
        $to: { parent: textParent },
      })
    )
  ).toBe(false)
})
