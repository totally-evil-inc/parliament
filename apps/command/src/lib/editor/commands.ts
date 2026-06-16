import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Quote,
  Text,
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
      deleteRangeIfPresent(editor, range)
        .setNode("heading", { level: 1 })
        .run()
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
      deleteRangeIfPresent(editor, range)
        .setNode("heading", { level: 2 })
        .run()
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
      deleteRangeIfPresent(editor, range)
        .setNode("heading", { level: 3 })
        .run()
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
    icon: Code,
    group: "mark",
    showInBubbleMenu: true,
    isActive: (editor) => editor.isActive("code"),
    command: ({ editor }) => {
      editor.chain().focus().toggleCode().run()
    },
  },
]

export const slashMenuCommands = editorCommands.filter(
  (command) => command.showInSlashMenu,
)

export const floatingMenuCommands = editorCommands.filter(
  (command) => command.showInFloatingMenu,
)

export const bubbleMenuCommands = editorCommands.filter(
  (command) => command.showInBubbleMenu,
)

export const getFilteredSlashCommands = (query: string) => {
  const normalizedQuery = query.toLowerCase()

  return slashMenuCommands
    .filter(
      (command) =>
        command.title.toLowerCase().includes(normalizedQuery) ||
        command.searchTerms.some((term) =>
          term.toLowerCase().includes(normalizedQuery),
        ),
    )
    .slice(0, 10)
}
