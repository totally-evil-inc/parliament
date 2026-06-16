import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Placeholder } from '@tiptap/extensions'
import { EditorFloatingMenu } from './floating-menu'
import { EditorBubbleMenu } from './bubble-menu'
import { SlashCommand } from './slash-command'

export default function NotionEditor() {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') {
            return `Heading ${node.attrs.level}`
          }
          return "Press '/' for commands..."
        },
      }),
      SlashCommand
    ],
    content: '',
    editorProps: {
      attributes: {
        class: [
          "prose prose-sm dark:prose-invert",
          "max-w-3xl min-h-screen w-screen cursor-text focus:outline-none",
          "prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground",
          "prose-code:text-foreground prose-blockquote:text-muted-foreground",
          "prose-a:text-primary",
          "prose-p:leading-6 prose-li:leading-6 prose-headings:leading-tight"
        ].join(" "),
      },
    },
  })

  return (
    <div className="flex justify-center p-4">
      <div className="shadow-3xl p-4 shadow-muted/50 border-2 border-muted/50 rounded-md">
        <div className="relative">
          <EditorBubbleMenu editor={editor} />
          <EditorFloatingMenu editor={editor} />
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  )
}