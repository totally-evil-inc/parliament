import type { AnyExtension, JSONContent, Range } from "@tiptap/core"
import type { Editor } from "@tiptap/react"
import type { DocumentTemplate } from "@workspace/document/presentation"
import type { ReactNode } from "react"
import type { EditorCommand } from "../commands/types"

export type { DocumentTemplate } from "@workspace/document/presentation"

export type DocumentType = "proposal" | "invoice" | "receipt"
export type DocumentEditorPreset = "business"

export type DocumentInsertPolicy = {
  beforeNodeType?: string
}

export type DocumentHeaderLayoutId =
  | "mark-left-dates-right"
  | "centered-stack"
  | "left-stack"
  | "editorial-band"

export type DocumentLayoutPreset = {
  id: string
  name: string
  description: string
  attrs?: JSONContent["attrs"]
  content?: JSONContent["content"]
  preview: ReactNode
}

export type CustomizePreset = {
  id: string
  name: string
  description?: string
  preview?: ReactNode
  attrs?: Record<string, unknown>
}

export type CustomizeGroup = {
  id: string
  label: string
  description?: string
  icon: EditorCommand["icon"]
  presets: Array<CustomizePreset>
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
  icon?: EditorCommand["icon"]
  blockId?: string
  command?: (editor: Editor) => void
  togglesSidebar?: boolean
  hostAction?: boolean
  variant?: "default" | "ghost" | "outline" | "secondary"
}

export type DocumentDefinition = {
  type: DocumentType
  title: string
  initialContent: JSONContent
  placeholder: string
  defaultTemplate?: DocumentTemplate
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
  template?: DocumentTemplate
}

export type InsertDocumentBlockOptions = {
  editor: Editor
  block: JSONContent
  range?: Range
  beforeNodeType?: string
  spacer?: JSONContent
}
