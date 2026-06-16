import {
  EditorContent,
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
} from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Placeholder } from "@tiptap/extensions"
import {
  Details,
  DetailsContent,
  DetailsSummary,
} from "@tiptap/extension-details"
import HardBreak from "@tiptap/extension-hard-break"
import HorizontalRule from "@tiptap/extension-horizontal-rule"
import { Mathematics } from "@tiptap/extension-mathematics"
import { TaskItem as BaseTaskItem, TaskList } from "@tiptap/extension-list"
import { Checkbox } from "@workspace/ui/components/checkbox"
import "katex/dist/katex.min.css"
import { EditorFloatingMenu } from "./floating-menu"
import { EditorBubbleMenu } from "./bubble-menu"
import { SlashCommand } from "./slash-command"
import type { NodeViewProps } from "@tiptap/react"

const TaskItemNodeView = ({ node, updateAttributes }: NodeViewProps) => {
  const checked = Boolean(node.attrs.checked)

  return (
    <NodeViewWrapper
      as="li"
      className="flex list-none items-start gap-2 py-1 pl-0"
      data-checked={checked ? "true" : "false"}
      data-type="taskItem"
    >
      <Checkbox
        aria-label={
          checked ? "Mark task as incomplete" : "Mark task as complete"
        }
        checked={checked}
        className="mt-1"
        contentEditable={false}
        onCheckedChange={(nextChecked) => {
          updateAttributes({ checked: nextChecked === true })
        }}
      />
      <NodeViewContent className="min-w-0 flex-1 [&_p]:m-0" />
    </NodeViewWrapper>
  )
}

const TaskItem = BaseTaskItem.extend({
  addNodeView() {
    return ReactNodeViewRenderer(TaskItemNodeView)
  },
})

export default function NotionEditor() {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        hardBreak: false,
        heading: { levels: [1, 2, 3] },
        horizontalRule: false,
      }),
      Details.configure({
        persist: true,
        HTMLAttributes: {
          class:
            "relative rounded-md border border-border bg-muted/20 py-2 pl-9 pr-3",
        },
        renderToggleButton: ({ element, isOpen }) => {
          element.setAttribute(
            "aria-label",
            isOpen ? "Collapse details content" : "Expand details content"
          )
          element.setAttribute("aria-expanded", String(isOpen))
          element.textContent = "›"
          element.className = [
            "absolute left-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground transition-transform hover:bg-accent hover:text-accent-foreground",
            isOpen ? "rotate-90" : "rotate-0",
          ].join(" ")
        },
      }),
      DetailsSummary.configure({
        HTMLAttributes: {
          class: "min-h-6 cursor-text font-medium text-foreground [&_p]:m-0",
        },
      }),
      DetailsContent.configure({
        HTMLAttributes: {
          class:
            "mt-2 border-l border-border pl-3 text-foreground [&_p:last-child]:mb-0",
        },
      }),
      HardBreak,
      HorizontalRule,
      Mathematics.configure({
        katexOptions: {
          throwOnError: false,
        },
        inlineOptions: {
          onClick: (node, pos) => {
            const latex = window.prompt("Edit inline LaTeX", node.attrs.latex)

            if (latex === null) {
              return
            }

            editor.chain().focus().updateInlineMath({ latex, pos }).run()
          },
        },
        blockOptions: {
          onClick: (node, pos) => {
            const latex = window.prompt("Edit display LaTeX", node.attrs.latex)

            if (latex === null) {
              return
            }

            editor.chain().focus().updateBlockMath({ latex, pos }).run()
          },
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === "heading") {
            return `Heading ${node.attrs.level}`
          }
          if (node.type.name === "detailsSummary") {
            return "Summary"
          }
          return "Press '/' for commands..."
        },
      }),
      SlashCommand,
    ],
    content: "",
    editorProps: {
      attributes: {
        class: [
          "prose prose-sm dark:prose-invert",
          "max-w-3xl min-h-screen w-screen cursor-text focus:outline-none",
          "prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground",
          "prose-code:text-foreground prose-blockquote:text-muted-foreground",
          "prose-a:text-primary prose-hr:border-border prose-ul:data-[type=taskList]:list-none prose-ul:data-[type=taskList]:pl-0",
          "prose-p:leading-6 prose-li:leading-6 prose-headings:leading-tight",
          "[&_[data-type=detailsContent][hidden]]:hidden",
          "[&_.tiptap-mathematics-render]:cursor-pointer [&_.tiptap-mathematics-render]:rounded-sm [&_.tiptap-mathematics-render]:border [&_.tiptap-mathematics-render]:border-transparent [&_.tiptap-mathematics-render]:px-1 [&_.tiptap-mathematics-render:hover]:border-border [&_.tiptap-mathematics-render:hover]:bg-muted/50",
          "[&_[data-type=block-math]]:my-3 [&_[data-type=block-math]]:overflow-x-auto [&_[data-type=block-math]]:py-3",
        ].join(" "),
      },
    },
  })

  return (
    <div className="flex justify-center p-4">
      <div className="shadow-3xl rounded-md border-2 border-muted/50 p-4 shadow-muted/50">
        <div className="relative">
          <EditorBubbleMenu editor={editor} />
          <EditorFloatingMenu editor={editor} />
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  )
}
