import * as React from "react"
import { createFileRoute } from "@tanstack/react-router"
import { DocumentPrintView } from "@/features/documents/print/document-print-view"
import { createDocumentSnapshot } from "@/features/documents/editor/snapshot"
import { proposalDocumentDefinition } from "@/features/proposals/document-definition"
import type { DocumentSnapshot } from "@/features/documents/editor/types"

declare global {
  interface Window {
    __DOCUMENT_SNAPSHOT__?: DocumentSnapshot
  }
}

export const Route = createFileRoute("/documents/print")({
  component: PrintRoute,
})

function PrintRoute() {
  const [snapshot, setSnapshot] = React.useState<DocumentSnapshot | null>(null)

  React.useEffect(() => {
    setSnapshot(readSnapshot())
  }, [])

  React.useEffect(() => {
    if (!snapshot) return

    document.documentElement.classList.add("document-print-root")
    return () => {
      document.documentElement.classList.remove("document-print-root")
    }
  }, [snapshot])

  if (!snapshot) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8 text-sm text-muted-foreground">
        No document snapshot found.
      </div>
    )
  }

  return <DocumentPrintView snapshot={snapshot} />
}

function readSnapshot(): DocumentSnapshot {
  if (typeof window === "undefined") {
    return createFallbackSnapshot()
  }

  if (window.__DOCUMENT_SNAPSHOT__) return window.__DOCUMENT_SNAPSHOT__

  const params = new URLSearchParams(window.location.search)
  const snapshotParam = params.get("snapshot")
  const snapshotKey = params.get("snapshotKey")

  if (snapshotParam) {
    const parsed = parseSnapshot(snapshotParam)
    if (parsed) return parsed
  }

  if (snapshotKey) {
    const stored =
      window.sessionStorage.getItem(snapshotKey) ??
      window.localStorage.getItem(snapshotKey)
    const parsed = stored ? parseSnapshot(stored) : null
    if (parsed) return parsed
  }

  const windowNameSnapshot = window.name ? parseSnapshot(window.name) : null
  if (windowNameSnapshot) return windowNameSnapshot

  return createFallbackSnapshot()
}

function parseSnapshot(value: string): DocumentSnapshot | null {
  try {
    const decoded = value.trim().startsWith("{")
      ? value
      : new TextDecoder().decode(
          Uint8Array.from(atob(decodeURIComponent(value)), (char) =>
            char.charCodeAt(0)
          )
        )

    return JSON.parse(decoded) as DocumentSnapshot
  } catch {
    return null
  }
}

function createFallbackSnapshot() {
  return createDocumentSnapshot({
    content: proposalDocumentDefinition.initialContent,
    definition: proposalDocumentDefinition,
    documentId: "proposal-print-preview",
    renderData: {
      signerName: "Signer name",
      signerTitle: "Signature",
    },
    template: proposalDocumentDefinition.defaultTemplate,
  })
}
