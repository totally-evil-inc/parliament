import type { EditorCommand } from "./commands"

const SLASH_COMMAND_LIMIT = 20

export const filterSlashCommandItems = (
  query: string,
  commands: Array<EditorCommand>
) => {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return commands.slice(0, SLASH_COMMAND_LIMIT)
  }

  return commands
    .filter((command) => {
      const searchableText = [
        command.title,
        command.description,
        ...command.searchTerms,
      ]
        .join(" ")
        .toLowerCase()

      return searchableText.includes(normalizedQuery)
    })
    .slice(0, SLASH_COMMAND_LIMIT)
}
