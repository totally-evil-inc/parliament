import * as React from "react"
import { createFileRoute } from "@tanstack/react-router"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { SidebarProvider } from "@workspace/ui/components/sidebar"
import type { JSONContent } from "@tiptap/core"
import type { DocumentTemplate } from "@/features/documents/editor/types"

import { DocumentBlockSidebar } from "@/features/documents/editor/document-block-sidebar"
import { DocumentEditor } from "@/features/documents/editor/document-editor"
import { createDocumentSnapshot } from "@/features/documents/editor/snapshot"
import { getDefaultDocumentTemplateForScheme } from "@/features/documents/editor/templates"
import { DocumentToolbar } from "@/features/documents/editor/document-toolbar"
import { useDocumentEditor } from "@/features/documents/editor/use-document-editor"
import { proposalDocumentDefinition } from "@/features/proposals/document-definition"
import { useTheme } from "@/components/theme-provider"
import { authClient } from "@/lib/auth-client"

export const Route = createFileRoute("/_workspace/proposals/")({
  component: RouteComponent,
})

function RouteComponent() {
  const { resolved } = useTheme()
  const session = authClient.useSession()
  const resolvedDefaultTemplate = React.useMemo(
    () => getDefaultDocumentTemplateForScheme(resolved),
    [resolved]
  )
  const [editorContent, setEditorContent] = React.useState<JSONContent>(
    proposalDocumentDefinition.initialContent
  )
  const [template, setTemplate] = React.useState<DocumentTemplate>(
    () => resolvedDefaultTemplate
  )
  const templateCustomizedRef = React.useRef(false)

  const editor = useDocumentEditor({
    documentId: proposalDocumentDefinition.type,
    content: editorContent,
    onContentChange: setEditorContent,
    definition: proposalDocumentDefinition,
  })

  React.useEffect(() => {
    if (templateCustomizedRef.current) return

    setTemplate(resolvedDefaultTemplate)
  }, [resolvedDefaultTemplate])

  const handleTemplateChange = React.useCallback(
    (nextTemplate: DocumentTemplate) => {
      setTemplate(nextTemplate)
      templateCustomizedRef.current = true
    },
    []
  )

  const handleTemplateReset = React.useCallback(() => {
    setTemplate(resolvedDefaultTemplate)
    templateCustomizedRef.current = false
  }, [resolvedDefaultTemplate])

  const definition = React.useMemo(
    () => ({
      ...proposalDocumentDefinition,
      toolbarActions: proposalDocumentDefinition.toolbarActions.map((action) =>
        action.id === "export"
          ? {
              ...action,
              command: () => {
                if (!editor) return

                const snapshot = createDocumentSnapshot({
                  content: editor.getJSON(),
                  definition: proposalDocumentDefinition,
                  documentId: "proposal-draft",
                  renderData: {
                    signerName: session.data?.user.name ?? "",
                    signerTitle: "Signature",
                  },
                  template,
                })
                const snapshotKey = `document-snapshot:${snapshot.documentId}:${snapshot.createdAt}`

                window.sessionStorage.setItem(
                  snapshotKey,
                  JSON.stringify(snapshot)
                )
                window.open(
                  `/documents/print?snapshotKey=${encodeURIComponent(snapshotKey)}`,
                  "_blank",
                  "noopener,noreferrer"
                )
              },
            }
          : action
      ),
    }),
    [editor, session.data?.user.name, template]
  )

  return (
    <div className="flex h-[calc(100svh-3rem)] min-h-0 w-full flex-col overflow-hidden bg-muted/30">
      <SidebarProvider
        defaultOpen={true}
        className="h-full min-h-0 overflow-hidden"
        style={{ "--sidebar-width": "22rem" } as React.CSSProperties}
      >
        <div
          className="relative flex min-h-0 flex-1 overflow-hidden"
          style={{
            backgroundColor: template.tokens.canvasBackground,
          }}
          data-document-template={template.id}
        >
          <ScrollArea className="relative min-h-0 flex-1">
            <DocumentEditor
              editor={editor}
              onContentChange={setEditorContent}
              template={template}
            />
            <DocumentToolbar editor={editor} definition={definition} />
          </ScrollArea>

          <DocumentBlockSidebar
            editor={editor}
            definition={proposalDocumentDefinition}
            defaultTemplate={resolvedDefaultTemplate}
            template={template}
            onTemplateChange={handleTemplateChange}
            onTemplateReset={handleTemplateReset}
          />
        </div>
      </SidebarProvider>
    </div>
  )
}
