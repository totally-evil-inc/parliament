import { expect, test } from "bun:test"
import { DocumentTextIcon } from "@heroicons/react/24/outline"
import type { EditorCommand } from "./types"

import {
  editorCommandsForBubbleMode,
  editorCommandsForSurface,
  filterEditorCommands,
} from "./types"

const commands: Array<EditorCommand> = [
  {
    id: "paragraph",
    kind: "blockTransform",
    title: "Text",
    description: "Start writing plain text.",
    searchTerms: ["paragraph"],
    icon: DocumentTextIcon,
    group: "block",
    showInBubbleMenu: true,
    showInSlashMenu: true,
    command: () => undefined,
  },
  {
    id: "heading",
    kind: "blockTransform",
    title: "Heading",
    description: "Add a section heading.",
    searchTerms: ["title", "h1"],
    icon: DocumentTextIcon,
    group: "block",
    showInBubbleMenu: true,
    showInSlashMenu: true,
    command: () => undefined,
  },
  {
    id: "bold",
    kind: "format",
    title: "Bold",
    description: "Make text bold.",
    searchTerms: ["strong"],
    icon: DocumentTextIcon,
    group: "mark",
    showInBubbleMenu: true,
    showInSlashMenu: true,
    showInFloatingMenu: true,
    command: () => undefined,
  },
  {
    id: "italic",
    kind: "format",
    title: "Italic",
    description: "Make text italic.",
    searchTerms: ["emphasis"],
    icon: DocumentTextIcon,
    group: "mark",
    showInBubbleMenu: true,
    command: () => undefined,
  },
  {
    id: "code",
    kind: "format",
    title: "Code",
    description: "Make text code.",
    searchTerms: ["monospace"],
    icon: DocumentTextIcon,
    group: "mark",
    showInBubbleMenu: true,
    command: () => undefined,
  },
  {
    id: "proposal-section",
    kind: "documentInsert",
    title: "Section",
    description: "Insert a proposal section.",
    searchTerms: ["proposal"],
    icon: DocumentTextIcon,
    group: "block",
    showInSlashMenu: true,
    showInFloatingMenu: true,
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

test("editor command surfaces exclude commands that are unsafe for that surface", () => {
  expect(
    editorCommandsForSurface(commands, "bubble").map(({ id }) => id)
  ).toEqual(["paragraph", "heading", "bold", "italic", "code"])
  expect(
    editorCommandsForSurface(commands, "slash").map(({ id }) => id)
  ).toEqual(["paragraph", "heading", "proposal-section"])
  expect(
    editorCommandsForSurface(commands, "floating").map(({ id }) => id)
  ).toEqual(["proposal-section"])
})

test("inline bubble commands only include mark formatting", () => {
  const bubbleCommands = editorCommandsForSurface(commands, "bubble")

  expect(
    editorCommandsForBubbleMode(bubbleCommands, "inline").map(({ id }) => id)
  ).toEqual(["bold", "italic", "code"])
  expect(
    editorCommandsForBubbleMode(bubbleCommands, "rich").map(({ id }) => id)
  ).toEqual(["paragraph", "heading", "bold", "italic", "code"])
})
