import * as React from "react"
import { createFileRoute } from "@tanstack/react-router"
import { buildProposalRenderModel } from "@workspace/document/render"
import { createProposalDraft } from "@workspace/document/proposal"
import { safeParseProposalDraft } from "@workspace/document/schema"
import {
  defaultDocumentTemplate,
  webStudioProposalTemplate,
} from "@workspace/document/presentation"

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
      <div className="flex min-h-screen items-center justify-center p-8 text-sm text-destructive">
        {result.error}
      </div>
    )
  }

  return (
    <ProposalPrintView
      model={buildProposalRenderModel(result.document)}
      template={getTemplate(result.document.template)}
    />
  )
}

function getTemplate(
  reference: ReturnType<typeof createProposalDraft>["template"]
) {
  const baseTemplate =
    reference.id === webStudioProposalTemplate.id
      ? webStudioProposalTemplate
      : defaultDocumentTemplate
  const overrides = reference.overrides ?? {}
  const tokens = Object.fromEntries(
    Object.entries(overrides).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string"
    )
  )
  return {
    ...baseTemplate,
    id: reference.id,
    tokens: { ...baseTemplate.tokens, ...tokens },
  }
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
