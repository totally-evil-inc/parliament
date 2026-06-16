import { Extension } from "@tiptap/core"
import Suggestion from "@tiptap/suggestion"
import { renderSlashCommandItems } from "./slash-command-renderer"
import { getSlashCommandItems } from "@/lib/editor/command-filter"

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: "/",
        startOfLine: true,
        items: ({ query }) => getSlashCommandItems(query),
        render: renderSlashCommandItems,
        command: ({ editor, range, props }) => {
          props.command({ editor, range })
        },
      }),
    ]
  },
})
