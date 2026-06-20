import type { AnyExtension, JSONContent, Range } from "@tiptap/core"
import type { Editor } from "@tiptap/react"
import type { CSSProperties, ReactNode } from "react"
import type { EditorCommand } from "@/lib/editor/commands"

export type DocumentType = "proposal" | "invoice" | "receipt"
export type DocumentEditorPreset = "business"

export type DocumentInsertPolicy = {
  beforeNodeType?: string
}

export type DocumentFontToken = "sans" | "serif" | "mono"

export type DocumentTemplateTokens = {
  canvasBackground: string
  pageBackground: string
  foreground: string
  mutedForeground: string
  accent: string
  border: string
  fontFamily: DocumentFontToken
  headingFontFamily: DocumentFontToken
  radius: string
  spacingScale: "compact" | "comfortable" | "spacious"
}

export type DocumentTemplate = {
  id: string
  name: string
  tokens: DocumentTemplateTokens
}

export type DocumentTemplateStyle = CSSProperties & {
  "--document-canvas-background": string
  "--document-page-background": string
  "--document-foreground": string
  "--document-muted-foreground": string
  "--document-accent": string
  "--document-border": string
  "--document-radius": string
  "--document-font-family": string
  "--document-heading-font-family": string
  "--document-section-spacing": string
  "--background": string
  "--foreground": string
  "--muted-foreground": string
  "--primary": string
  "--border": string
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
