import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import { getSuggestionItems } from '@/lib/editor/suggestions'
import { renderItems } from '@/lib/editor/render-suggestions'

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '/',
        startOfLine: true,
        items: getSuggestionItems,
        render: renderItems,
        command: ({ editor, range, props }) => {
          props.command({ editor, range })
        },
      }),
    ]
  },
})
