import type { AnyExtension, JSONContent, Range } from "@tiptap/core"
import type { Editor } from "@tiptap/react"
import type { ReactNode } from "react"
import type { EditorCommand } from "@/lib/editor/commands"

export type DocumentType = "proposal" | "invoice" | "receipt"
export type DocumentEditorPreset = "business"

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

type DocumentBlockBase = {
  id: string
  label: string
  description: string
  searchTerms: Array<string>
  icon: EditorCommand["icon"]
  preview?: ReactNode
  showInSlashMenu?: boolean
  showInFloatingMenu?: boolean
  showInSidebar?: boolean
}

export type InsertableDocumentBlockDefinition = DocumentBlockBase & {
  kind: "insertable"
  nodeType?: string
  extension?: AnyExtension
  layouts?: Array<DocumentLayoutPreset>
  createContent: (layout?: DocumentLayoutPreset) => JSONContent
}

export type SingletonDocumentBlockDefinition = DocumentBlockBase & {
  kind: "singleton"
  nodeType: string
  layouts?: Array<DocumentLayoutPreset>
  createContent?: (layout?: DocumentLayoutPreset) => JSONContent
}

export type ActionDocumentBlockDefinition = DocumentBlockBase & {
  kind: "action"
  command: (editor: Editor) => void
}

export type DocumentBlockDefinition =
  | InsertableDocumentBlockDefinition
  | SingletonDocumentBlockDefinition
  | ActionDocumentBlockDefinition

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
  presets?: Array<DocumentEditorPreset>
  insertPolicy?: DocumentInsertPolicy
  schemaExtensions?: Array<AnyExtension>
  blocks: Array<DocumentBlockDefinition>
  toolbarActions: Array<DocumentToolbarAction>
}

export type DocumentEditorConfig = {
  documentId?: string
  content: JSONContent
  onContentChange?: (content: JSONContent) => void
  definition: DocumentDefinition
}

export type InsertDocumentBlockOptions = {
  editor: Editor
  block: JSONContent
  range?: Range
  beforeNodeType?: string
  spacer?: JSONContent
}
