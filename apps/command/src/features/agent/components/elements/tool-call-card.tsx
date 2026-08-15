import {
  ArrowTopRightOnSquareIcon,
  ClockIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline"
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
  type ToolState,
} from "@workspace/ui/components/tool"
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
  state?: ToolState
  errorText?: string
}

export interface ToolCallCardProps {
  toolCalls?: ToolCallItem[]
  onApproveTool?: (toolCallId: string, args: Record<string, unknown>) => void
  onRejectTool?: (toolCallId: string) => void
}

function mapToToolState(item: ToolCallItem): ToolState {
  if (item.state) return item.state
  if (
    item.needsApproval &&
    item.status !== "approved" &&
    item.status !== "rejected"
  ) {
    return "approval-requested"
  }
  if (item.status === "approved") return "approval-responded"
  if (item.status === "rejected") return "output-denied"
  if (item.status === "running") return "input-available"
  if (item.status === "error" || item.errorText) return "output-error"
  if (item.status === "completed" || item.result !== undefined)
    return "output-available"
  return "output-available"
}

function toolDisplayName(value: string): string {
  const names: Record<string, string> = {
    list_deals: "Reviewing deals",
    get_deal: "Opening deal details",
    create_deal: "Creating deal",
    update_deal_stage: "Updating deal stage",
    list_customers: "Reviewing customers",
    get_customer: "Opening customer details",
    create_customer: "Creating customer",
    update_customer: "Updating customer",
    create_proposal: "Drafting proposal",
    create_invoice: "Drafting invoice",
    get_proposal: "Inspecting proposal",
    get_invoice: "Inspecting invoice",
    update_proposal: "Updating proposal",
    update_invoice: "Updating invoice",
    send_proposal: "Sending proposal",
    send_invoice: "Sending invoice",
    schedule_document_send: "Scheduling document send",
    list_scheduled_dispatches: "Checking scheduled dispatches",
    cancel_scheduled_dispatch: "Canceling scheduled send",
    send_email: "Preparing email",
    gmail_send_email: "Dispatching Gmail email",
    gmail_create_draft: "Creating Gmail draft",
    gcal_list_events: "Checking Google Calendar",
    gcal_create_event: "Scheduling Google Calendar event",
    gcal_cancel_event: "Canceling Google Calendar event",
    schedule_event: "Checking calendar",
    ask_clarifying_questions: "Requesting clarification",
    askClarifyingQuestions: "Requesting clarification",
  }
  return names[value] ?? humanize(value)
}

function humanize(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/^./, (char) => char.toUpperCase())
}

function formatMinorUnits(amountMinor: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amountMinor / 100)
}

export const ToolCallCard: React.FC<ToolCallCardProps> = ({
  toolCalls,
  onApproveTool,
  onRejectTool,
}) => {
  if (!toolCalls || toolCalls.length === 0) return null

  return (
    <div className="my-2 flex flex-col space-y-2">
      {/* Tool execution cards */}
      <div className="flex flex-col gap-2">
        {toolCalls.map((tc) => {
          const toolState = mapToToolState(tc)
          const isRunning =
            toolState === "input-available" ||
            tc.status === "running" ||
            (tc.result === undefined && !tc.errorText && !tc.needsApproval)
          const isQuestionnaire =
            tc.name === "ask_clarifying_questions" ||
            tc.name === "askClarifyingQuestions" ||
            tc.name.toLowerCase().includes("clarifying_question")
          const hasArgs = tc.args && Object.keys(tc.args).length > 0
          const hasOutput = tc.result !== undefined || tc.errorText

          const shouldDefaultOpen =
            isRunning ||
            toolState === "approval-requested" ||
            toolState === "awaiting-approval" ||
            Boolean(
              tc.needsApproval &&
                tc.status !== "approved" &&
                tc.status !== "rejected"
            )

          const res =
            tc.result && typeof tc.result === "object"
              ? (tc.result as Record<string, any>)
              : null

          const isDocumentDraftResult =
            res &&
            (tc.name === "create_proposal" ||
              tc.name === "create_invoice" ||
              tc.name === "update_proposal" ||
              tc.name === "update_invoice" ||
              tc.name === "get_proposal" ||
              tc.name === "get_invoice") &&
            !res.error

          const isScheduleResult =
            res && tc.name === "schedule_document_send" && !res.error

          return (
            <div key={tc.id} className="w-full">
              <Tool defaultOpen={shouldDefaultOpen}>
                <ToolHeader
                  type={tc.name}
                  state={toolState}
                  title={toolDisplayName(tc.name)}
                />
                {!isQuestionnaire && (hasArgs || hasOutput || isRunning) && (
                  <ToolContent>
                    {/* Live Execution Indicator when tool is in-flight */}
                    {isRunning && !hasOutput && (
                      <div className="my-1.5 flex items-center gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                        </span>
                        <div className="flex items-center gap-1.5 font-medium text-foreground text-xs">
                          <span>Processing</span>
                          <span className="font-semibold text-primary">
                            {toolDisplayName(tc.name)}
                          </span>
                          <span>…</span>
                        </div>
                      </div>
                    )}

                    {hasArgs && <ToolInput input={tc.args} />}

                    {/* Rich Action Banner for Document Drafts */}
                    {isDocumentDraftResult && (
                      <div className="my-2.5 flex flex-col gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <DocumentTextIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-medium text-foreground text-xs">
                              {res.title || "Document Draft"}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              {res.totalMinorUnits !== undefined && (
                                <span>
                                  {formatMinorUnits(
                                    res.totalMinorUnits,
                                    res.currency
                                  )}
                                </span>
                              )}
                              {res.totalMinor !== undefined && (
                                <span>
                                  {formatMinorUnits(
                                    res.totalMinor,
                                    res.currency
                                  )}
                                </span>
                              )}
                              {res.customerName && (
                                <span>• {res.customerName}</span>
                              )}
                              {res.revision !== undefined && (
                                <span className="rounded bg-muted px-1 py-0.5 text-[10px]">
                                  v{res.revision}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {res.id && (
                          <div className="shrink-0 pt-1 sm:pt-0">
                            <a
                              href={
                                tc.name.includes("invoice")
                                  ? `/invoices/${res.id}`
                                  : `/proposals/${res.id}`
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 font-medium text-primary-foreground text-xs transition-colors hover:bg-primary/90"
                            >
                              <span>Open in Editor</span>
                              <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Rich Action Banner for Scheduled Dispatches */}
                    {isScheduleResult && (
                      <div className="my-2.5 flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <ClockIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-foreground">
                            Dispatch Scheduled
                          </div>
                          <div className="text-muted-foreground text-[11px]">
                            Will send to {res.recipientEmail} at{" "}
                            {new Date(res.scheduledFor).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    )}

                    {hasOutput && (
                      <ToolOutput output={tc.result} errorText={tc.errorText} />
                    )}
                  </ToolContent>
                )}
              </Tool>

              {/* Interactive Questionnaires */}
              {isQuestionnaire && (
                <div className="mt-2">
                  <QuestionnaireCard
                    toolCallId={tc.id}
                    args={
                      (tc.args || {}) as Parameters<
                        typeof QuestionnaireCard
                      >[0]["args"]
                    }
                  />
                </div>
              )}

              {/* Approval Cards for Write Tools */}
              {tc.needsApproval &&
                tc.status !== "approved" &&
                tc.status !== "rejected" && (
                  <div className="mt-2">
                    <ApprovalCard
                      toolName={toolDisplayName(tc.name)}
                      args={tc.args || {}}
                      onApprove={() =>
                        onApproveTool?.(tc.approvalId || tc.id, tc.args || {})
                      }
                      onReject={() => onRejectTool?.(tc.approvalId || tc.id)}
                    />
                  </div>
                )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
