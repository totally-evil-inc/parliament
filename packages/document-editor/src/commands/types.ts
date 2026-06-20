import type { Range } from "@tiptap/core"
import type { Editor } from "@tiptap/react"
import type { Text } from "@hugeicons/core-free-icons"

export type EditorCommandContext = {
  editor: Editor
  range?: Range
}

export type EditorCommand = {
  id: string
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
