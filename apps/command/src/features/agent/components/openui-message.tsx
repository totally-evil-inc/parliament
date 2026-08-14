import { Renderer } from "@openuidev/react-lang"
import type React from "react"
import { useState } from "react"
import { library } from "../openui/library"
import { extractOpenUI } from "../openui/parser"

interface OpenUIMessageProps {
  content: string
  isStreaming?: boolean
}

export const OpenUIMessage: React.FC<OpenUIMessageProps> = ({
  content,
  isStreaming = false,
}) => {
  const [parseError, setParseError] = useState(false)
  if (!content) return null

  const isFenced = content.toLowerCase().includes("```openui")
  const parsed = isFenced
    ? extractOpenUI(content)
    : {
        prose: "",
        program: content,
        hasOpenUI: true,
        isComplete: !isStreaming,
      }

  if (isFenced && !parsed.hasOpenUI && !isStreaming) return null
  if (!parsed.program) return null

  const RendererComp = Renderer as any

  return (
    <div className="my-2 w-full overflow-hidden rounded-xl border border-border bg-card p-3 shadow-xs">
      <RendererComp
        library={library}
        response={parsed.program}
        isStreaming={isStreaming || !parsed.isComplete}
        onParseResult={(result: { success?: boolean; error?: unknown }) => {
          setParseError(result?.success === false)
        }}
      />
      {parseError && (
        <p className="mt-2 text-destructive text-xs">
          This result could not be displayed. Try again.
        </p>
      )}
    </div>
  )
}
