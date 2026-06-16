import { getFilteredSlashCommands } from "./commands"

export const getSuggestionItems = ({ query }: { query: string }) => {
  return getFilteredSlashCommands(query)
}
