import {
  Bars2Icon,
  BoldIcon,
  CalculatorIcon,
  ChatBubbleBottomCenterTextIcon,
  ChevronRightIcon,
  ClipboardDocumentCheckIcon,
  CodeBracketIcon,
  DocumentTextIcon,
  H1Icon,
  H2Icon,
  H3Icon,
  ItalicIcon,
  ListBulletIcon,
  MinusIcon,
  NumberedListIcon,
  TableCellsIcon,
  VariableIcon,
} from "@heroicons/react/24/outline"
import type { Range } from "@tiptap/core"
import type { Editor } from "@tiptap/react"
import type { EditorCommand } from "./types"

const deleteRangeIfPresent = (editor: Editor, range?: Range) => {
  if (!range) {
    return editor.chain().focus()
  }

  return editor.chain().focus().deleteRange(range)
}

export function createBaseEditorCommands(
  requestTextInput: (options: {
    title: string
    initialValue: string
  }) => string | null
): Array<EditorCommand> {
  return [
    {
      id: "paragraph",
      kind: "blockTransform",
      title: "Text",
      description: "Just start typing with plain text.",
      searchTerms: ["p", "paragraph", "text"],
      icon: DocumentTextIcon,
      group: "block",
      showInBubbleMenu: true,
      showInSlashMenu: true,
      showInFloatingMenu: true,
      isActive: (editor) => editor.isActive("paragraph"),
      command: ({ editor, range }) => {
        deleteRangeIfPresent(editor, range).setNode("paragraph").run()
      },
    },
    {
      id: "heading-1",
      kind: "blockTransform",
      title: "Heading 1",
      description: "Big section heading.",
      searchTerms: ["h1", "heading", "title"],
      icon: H1Icon,
      group: "block",
      showInBubbleMenu: true,
      showInSlashMenu: true,
      showInFloatingMenu: true,
      isActive: (editor) => editor.isActive("heading", { level: 1 }),
      command: ({ editor, range }) => {
        deleteRangeIfPresent(editor, range)
          .setNode("heading", { level: 1 })
          .run()
      },
    },
    {
      id: "heading-2",
      kind: "blockTransform",
      title: "Heading 2",
      description: "Medium section heading.",
      searchTerms: ["h2", "heading", "subtitle"],
      icon: H2Icon,
      group: "block",
      showInBubbleMenu: true,
      showInSlashMenu: true,
      showInFloatingMenu: true,
      isActive: (editor) => editor.isActive("heading", { level: 2 }),
      command: ({ editor, range }) => {
        deleteRangeIfPresent(editor, range)
          .setNode("heading", { level: 2 })
          .run()
      },
    },
    {
      id: "heading-3",
      kind: "blockTransform",
      title: "Heading 3",
      description: "Small section heading.",
      searchTerms: ["h3", "heading", "subheading"],
      icon: H3Icon,
      group: "block",
      showInBubbleMenu: true,
      showInSlashMenu: true,
      showInFloatingMenu: true,
      isActive: (editor) => editor.isActive("heading", { level: 3 }),
      command: ({ editor, range }) => {
        deleteRangeIfPresent(editor, range)
          .setNode("heading", { level: 3 })
          .run()
      },
    },
    {
      id: "bullet-list",
      kind: "blockTransform",
      title: "Bullet List",
      description: "Create a simple bullet list.",
      searchTerms: ["ul", "unordered", "bullet", "list"],
      icon: ListBulletIcon,
      group: "block",
      showInBubbleMenu: true,
      showInSlashMenu: true,
      showInFloatingMenu: true,
      isActive: (editor) => editor.isActive("bulletList"),
      command: ({ editor, range }) => {
        deleteRangeIfPresent(editor, range).toggleBulletList().run()
      },
    },
    {
      id: "ordered-list",
      kind: "blockTransform",
      title: "Ordered List",
      description: "Create a numbered list.",
      searchTerms: ["ol", "ordered", "numbered", "list"],
      icon: NumberedListIcon,
      group: "block",
      showInBubbleMenu: true,
      showInSlashMenu: true,
      showInFloatingMenu: true,
      isActive: (editor) => editor.isActive("orderedList"),
      command: ({ editor, range }) => {
        deleteRangeIfPresent(editor, range).toggleOrderedList().run()
      },
    },
    {
      id: "blockquote",
      kind: "blockTransform",
      title: "Quote",
      description: "Capture a quote or callout.",
      searchTerms: ["blockquote", "quote", "callout"],
      icon: ChatBubbleBottomCenterTextIcon,
      group: "block",
      showInBubbleMenu: true,
      showInSlashMenu: true,
      showInFloatingMenu: true,
      isActive: (editor) => editor.isActive("blockquote"),
      command: ({ editor, range }) => {
        deleteRangeIfPresent(editor, range).setBlockquote().run()
      },
    },
    {
      id: "details",
      kind: "slashInsert",
      title: "Details",
      description: "Create a collapsible details block.",
      searchTerms: ["details", "summary", "toggle", "collapse", "accordion"],
      icon: ChevronRightIcon,
      group: "block",
      showInBubbleMenu: true,
      showInSlashMenu: true,
      showInFloatingMenu: true,
      isActive: (editor) => editor.isActive("details"),
      command: ({ editor, range }) => {
        deleteRangeIfPresent(editor, range).setDetails().run()
      },
    },
    {
      id: "task-list",
      kind: "blockTransform",
      title: "Task List",
      description: "Track todos with checkboxes.",
      searchTerms: ["task", "todo", "checkbox", "checklist", "list"],
      icon: ClipboardDocumentCheckIcon,
      group: "block",
      showInBubbleMenu: true,
      showInSlashMenu: true,
      showInFloatingMenu: true,
      isActive: (editor) => editor.isActive("taskList"),
      command: ({ editor, range }) => {
        deleteRangeIfPresent(editor, range).toggleTaskList().run()
      },
    },
    {
      id: "table",
      kind: "slashInsert",
      title: "Table",
      description: "Create a table with rows and columns.",
      searchTerms: ["table", "grid", "rows", "columns", "cells"],
      icon: TableCellsIcon,
      group: "block",
      showInSlashMenu: true,
      showInFloatingMenu: true,
      command: ({ editor, range }) => {
        deleteRangeIfPresent(editor, range)
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run()
      },
    },
    {
      id: "horizontal-rule",
      kind: "slashInsert",
      title: "Divider",
      description: "Separate sections with a horizontal rule.",
      searchTerms: ["horizontal rule", "hr", "divider", "separator", "line"],
      icon: MinusIcon,
      group: "block",
      showInBubbleMenu: true,
      showInSlashMenu: true,
      showInFloatingMenu: true,
      command: ({ editor, range }) => {
        deleteRangeIfPresent(editor, range).setHorizontalRule().run()
      },
    },
    {
      id: "hard-break",
      kind: "slashInsert",
      title: "Line Break",
      description: "Insert a hard line break.",
      searchTerms: ["hard break", "line break", "br", "newline"],
      icon: Bars2Icon,
      group: "block",
      showInBubbleMenu: true,
      showInSlashMenu: true,
      showInFloatingMenu: true,
      command: ({ editor, range }) => {
        deleteRangeIfPresent(editor, range).setHardBreak().run()
      },
    },
    {
      id: "inline-math",
      kind: "slashInsert",
      title: "Inline Math",
      description: "Insert an inline LaTeX formula.",
      searchTerms: ["math", "mathematics", "latex", "formula", "inline"],
      icon: VariableIcon,
      group: "block",
      showInBubbleMenu: true,
      showInSlashMenu: true,
      showInFloatingMenu: true,
      command: ({ editor, range }) => {
        const latex = requestTextInput({
          title: "Enter inline LaTeX",
          initialValue: "x^2",
        })
        if (!latex) {
          return
        }

        deleteRangeIfPresent(editor, range).insertInlineMath({ latex }).run()
      },
    },
    {
      id: "block-math",
      kind: "slashInsert",
      title: "Block Math",
      description: "Insert a display LaTeX formula.",
      searchTerms: [
        "math",
        "mathematics",
        "latex",
        "formula",
        "block",
        "equation",
      ],
      icon: CalculatorIcon,
      group: "block",
      showInBubbleMenu: true,
      showInSlashMenu: true,
      showInFloatingMenu: true,
      command: ({ editor, range }) => {
        const latex = requestTextInput({
          title: "Enter display LaTeX",
          initialValue: "\\frac{a}{b}",
        })
        if (!latex) {
          return
        }

        deleteRangeIfPresent(editor, range).insertBlockMath({ latex }).run()
      },
    },
    {
      id: "bold",
      kind: "format",
      title: "Bold",
      description: "Make selected text bold.",
      searchTerms: ["bold", "strong", "b"],
      icon: BoldIcon,
      group: "mark",
      showInBubbleMenu: true,
      isActive: (editor) => editor.isActive("bold"),
      command: ({ editor }) => {
        editor.chain().focus().toggleBold().run()
      },
    },
    {
      id: "italic",
      kind: "format",
      title: "Italic",
      description: "Make selected text italic.",
      searchTerms: ["italic", "emphasis", "i"],
      icon: ItalicIcon,
      group: "mark",
      showInBubbleMenu: true,
      isActive: (editor) => editor.isActive("italic"),
      command: ({ editor }) => {
        editor.chain().focus().toggleItalic().run()
      },
    },
    {
      id: "code",
      kind: "format",
      title: "Code",
      description: "Format selected text as inline code.",
      searchTerms: ["code", "inline code", "monospace"],
      icon: CodeBracketIcon,
      group: "mark",
      showInBubbleMenu: true,
      isActive: (editor) => editor.isActive("code"),
      command: ({ editor }) => {
        editor.chain().focus().toggleCode().run()
      },
    },
  ]
}
