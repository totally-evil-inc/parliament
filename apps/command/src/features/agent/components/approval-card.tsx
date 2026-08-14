import { Button } from "@workspace/ui/components/button"
import type React from "react"

interface ApprovalCardProps {
  toolName: string
  args: Record<string, unknown>
  onApprove: () => void
  onReject: () => void
  isPending?: boolean
}

export const ApprovalCard: React.FC<ApprovalCardProps> = ({
  toolName,
  args,
  onApprove,
  onReject,
  isPending,
}) => {
  return (
    <div className="my-3 space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded bg-amber-500/20 px-2 py-0.5 font-bold text-[10px] text-amber-600 uppercase dark:text-amber-400">
            Approval Required
          </span>
          <span className="font-semibold text-foreground text-xs">
            {toolName}
          </span>
        </div>
        <span className="font-medium text-[11px] text-muted-foreground">
          Human in the loop
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-background/80 p-2.5 font-mono text-xs">
        <pre className="whitespace-pre-wrap text-[11px] text-foreground/90">
          {JSON.stringify(args, null, 2)}
        </pre>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onReject}
          disabled={isPending}
          className="h-8 px-3 text-xs"
        >
          Reject
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={onApprove}
          disabled={isPending}
          className="h-8 bg-amber-600 px-4 text-white text-xs hover:bg-amber-700"
        >
          Approve Action
        </Button>
      </div>
    </div>
  )
}
