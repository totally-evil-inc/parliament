import * as React from "react"
import { createFileRoute } from "@tanstack/react-router"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { SidebarProvider } from "@workspace/ui/components/sidebar"
import type { JSONContent } from "@tiptap/core"

import { DocumentBlockSidebar } from "@/features/documents/editor/document-block-sidebar"
import { DocumentEditor } from "@/features/documents/editor/document-editor"
import { DocumentToolbar } from "@/features/documents/editor/document-toolbar"
import { useDocumentEditor } from "@/features/documents/editor/use-document-editor"
import { proposalDocumentDefinition } from "@/features/proposals/document-definition"

export const Route = createFileRoute("/_workspace/proposals/")({
  component: RouteComponent,
})

function RouteComponent() {
  const [editorContent, setEditorContent] = React.useState<JSONContent>(
    proposalDocumentDefinition.initialContent
  )

  const editor = useDocumentEditor({
    documentId: proposalDocumentDefinition.type,
    content: editorContent,
    onContentChange: setEditorContent,
    definition: proposalDocumentDefinition,
  })

  return (
    <div className="flex h-[calc(100svh-3rem)] min-h-0 w-full flex-col overflow-hidden bg-muted/30">
      <SidebarProvider
        defaultOpen={true}
        className="h-full min-h-0 overflow-hidden"
        style={{ "--sidebar-width": "22rem" } as React.CSSProperties}
      >
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          <ScrollArea className="relative min-h-0 flex-1">
            <DocumentEditor
              editor={editor}
              onContentChange={setEditorContent}
            />
            <DocumentToolbar
              editor={editor}
              definition={proposalDocumentDefinition}
            />
          </ScrollArea>

          <DocumentBlockSidebar
            editor={editor}
            definition={proposalDocumentDefinition}
          />
        </div>
      </SidebarProvider>
    </div>
  )
}
