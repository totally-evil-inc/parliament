import type { AnyExtension } from "@tiptap/core"
import {
  Details,
  DetailsContent,
  DetailsSummary,
} from "@tiptap/extension-details"
import HardBreak from "@tiptap/extension-hard-break"
import HorizontalRule from "@tiptap/extension-horizontal-rule"
import { TaskItem as BaseTaskItem, TaskList } from "@tiptap/extension-list"
import { Mathematics } from "@tiptap/extension-mathematics"
import { TableCell } from "@tiptap/extension-table/cell"
import { TableHeader } from "@tiptap/extension-table/header"
import { TableRow } from "@tiptap/extension-table/row"
import { Table } from "@tiptap/extension-table/table"
import { Placeholder } from "@tiptap/extensions"
import type { Editor } from "@tiptap/react"
import { ReactNodeViewRenderer } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import type { EditorCommand } from "../commands/types"
import { SlashCommand } from "../components/editor-chrome/slash-command"
import { TaskItemNodeView } from "../components/task-item-node-view"
import { DocumentHeader } from "../proposal/extensions/document-header"
import {
  Faq,
  FaqAnswer,
  FaqItem,
  FaqQuestion,
} from "../proposal/extensions/faq"
import {
  KeyNumbers,
  KeyNumbersDetail,
  KeyNumbersItem,
  KeyNumbersLabel,
  KeyNumbersValue,
} from "../proposal/extensions/key-numbers"
import { LineItems } from "../proposal/extensions/line-items"
import {
  ProposalSection,
  ProposalSectionBody,
  ProposalSectionEyebrow,
  ProposalSectionLead,
  ProposalSectionTitle,
} from "../proposal/extensions/proposal-section"
import {
  TeamMemberBio,
  TeamMemberItem,
  TeamMemberName,
  TeamMemberRole,
  TeamMembers,
} from "../proposal/extensions/team-members"
import {
  TestimonialAuthor,
  TestimonialItem,
  TestimonialQuote,
  TestimonialRole,
  Testimonials,
} from "../proposal/extensions/testimonials"
import {
  ProposalColumnBody,
  ProposalColumnHeading,
  ProposalColumnItem,
  ProposalColumns,
  ProposalColumnsTitle,
  ProposalCover,
  ProposalCoverEyebrow,
  ProposalCoverSubtitle,
  ProposalCoverTitle,
  ProposalImageCardBody,
  ProposalImageCardItem,
  ProposalImageCards,
  ProposalImageCardTitle,
  ProposalImageText,
  ProposalImageTextBody,
  ProposalImageTextEyebrow,
  ProposalImageTextTitle,
  ProposalSignature,
  ProposalSignatureTerms,
  ProposalSignatureTitle,
} from "../proposal/extensions/visual-blocks"
import { DocumentRoot as BusinessDocument } from "./document"
import {
  Timeline,
  TimelineDate,
  TimelineDescription,
  TimelineItem,
  TimelineTitle,
} from "./timeline"

const TaskItem = BaseTaskItem.extend({
  addNodeView() {
    return ReactNodeViewRenderer(TaskItemNodeView)
  },
})

export const documentEditorClassName = [
  "typeset",
  "max-w-full sm:max-w-4xl box-border w-full min-h-[1200px] cursor-text focus:outline-none px-4 py-6 sm:px-12 sm:py-16",
  "mx-auto border-t border-b sm:border border-border bg-background text-foreground sm:shadow-xl sm:shadow-black/10 sm:rounded-sm",
  "[font-family:var(--document-font-family)]",
  "[&_ul:data-[type=taskList]]:list-none [&_ul:data-[type=taskList]]:pl-0",
  "[&_[data-type=detailsContent][hidden]]:hidden",
  "[&_.selectedCell]:bg-primary/10 [&_.column-resize-handle]:pointer-events-none [&_.column-resize-handle]:absolute [&_.column-resize-handle]:right-[-2px] [&_.column-resize-handle]:top-0 [&_.column-resize-handle]:bottom-0 [&_.column-resize-handle]:w-1 [&_.column-resize-handle]:bg-primary [&_.resize-cursor]:cursor-col-resize",
  "[&_.tiptap-mathematics-render]:cursor-pointer [&_.tiptap-mathematics-render]:rounded-sm [&_.tiptap-mathematics-render]:border [&_.tiptap-mathematics-render]:border-transparent [&_.tiptap-mathematics-render]:px-1 [&_.tiptap-mathematics-render:hover]:border-border [&_.tiptap-mathematics-render:hover]:bg-muted/50",
  "[&_[data-type=block-math]]:my-3 [&_[data-type=block-math]]:overflow-x-auto [&_[data-type=block-math]]:py-3",
  "[&_.timeline-item:last-child_.timeline-line]:hidden",
].join(" ")

export function createBaseRichTextPreset({
  getEditor,
  placeholder,
  commands,
  requestTextInput,
}: {
  getEditor: () => Editor | null
  placeholder: string
  commands: Array<EditorCommand>
  requestTextInput: (options: {
    title: string
    initialValue: string
  }) => string | null
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
          const latex = requestTextInput({
            title: "Edit inline LaTeX",
            initialValue: node.attrs.latex,
          })

          if (latex === null || !editor) {
            return
          }

          editor.chain().focus().updateInlineMath({ latex, pos }).run()
        },
      },
      blockOptions: {
        onClick: (node, pos) => {
          const editor = getEditor()
          const latex = requestTextInput({
            title: "Edit display LaTeX",
            initialValue: node.attrs.latex,
          })

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
  ProposalSection,
  ProposalSectionEyebrow,
  ProposalSectionTitle,
  ProposalSectionLead,
  ProposalSectionBody,
  ProposalCover,
  ProposalCoverEyebrow,
  ProposalCoverTitle,
  ProposalCoverSubtitle,
  ProposalColumns,
  ProposalColumnsTitle,
  ProposalColumnItem,
  ProposalColumnHeading,
  ProposalColumnBody,
  ProposalImageText,
  ProposalImageTextEyebrow,
  ProposalImageTextTitle,
  ProposalImageTextBody,
  ProposalImageCards,
  ProposalImageCardItem,
  ProposalImageCardTitle,
  ProposalImageCardBody,
  ProposalSignature,
  ProposalSignatureTitle,
  ProposalSignatureTerms,
  Faq,
  FaqItem,
  FaqQuestion,
  FaqAnswer,
  KeyNumbers,
  KeyNumbersItem,
  KeyNumbersValue,
  KeyNumbersLabel,
  KeyNumbersDetail,
  TeamMembers,
  TeamMemberItem,
  TeamMemberName,
  TeamMemberRole,
  TeamMemberBio,
  Testimonials,
  TestimonialItem,
  TestimonialQuote,
  TestimonialAuthor,
  TestimonialRole,
] satisfies Array<AnyExtension>
