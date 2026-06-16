import { slashMenuCommands } from "./commands"

const SLASH_COMMAND_LIMIT = 20

export const getSlashCommandItems = (query: string) => {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return slashMenuCommands.slice(0, SLASH_COMMAND_LIMIT)
  }

  return slashMenuCommands
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
