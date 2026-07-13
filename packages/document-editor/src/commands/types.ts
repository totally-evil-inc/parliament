import type { Range } from "@tiptap/core"
import type { Editor } from "@tiptap/react"
import type { Text } from "@hugeicons/core-free-icons"

export type EditorCommandContext = {
  editor: Editor
  range?: Range
}

export type EditorCommandKind =
  | "format"
  | "blockTransform"
  | "slashInsert"
  | "documentInsert"

export type EditorCommandSurface = "bubble" | "slash" | "floating"
export type EditorBubbleMode = "rich" | "inline" | null

export type EditorCommand = {
  id: string
  kind: EditorCommandKind
  title: string
  description: string
  searchTerms: Array<string>
  icon: typeof Text
  group: "block" | "mark"
  showInSlashMenu?: boolean
  showInFloatingMenu?: boolean
  showInBubbleMenu?: boolean
  insertionTarget?: "document"
  isActive?: (editor: Editor) => boolean
  command: (context: EditorCommandContext) => void
}

const COMMAND_LIMIT = 20

export function filterEditorCommands(
  query: string,
  commands: Array<EditorCommand>,
  limit = COMMAND_LIMIT
) {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) return commands.slice(0, limit)

  return commands
    .filter((command) =>
      [command.title, command.description, ...command.searchTerms]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    )
    .slice(0, limit)
}

export function editorCommandsForSurface(
  commands: Array<EditorCommand>,
  surface: EditorCommandSurface
) {
  if (surface === "bubble") {
    return commands.filter(
      (command) =>
        command.showInBubbleMenu &&
        (command.kind === "format" || command.kind === "blockTransform")
    )
  }

  if (surface === "slash") {
    return commands.filter(
      (command) =>
        command.showInSlashMenu &&
        (command.kind === "blockTransform" ||
          command.kind === "slashInsert" ||
          command.kind === "documentInsert")
    )
  }

  return commands.filter(
    (command) => command.showInFloatingMenu && command.kind === "documentInsert"
  )
}

export function editorCommandsForBubbleMode(
  commands: Array<EditorCommand>,
  mode: EditorBubbleMode
) {
  if (mode !== "inline") return commands
  return commands.filter(
    (command) => command.kind === "format" && command.group === "mark"
  )
}
