import { createFileRoute } from "@tanstack/react-router"
import { resolveDocumentTemplate } from "@workspace/document/presentation"
import { createProposalDraft } from "@workspace/document/proposal"
import { buildProposalRenderModel } from "@workspace/document/render"
import { safeParseProposalDraft } from "@workspace/document/schema"
import * as React from "react"

import { ProposalPrintView } from "@/features/documents/print/proposal-print-view"

export const Route = createFileRoute("/documents/print")({
  component: PrintRoute,
})

function PrintRoute() {
  const [result, setResult] = React.useState<ReturnType<
    typeof readDraft
  > | null>(null)

  React.useEffect(() => setResult(readDraft()), [])
  React.useEffect(() => {
    if (!result?.success) return
    document.documentElement.classList.add("document-print-root")
    return () =>
      document.documentElement.classList.remove("document-print-root")
  }, [result])

  if (!result) return null
  if (!result.success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 text-destructive text-sm">
        {result.error}
      </div>
    )
  }

  return (
    <ProposalPrintView
      model={buildProposalRenderModel(result.document)}
      template={resolveDocumentTemplate(result.document.template)}
    />
  )
}

function readDraft():
  | { success: true; document: ReturnType<typeof createProposalDraft> }
  | { success: false; error: string } {
  if (typeof window === "undefined") {
    return {
      success: true,
      document: createProposalDraft({ id: "proposal-print-preview" }),
    }
  }
  const key = new URLSearchParams(window.location.search).get("draftKey")
  if (!key) return { success: false, error: "No proposal draft was provided." }
  const raw = window.sessionStorage.getItem(key)
  if (!raw)
    return {
      success: false,
      error: "The proposal draft is unavailable or expired.",
    }
  try {
    const parsed = safeParseProposalDraft(JSON.parse(raw))
    return parsed.success
      ? { success: true, document: parsed.data }
      : {
          success: false,
          error:
            "The proposal draft is invalid or uses an unsupported version.",
        }
  } catch {
    return { success: false, error: "The proposal draft could not be decoded." }
  }
}
