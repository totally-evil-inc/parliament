import { Button } from "@workspace/ui/components/button"
import { IconRefresh, IconTriangleWarning } from "nucleo-glass"
import type React from "react"

export interface MessageErrorCardProps {
  error?:
    | {
        code?: string
        message?: string
      }
    | string
  onRetry?: () => void
}

export const MessageErrorCard: React.FC<MessageErrorCardProps> = ({
  error,
  onRetry,
}) => {
  if (!error) return null

  const code =
    typeof error === "string" ? "stream_error" : error.code || "unknown_error"
  const message =
    typeof error === "string"
      ? error
      : error.message ||
        "An unexpected error occurred while communicating with the agent."

  return (
    <div className="my-3 flex flex-col space-y-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-destructive text-xs shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <IconTriangleWarning className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="space-y-0.5">
            <h4 className="font-semibold text-destructive-foreground text-xs tracking-tight">
              Agent Request Failed ({code})
            </h4>
            <p className="text-[11px] text-destructive-foreground/90 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="flex h-7 shrink-0 items-center gap-1.5 border-destructive/40 px-2.5 font-medium text-[11px] text-destructive-foreground hover:bg-destructive/20"
          >
            <IconRefresh className="size-3 shrink-0" />
            <span>Retry</span>
          </Button>
        )}
      </div>
    </div>
  )
}
