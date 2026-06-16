import {
  Bold,
  ChevronRight,
  CodeXml,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Quote,
  SquarePi,
  Text,
  Variable,
} from "@hugeicons/core-free-icons"
import type { Editor } from "@tiptap/react"
import type { Range } from "@tiptap/core"

type EditorCommandContext = {
  editor: Editor
  range?: Range
}

export type EditorCommand = {
  id: string
  title: string
  description: string
  searchTerms: Array<string>
  icon: typeof Text
  group: "block" | "mark"
  showInSlashMenu?: boolean
  showInFloatingMenu?: boolean
  showInBubbleMenu?: boolean
  isActive?: (editor: Editor) => boolean
  command: (context: EditorCommandContext) => void
}

const deleteRangeIfPresent = (editor: Editor, range?: Range) => {
  if (!range) {
    return editor.chain().focus()
  }

  return editor.chain().focus().deleteRange(range)
}

export const editorCommands: Array<EditorCommand> = [
  {
    id: "paragraph",
    title: "Text",
    description: "Just start typing with plain text.",
    searchTerms: ["p", "paragraph", "text"],
    icon: Text,
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
    title: "Heading 1",
    description: "Big section heading.",
    searchTerms: ["h1", "heading", "title"],
    icon: Heading1,
    group: "block",
    showInBubbleMenu: true,
    showInSlashMenu: true,
    showInFloatingMenu: true,
    isActive: (editor) => editor.isActive("heading", { level: 1 }),
    command: ({ editor, range }) => {
      deleteRangeIfPresent(editor, range).setNode("heading", { level: 1 }).run()
    },
  },
  {
    id: "heading-2",
    title: "Heading 2",
    description: "Medium section heading.",
    searchTerms: ["h2", "heading", "subtitle"],
    icon: Heading2,
    group: "block",
    showInBubbleMenu: true,
    showInSlashMenu: true,
    showInFloatingMenu: true,
    isActive: (editor) => editor.isActive("heading", { level: 2 }),
    command: ({ editor, range }) => {
      deleteRangeIfPresent(editor, range).setNode("heading", { level: 2 }).run()
    },
  },
  {
    id: "heading-3",
    title: "Heading 3",
    description: "Small section heading.",
    searchTerms: ["h3", "heading", "subheading"],
    icon: Heading3,
    group: "block",
    showInBubbleMenu: true,
    showInSlashMenu: true,
    showInFloatingMenu: true,
    isActive: (editor) => editor.isActive("heading", { level: 3 }),
    command: ({ editor, range }) => {
      deleteRangeIfPresent(editor, range).setNode("heading", { level: 3 }).run()
    },
  },
  {
    id: "bullet-list",
    title: "Bullet List",
    description: "Create a simple bullet list.",
    searchTerms: ["ul", "unordered", "bullet", "list"],
    icon: List,
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
    title: "Ordered List",
    description: "Create a numbered list.",
    searchTerms: ["ol", "ordered", "numbered", "list"],
    icon: ListOrdered,
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
    title: "Quote",
    description: "Capture a quote or callout.",
    searchTerms: ["blockquote", "quote", "callout"],
    icon: Quote,
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
    title: "Details",
    description: "Create a collapsible details block.",
    searchTerms: ["details", "summary", "toggle", "collapse", "accordion"],
    icon: ChevronRight,
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
    title: "Task List",
    description: "Track todos with checkboxes.",
    searchTerms: ["task", "todo", "checkbox", "checklist", "list"],
    icon: List,
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
    title: "Table",
    description: "Create a table with rows and columns.",
    searchTerms: ["table", "grid", "rows", "columns", "cells"],
    icon: Text,
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
    title: "Divider",
    description: "Separate sections with a horizontal rule.",
    searchTerms: ["horizontal rule", "hr", "divider", "separator", "line"],
    icon: Text,
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
    title: "Line Break",
    description: "Insert a hard line break.",
    searchTerms: ["hard break", "line break", "br", "newline"],
    icon: Text,
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
    title: "Inline Math",
    description: "Insert an inline LaTeX formula.",
    searchTerms: ["math", "mathematics", "latex", "formula", "inline"],
    icon: Variable,
    group: "block",
    showInBubbleMenu: true,
    showInSlashMenu: true,
    showInFloatingMenu: true,
    command: ({ editor, range }) => {
      const latex = window.prompt("Enter inline LaTeX", "x^2")
      if (!latex) {
        return
      }

      deleteRangeIfPresent(editor, range).insertInlineMath({ latex }).run()
    },
  },
  {
    id: "block-math",
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
    icon: SquarePi,
    group: "block",
    showInBubbleMenu: true,
    showInSlashMenu: true,
    showInFloatingMenu: true,
    command: ({ editor, range }) => {
      const latex = window.prompt("Enter display LaTeX", "\\frac{a}{b}")
      if (!latex) {
        return
      }

      deleteRangeIfPresent(editor, range).insertBlockMath({ latex }).run()
    },
  },
  {
    id: "bold",
    title: "Bold",
    description: "Make selected text bold.",
    searchTerms: ["bold", "strong", "b"],
    icon: Bold,
    group: "mark",
    showInBubbleMenu: true,
    isActive: (editor) => editor.isActive("bold"),
    command: ({ editor }) => {
      editor.chain().focus().toggleBold().run()
    },
  },
  {
    id: "italic",
    title: "Italic",
    description: "Make selected text italic.",
    searchTerms: ["italic", "emphasis", "i"],
    icon: Italic,
    group: "mark",
    showInBubbleMenu: true,
    isActive: (editor) => editor.isActive("italic"),
    command: ({ editor }) => {
      editor.chain().focus().toggleItalic().run()
    },
  },
  {
    id: "code",
    title: "Code",
    description: "Format selected text as inline code.",
    searchTerms: ["code", "inline code", "monospace"],
    icon: CodeXml,
    group: "mark",
    showInBubbleMenu: true,
    isActive: (editor) => editor.isActive("code"),
    command: ({ editor }) => {
      editor.chain().focus().toggleCode().run()
    },
  },
]

export const slashMenuCommands = editorCommands.filter(
  (command) => command.showInSlashMenu
)

export const floatingMenuCommands = editorCommands.filter(
  (command) => command.showInFloatingMenu
)

export const bubbleMenuCommands = editorCommands.filter(
  (command) => command.showInBubbleMenu
)

export const getFilteredSlashCommands = (query: string) => {
  const normalizedQuery = query.toLowerCase()

  return slashMenuCommands
    .filter(
      (command) =>
        command.title.toLowerCase().includes(normalizedQuery) ||
        command.searchTerms.some((term) =>
          term.toLowerCase().includes(normalizedQuery)
        )
    )
    .slice(0, 20)
}
