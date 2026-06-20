import { expect, test } from "bun:test"
import { Text } from "@hugeicons/core-free-icons"
import type { EditorCommand } from "./types"

import { filterEditorCommands } from "./types"

const commands: Array<EditorCommand> = [
  {
    id: "paragraph",
    title: "Text",
    description: "Start writing plain text.",
    searchTerms: ["paragraph"],
    icon: Text,
    group: "block",
    command: () => undefined,
  },
  {
    id: "heading",
    title: "Heading",
    description: "Add a section heading.",
    searchTerms: ["title", "h1"],
    icon: Text,
    group: "block",
    command: () => undefined,
  },
]

test("editor commands are filtered across labels, descriptions, and terms", () => {
  expect(filterEditorCommands("plain", commands).map(({ id }) => id)).toEqual([
    "paragraph",
  ])
  expect(filterEditorCommands("h1", commands).map(({ id }) => id)).toEqual([
    "heading",
  ])
})

test("editor command filtering preserves catalog order and respects limits", () => {
  expect(filterEditorCommands("", commands, 1).map(({ id }) => id)).toEqual([
    "paragraph",
  ])
})
