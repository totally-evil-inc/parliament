import { Extension } from "@tiptap/core"
import Suggestion from "@tiptap/suggestion"
import { renderSlashCommandItems } from "./slash-command-renderer"
import type { EditorCommand } from "@/lib/editor/commands"

import { slashMenuCommands } from "@/lib/editor/commands"
import { filterSlashCommandItems } from "@/lib/editor/command-filter"

export const SlashCommand = Extension.create<{
  commands: Array<EditorCommand>
}>({
  name: "slashCommand",

  addOptions() {
    return {
      commands: slashMenuCommands,
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: "/",
        startOfLine: true,
        items: ({ query }) => filterSlashCommandItems(query, this.options.commands),
        render: renderSlashCommandItems,
        command: ({ editor, range, props }) => {
          props.command({ editor, range })
        },
      }),
    ]
  },
})
