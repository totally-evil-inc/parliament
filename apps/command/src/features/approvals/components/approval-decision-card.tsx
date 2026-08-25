import {
  CheckCircleIcon,
  ChevronDownIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { cn } from "@workspace/ui/lib/utils"
import type React from "react"
import { useId, useMemo, useState } from "react"
import {
  describeToolAction,
  formatDateTime,
  safeObject,
} from "../utils/action-descriptors"

export type ApprovalCardStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "error"

export interface ApprovalDecisionCardProps {
  approvalId?: string
  toolName: string
  args: Record<string, unknown> | unknown
  summary?: string
  status?: ApprovalCardStatus
  expiresAt?: string | Date
  createdAt?: string | Date
  confidenceScore?: number
  errorText?: string
  isPending?: boolean
  variant?: "inline" | "dashboard"
  defaultAuditOpen?: boolean
  onApprove?: (feedback?: string) => void | Promise<void>
  onReject?: (feedback?: string) => void | Promise<void>
  className?: string
}

export const ApprovalDecisionCard: React.FC<ApprovalDecisionCardProps> = ({
  approvalId,
  toolName,
  args: rawArgs,
  summary,
  status = "pending",
  expiresAt,
  confidenceScore,
  errorText,
  isPending = false,
  variant = "inline",
  defaultAuditOpen = false,
  onApprove,
  onReject,
  className,
}) => {
  const [isAuditOpen, setIsAuditOpen] = useState(defaultAuditOpen)
  const [feedback, setFeedback] = useState("")
  const [showFeedbackInput, setShowFeedbackInput] = useState(false)
  const auditId = useId()

  const safeArgs = useMemo(() => safeObject(rawArgs), [rawArgs])
  const descriptor = useMemo(
    () => describeToolAction(toolName, safeArgs, summary),
    [toolName, safeArgs, summary]
  )

  const isResolved =
    status === "approved" || status === "rejected" || status === "expired"

  const handleApprove = () => {
    if (isPending || isResolved) return
    onApprove?.(feedback.trim() || undefined)
  }

  const handleReject = () => {
    if (isPending || isResolved) return
    onReject?.(feedback.trim() || undefined)
  }

  // Resolved Compact State
  if (status === "approved") {
    return (
      <div
        className={cn(
          "my-2.5 flex items-center justify-between rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3.5 py-2.5 text-foreground text-xs",
          className
        )}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <CheckCircleIcon className="size-4" />
          </div>
          <div>
            <div className="font-semibold text-xs">
              {`${descriptor.displayTitle} Authorized`}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {descriptor.intentSummary}
            </div>
          </div>
        </div>
        <Badge
          variant="outline"
          className="border-emerald-500/30 bg-emerald-500/10 font-mono text-[10px] text-emerald-700 dark:text-emerald-300"
        >
          Approved
        </Badge>
      </div>
    )
  }

  if (status === "rejected") {
    return (
      <div
        className={cn(
          "my-2.5 flex items-center justify-between rounded-xl border border-border/80 bg-muted/30 px-3.5 py-2.5 text-muted-foreground text-xs",
          className
        )}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <XMarkIcon className="size-4" />
          </div>
          <div>
            <div className="font-medium text-foreground text-xs">
              {`${descriptor.displayTitle} Denied`}
            </div>
            <div className="text-[11px] text-muted-foreground">
              Action rejected by human reviewer.
            </div>
          </div>
        </div>
        <Badge
          variant="outline"
          className="border-border bg-muted font-mono text-[10px] text-muted-foreground"
        >
          Rejected
        </Badge>
      </div>
    )
  }

  if (status === "expired") {
    return (
      <div
        className={cn(
          "my-2.5 flex items-center justify-between rounded-xl border border-muted-foreground/20 bg-muted/20 px-3.5 py-2.5 text-muted-foreground text-xs",
          className
        )}
      >
        <div className="flex items-center gap-2.5">
          <ClockIcon className="size-4 shrink-0 text-muted-foreground" />
          <div>
            <div className="font-medium text-xs">
              {`${descriptor.displayTitle} Request Expired`}
            </div>
            <div className="text-[11px] text-muted-foreground">
              Authorization window closed before resolution.
            </div>
          </div>
        </div>
        <Badge
          variant="outline"
          className="border-border bg-muted/50 font-mono text-[10px] text-muted-foreground"
        >
          Expired
        </Badge>
      </div>
    )
  }

  return (
    <section
      aria-label={`Action Authorization Request: ${descriptor.displayTitle}`}
      className={cn(
        "my-3 flex flex-col rounded-2xl border transition-all",
        status === "error"
          ? "border-destructive/40 bg-destructive/5"
          : "border-amber-500/40 bg-amber-500/5 shadow-xs dark:border-amber-500/30",
        variant === "dashboard" ? "p-5" : "p-4",
        className
      )}
    >
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-border/40 border-b pb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-lg font-bold text-xs",
              descriptor.riskLevel === "high"
                ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                : "bg-primary/10 text-primary"
            )}
          >
            <ShieldExclamationIcon className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-foreground text-sm tracking-tight">
                {descriptor.displayTitle}
              </h4>
              <Badge
                variant="outline"
                className={cn(
                  "font-mono text-[10px] uppercase",
                  descriptor.riskLevel === "high"
                    ? "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                    : "border-border bg-muted/60 text-muted-foreground"
                )}
              >
                {descriptor.riskLevel === "high"
                  ? "High Risk"
                  : "Requires Authorization"}
              </Badge>
            </div>
            <span className="font-mono text-[11px] text-muted-foreground">
              {toolName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {confidenceScore !== undefined && (
            <Badge
              variant="outline"
              className="border-border bg-background/80 font-mono text-[10px] text-muted-foreground"
            >
              {`${(confidenceScore * 100).toFixed(0)}% Confidence`}
            </Badge>
          )}
          {expiresAt && (
            <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
              <ClockIcon className="size-3.5" />
              <span>Expires {formatDateTime(expiresAt)}</span>
            </span>
          )}
        </div>
      </div>

      {/* Rationale & Description */}
      <div className="space-y-2 py-3">
        <p className="font-medium text-foreground text-xs leading-relaxed">
          {descriptor.intentSummary}
        </p>
        <div className="flex items-start gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1.5 font-mono text-[11px] text-amber-800 dark:text-amber-200">
          <ExclamationTriangleIcon className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>{descriptor.authorizationReason}</span>
        </div>
      </div>

      {/* Structured Key Parameters */}
      {descriptor.keyParameters.length > 0 && (
        <div className="my-1 grid grid-cols-1 gap-2 rounded-xl border border-border/60 bg-background/80 p-3 sm:grid-cols-2">
          {descriptor.keyParameters.map((param) => (
            <div
              key={`${param.label}-${param.value}`}
              className="flex min-w-0 flex-col gap-0.5"
            >
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                {param.label}
              </span>
              <div className="truncate font-semibold text-foreground text-xs">
                {param.badge ? (
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] text-foreground"
                  >
                    {param.value}
                  </Badge>
                ) : (
                  <span
                    className={
                      param.highlight ? "font-bold text-primary" : undefined
                    }
                  >
                    {param.value}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error Message if mutation or tool failed */}
      {(errorText || status === "error") && (
        <div className="my-2 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-xs">
          <ExclamationCircleIcon className="size-4 shrink-0" />
          <span className="font-mono text-[11px]">
            {errorText || "Action authorization encountered an error."}
          </span>
        </div>
      )}

      {/* Expandable Technical Payload Disclosure */}
      <Collapsible
        open={isAuditOpen}
        onOpenChange={setIsAuditOpen}
        className="mt-2"
      >
        <CollapsibleTrigger
          aria-controls={auditId}
          className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-border/40 bg-muted/20 px-3 py-1.5 text-left font-mono text-[11px] text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
        >
          <span className="flex items-center gap-1.5">
            <span>Audit Payload & Raw Arguments</span>
            {approvalId && (
              <span className="text-[10px] text-muted-foreground/70">
                ({approvalId.slice(0, 8)}…)
              </span>
            )}
          </span>
          <ChevronDownIcon
            className={cn(
              "size-3.5 transition-transform duration-200",
              isAuditOpen && "rotate-180"
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent id={auditId} className="mt-1.5">
          <ScrollArea className="max-h-48 w-full rounded-lg border border-border/80 bg-background p-2.5 font-mono text-[11px]">
            <pre className="whitespace-pre-wrap text-foreground/90 leading-relaxed">
              {JSON.stringify(safeArgs, null, 2)}
            </pre>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>

      {/* Rejection Feedback Optional Input */}
      {showFeedbackInput && (
        <div className="mt-3 space-y-1.5 rounded-lg border border-border/60 bg-background/90 p-2.5">
          <label
            htmlFor={`feedback-${approvalId || toolName}`}
            className="block font-mono text-[11px] text-muted-foreground"
          >
            Rejection Feedback / Instructions for Agent (Optional):
          </label>
          <input
            id={`feedback-${approvalId || toolName}`}
            type="text"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="e.g. Please revise price discount to 10% first"
            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-foreground text-xs placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isPending}
          />
        </div>
      )}

      {/* Decision Action Buttons */}
      <div className="mt-3.5 flex flex-wrap items-center justify-end gap-2 border-border/40 border-t pt-3">
        {!showFeedbackInput && (
          <button
            type="button"
            onClick={() => setShowFeedbackInput(true)}
            className="mr-auto font-mono text-[11px] text-muted-foreground underline-offset-4 hover:underline"
          >
            + Add rejection note
          </button>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={handleReject}
          className="h-8 gap-1.5 border-border/80 px-3 text-xs hover:border-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <XMarkIcon className="size-3.5" />
          <span>{isPending ? "Processing…" : "Reject"}</span>
        </Button>

        <Button
          type="button"
          variant="default"
          size="sm"
          disabled={isPending}
          onClick={handleApprove}
          className="h-8 gap-1.5 bg-amber-600 px-4 font-semibold text-white text-xs shadow-xs hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500"
        >
          {isPending ? (
            <span className="flex items-center gap-1.5">
              <span className="size-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Authorizing…</span>
            </span>
          ) : (
            <>
              <CheckCircleIcon className="size-3.5" />
              <span>Approve Action</span>
            </>
          )}
        </Button>
      </div>
    </section>
  )
}
