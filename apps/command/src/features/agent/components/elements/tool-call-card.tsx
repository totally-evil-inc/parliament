import type React from "react"
import { ApprovalCard } from "../approval-card"
import { QuestionnaireCard } from "../questionnaire-card"

export interface ToolCallItem {
  id: string
  name: string
  args?: Record<string, unknown>
  result?: unknown
  status?: string
  needsApproval?: boolean
  approvalId?: string
}

export interface ToolCallCardProps {
  toolCalls?: ToolCallItem[]
  onApproveTool?: (toolCallId: string, args: Record<string, unknown>) => void
  onRejectTool?: (toolCallId: string) => void
}

function formatToolArguments(args: Record<string, unknown>): string {
  const entries = Object.entries(args).filter(
    ([, value]) => value !== undefined
  )
  if (entries.length === 0) return "Working with the requested information"
  return entries
    .slice(0, 3)
    .map(([key, value]) => `${humanize(key)}: ${formatValue(value)}`)
    .join(" · ")
}

function formatToolResult(result: unknown): string {
  if (typeof result === "string") return result
  if (result === null || result === undefined) return "Completed"
  if (Array.isArray(result))
    return `${result.length} result${result.length === 1 ? "" : "s"} found`
  if (typeof result === "object") {
    const record = result as Record<string, unknown>
    const count = record.count ?? record.total ?? record.totalCount
    if (typeof count === "number")
      return `${count} result${count === 1 ? "" : "s"} found`
    return "Information retrieved"
  }
  return String(result)
}

function toolDisplayName(value: string): string {
  const names: Record<string, string> = {
    list_deals: "Reviewing deals",
    get_deal: "Opening deal details",
    list_customers: "Reviewing customers",
    get_customer: "Opening customer details",
    create_proposal: "Preparing proposal",
    send_email: "Preparing email",
    schedule_event: "Checking calendar",
    ask_clarifying_questions: "Requesting clarification",
  }
  return names[value] ?? humanize(value)
}

function humanize(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/^./, (char) => char.toUpperCase())
}

function formatValue(value: unknown): string {
  if (typeof value === "string")
    return value.length > 100 ? `${value.slice(0, 97)}…` : value
  if (typeof value === "number" || typeof value === "boolean")
    return String(value)
  if (Array.isArray(value)) return `${value.length} selected`
  return "provided"
}

export const ToolCallCard: React.FC<ToolCallCardProps> = ({
  toolCalls,
  onApproveTool,
  onRejectTool,
}) => {
  if (!toolCalls || toolCalls.length === 0) return null

  return (
    <div className="my-2 flex flex-col space-y-2">
      {/* Tool execution timeline */}
      <div className="flex flex-col gap-1.5">
        {toolCalls.map((tc) => {
          const isRunning = tc.status === "running"
          const isError = tc.status === "error"
          const isQuestionnaire =
            tc.name === "ask_clarifying_questions" ||
            tc.name === "askClarifyingQuestions" ||
            tc.name.toLowerCase().includes("clarifying_question")
          return (
            <div
              key={tc.id}
              className="rounded-md border border-border bg-card px-2.5 py-2 text-[11px] shadow-2xs"
            >
              <div className="flex items-center gap-1.5 font-mono text-muted-foreground">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isRunning
                      ? "animate-pulse bg-amber-500"
                      : isError
                        ? "bg-destructive"
                        : "bg-emerald-500"
                  }`}
                />
                <span>{toolDisplayName(tc.name)}</span>
                <span className="ml-auto font-sans text-[10px]">
                  {isRunning ? "running" : isError ? "failed" : "complete"}
                </span>
              </div>
              {!isQuestionnaire &&
                tc.args &&
                Object.keys(tc.args).length > 0 && (
                  <p className="mt-1 text-[11px] text-muted-foreground/80">
                    {formatToolArguments(tc.args)}
                  </p>
                )}
              {!isQuestionnaire && tc.result !== undefined && (
                <div className="mt-1 border-border/60 border-t pt-1 text-foreground/80">
                  {formatToolResult(tc.result)}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Interactive Questionnaires */}
      {toolCalls.map(
        (tc) =>
          (tc.name === "ask_clarifying_questions" ||
            tc.name === "askClarifyingQuestions" ||
            tc.name.toLowerCase().includes("clarifying_question")) && (
            <QuestionnaireCard
              key={tc.id}
              toolCallId={tc.id}
              args={(tc.args || {}) as any}
            />
          )
      )}

      {/* Approval Cards for Write Tools */}
      {toolCalls.map(
        (tc) =>
          tc.needsApproval &&
          tc.status !== "approved" &&
          tc.status !== "rejected" && (
            <ApprovalCard
              key={tc.id}
              toolName={tc.name}
              args={tc.args || {}}
              onApprove={() =>
                onApproveTool?.(tc.approvalId || tc.id, tc.args || {})
              }
              onReject={() => onRejectTool?.(tc.approvalId || tc.id)}
            />
          )
      )}
    </div>
  )
}
