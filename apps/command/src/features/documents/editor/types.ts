import type { AnyExtension, JSONContent, Range } from "@tiptap/core"
import type { Editor } from "@tiptap/react"
import type { ReactNode } from "react"
import type { EditorCommand } from "@/lib/editor/commands"

export type DocumentType = "proposal" | "invoice" | "receipt"

export type DocumentInsertPolicy = {
  beforeNodeType?: string
}

export type DocumentLayoutPreset = {
  id: string
  name: string
  description: string
  attrs?: JSONContent["attrs"]
  content?: JSONContent["content"]
  preview: ReactNode
}

export type DocumentBlockDefinition = {
  id: string
  nodeType: string
  label: string
  description: string
  searchTerms: Array<string>
  icon: EditorCommand["icon"]
  extension?: AnyExtension
  defaultContent?: JSONContent
  preview?: ReactNode
  layouts?: Array<DocumentLayoutPreset>
  singleton?: boolean
  showInSlashMenu?: boolean
  showInFloatingMenu?: boolean
  showInSidebar?: boolean
}

export type DocumentToolbarAction = {
  id: string
  label: string
  icon: EditorCommand["icon"]
  blockId?: string
  command?: (editor: Editor) => void
  togglesSidebar?: boolean
}

export type DocumentDefinition = {
  type: DocumentType
  title: string
  initialContent: JSONContent
  placeholder: string
  insertPolicy?: DocumentInsertPolicy
  schemaExtensions?: Array<AnyExtension>
  blocks: Array<DocumentBlockDefinition>
  toolbarActions: Array<DocumentToolbarAction>
}

export type DocumentEditorConfig = {
  documentType: DocumentType
  content: JSONContent
  onContentChange?: (content: JSONContent) => void
  placeholder?: string
  extensions?: Array<AnyExtension>
  commands?: Array<EditorCommand>
  definition?: DocumentDefinition
}

export type InsertDocumentBlockOptions = {
  editor: Editor
  block: JSONContent
  range?: Range
  beforeNodeType?: string
  spacer?: JSONContent
}
