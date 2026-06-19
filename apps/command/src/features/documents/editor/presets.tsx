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
import { Table } from "@tiptap/extension-table/table"
import { TableCell } from "@tiptap/extension-table/cell"
import { TableHeader } from "@tiptap/extension-table/header"
import { TableRow } from "@tiptap/extension-table/row"
import { ReactNodeViewRenderer } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { TaskItemNodeView } from "./task-item-node-view"
import type { AnyExtension } from "@tiptap/core"
import type { Editor } from "@tiptap/react"
import type { EditorCommand } from "@/lib/editor/commands"

import { BusinessDocument } from "@/features/documents/extensions/document"
import { DocumentHeader } from "@/features/documents/extensions/document-header"
import { LineItems } from "@/features/documents/extensions/line-items"
import { SlashCommand } from "@/features/workspace/editor/slash-command"
import {
  Timeline,
  TimelineDate,
  TimelineDescription,
  TimelineItem,
  TimelineTitle,
} from "@/features/workspace/editor/timeline-extension"

const TaskItem = BaseTaskItem.extend({
  addNodeView() {
    return ReactNodeViewRenderer(TaskItemNodeView)
  },
})

export const documentEditorClassName = [
  "prose prose-sm dark:prose-invert",
  "max-w-4xl min-h-[1200px] w-full cursor-text focus:outline-none px-12 py-16",
  "mx-auto border bg-[var(--document-page-background)] text-[var(--document-foreground)] shadow-sm",
  "rounded-[var(--document-radius)] [font-family:var(--document-font-family)]",
  "prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground",
  "prose-headings:[font-family:var(--document-heading-font-family)]",
  "prose-code:text-foreground prose-blockquote:text-muted-foreground",
  "prose-a:text-primary prose-hr:border-border prose-ul:data-[type=taskList]:list-none prose-ul:data-[type=taskList]:pl-0",
  "prose-p:leading-6 prose-li:leading-6 prose-headings:leading-tight",
  "[&_[data-type=detailsContent][hidden]]:hidden",
  "[&_table]:my-4 [&_table]:w-full [&_table]:table-fixed [&_table]:border-collapse [&_table]:overflow-hidden [&_table]:rounded-md",
  "[&_th]:border [&_th]:border-border [&_th]:bg-muted/60 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-medium [&_th]:align-top",
  "[&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:align-top",
  "[&_th_p]:m-0 [&_td_p]:m-0 [&_th_p]:leading-6 [&_td_p]:m-0",
  "[&_.selectedCell]:bg-primary/10 [&_.column-resize-handle]:pointer-events-none [&_.column-resize-handle]:absolute [&_.column-resize-handle]:right-[-2px] [&_.column-resize-handle]:top-0 [&_.column-resize-handle]:bottom-0 [&_.column-resize-handle]:w-1 [&_.column-resize-handle]:bg-primary [&_.resize-cursor]:cursor-col-resize",
  "[&_.tiptap-mathematics-render]:cursor-pointer [&_.tiptap-mathematics-render]:rounded-sm [&_.tiptap-mathematics-render]:border [&_.tiptap-mathematics-render]:border-transparent [&_.tiptap-mathematics-render]:px-1 [&_.tiptap-mathematics-render:hover]:border-border [&_.tiptap-mathematics-render:hover]:bg-muted/50",
  "[&_[data-type=block-math]]:my-3 [&_[data-type=block-math]]:overflow-x-auto [&_[data-type=block-math]]:py-3",
  "[&_.timeline-item:last-child_.timeline-line]:hidden",
].join(" ")

export function createBaseRichTextPreset({
  getEditor,
  placeholder,
  commands,
}: {
  getEditor: () => Editor | null
  placeholder: string
  commands: Array<EditorCommand>
}): Array<AnyExtension> {
  return [
    StarterKit.configure({
      document: false,
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
          const editor = getEditor()
          const latex = window.prompt("Edit inline LaTeX", node.attrs.latex)

          if (latex === null || !editor) {
            return
          }

          editor.chain().focus().updateInlineMath({ latex, pos }).run()
        },
      },
      blockOptions: {
        onClick: (node, pos) => {
          const editor = getEditor()
          const latex = window.prompt("Edit display LaTeX", node.attrs.latex)

          if (latex === null || !editor) {
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
    Timeline,
    TimelineItem,
    TimelineDate,
    TimelineTitle,
    TimelineDescription,
    Table.configure({
      resizable: true,
      cellMinWidth: 96,
      lastColumnResizable: false,
      allowTableNodeSelection: true,
      HTMLAttributes: {
        class: "notion-table",
      },
    }),
    TableRow,
    TableHeader,
    TableCell,
    Placeholder.configure({
      placeholder: ({ node }) => {
        if (node.type.name === "heading") {
          return `Heading ${node.attrs.level}`
        }
        if (node.type.name === "detailsSummary") {
          return "Summary"
        }
        if (node.type.name === "timelineDate") {
          return "March 15, 2024"
        }
        if (node.type.name === "timelineTitle") {
          return "Project Kickoff"
        }
        if (node.type.name === "timelineDescription") {
          return "Describe the milestone..."
        }
        return placeholder
      },
    }),
    SlashCommand.configure({ commands }),
  ]
}

export const businessDocumentPreset = [
  BusinessDocument,
  DocumentHeader,
  LineItems,
] satisfies Array<AnyExtension>
