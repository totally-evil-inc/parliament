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
import {
  type ApprovalCardStatus,
  ApprovalDecisionCard,
} from "../../../approvals/components/approval-decision-card"
import {
  formatCurrencyMinor,
  humanizeTitle,
} from "../../../approvals/utils/action-descriptors"
import { extractToolErrorText } from "../../normalization"
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
  expiresAt?: string | Date
  confidenceScore?: number
  retryOf?: string
  attempt?: number
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
  if (item.status === "rejected" || item.status === "denied")
    return "output-denied"
  if (item.status === "running") return "input-available"
  if (item.status === "suspended") return "output-available"
  if (item.status === "error" || item.errorText) return "output-error"
  if (item.status === "completed" || item.result !== undefined)
    return "output-available"
  return "output-available"
}

function toolDisplayName(value: string): string {
  const names: Record<string, string> = {
    get_current_user_name: "Checking user identity",
    list_deals: "Reviewing pipeline deals",
    get_deal: "Opening deal details",
    create_deal: "Creating deal record",
    update_deal_stage: "Updating deal stage",
    list_customers: "Reviewing customers list",
    get_customer: "Opening customer details",
    create_customer: "Creating customer profile",
    update_customer: "Updating customer profile",
    create_proposal: "Drafting commercial proposal",
    create_invoice: "Drafting billing invoice",
    get_proposal: "Inspecting proposal",
    get_invoice: "Inspecting invoice",
    update_proposal: "Updating proposal draft",
    update_invoice: "Updating invoice draft",
    send_proposal: "Sending proposal to client",
    send_invoice: "Sending invoice to client",
    schedule_document_send: "Scheduling document dispatch",
    list_scheduled_dispatches: "Checking scheduled dispatches",
    cancel_scheduled_dispatch: "Canceling scheduled send",
    send_email: "Preparing outbound email",
    gmail_send_email: "Dispatching Gmail message",
    gmail_create_draft: "Creating Gmail draft",
    gcal_list_events: "Checking Google Calendar",
    gcal_create_event: "Scheduling Google Calendar event",
    gcal_cancel_event: "Canceling Google Calendar event",
    schedule_event: "Checking schedule availability",
    ask_clarifying_questions: "Requesting clarification",
    askClarifyingQuestions: "Requesting clarification",
  }
  return names[value] ?? humanizeTitle(value)
}

function deriveApprovalStatus(item: ToolCallItem): ApprovalCardStatus {
  if (item.status === "approved") return "approved"
  if (item.status === "rejected" || item.status === "denied") return "rejected"
  if (item.status === "expired") return "expired"
  if (item.status === "error" || item.errorText) return "error"
  return "pending"
}

export const ToolCallCard: React.FC<ToolCallCardProps> = ({
  toolCalls,
  onApproveTool,
  onRejectTool,
}) => {
  if (!toolCalls || toolCalls.length === 0) return null

  return (
    <div className="my-1.5 flex flex-col space-y-2">
      <div className="flex flex-col gap-2">
        {toolCalls.map((tc) => {
          const hasObjError =
            tc.result !== undefined &&
            typeof tc.result === "object" &&
            tc.result !== null &&
            Boolean((tc.result as Record<string, unknown>).error)
          const toolState = mapToToolState(tc)
          const isError =
            toolState === "output-error" ||
            tc.status === "error" ||
            Boolean(tc.errorText) ||
            hasObjError
          const isRunning =
            (toolState === "input-available" || tc.status === "running") &&
            tc.status !== "completed" &&
            tc.status !== "suspended" &&
            tc.status !== "error" &&
            tc.status !== "rejected" &&
            tc.status !== "denied" &&
            tc.status !== "skipped" &&
            !tc.needsApproval &&
            !tc.errorText &&
            tc.result === undefined
          const isQuestionnaire =
            tc.name === "ask_clarifying_questions" ||
            tc.name === "askClarifyingQuestions" ||
            tc.name.toLowerCase().includes("clarifying_question")
          const hasArgs = tc.args && Object.keys(tc.args).length > 0
          const errorText = isError
            ? extractToolErrorText(tc.errorText ?? tc.result)
            : undefined
          const hasOutput = tc.result !== undefined || Boolean(errorText)

          const requiresApproval = Boolean(
            tc.needsApproval ||
              tc.approvalId ||
              tc.status === "pending_approval" ||
              tc.status === "awaiting-approval" ||
              tc.status === "approved" ||
              tc.status === "rejected"
          )

          const shouldDefaultOpen = Boolean(
            (tc.needsApproval &&
              tc.status !== "approved" &&
              tc.status !== "rejected") ||
              isError
          )

          const res =
            tc.result && typeof tc.result === "object"
              ? (tc.result as Record<string, unknown>)
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

          const draftTitle =
            typeof res?.title === "string" ? res.title : "Document Draft"
          const draftId = typeof res?.id === "string" ? res.id : undefined
          const draftTotalUnits =
            typeof res?.totalMinorUnits === "number"
              ? res.totalMinorUnits
              : undefined
          const draftTotalMinor =
            typeof res?.totalMinor === "number" ? res.totalMinor : undefined
          const draftCurrency =
            typeof res?.currency === "string" ? res.currency : "USD"
          const draftCustomer =
            typeof res?.customerName === "string" ? res.customerName : undefined
          const draftRevision =
            typeof res?.revision === "number" ? res.revision : undefined
          const schedRecipient =
            typeof res?.recipientEmail === "string"
              ? res.recipientEmail
              : "recipient"
          const schedFor = res?.scheduledFor
            ? new Date(String(res.scheduledFor)).toLocaleString()
            : ""

          return (
            <div key={tc.id} className="w-full">
              {/* If this is an approval requirement, render the prominent ApprovalDecisionCard */}
              {requiresApproval ? (
                <ApprovalDecisionCard
                  approvalId={tc.approvalId || tc.id}
                  toolName={tc.name}
                  args={tc.args || {}}
                  status={deriveApprovalStatus(tc)}
                  expiresAt={tc.expiresAt}
                  confidenceScore={tc.confidenceScore}
                  errorText={errorText}
                  onApprove={() =>
                    onApproveTool?.(tc.approvalId || tc.id, tc.args || {})
                  }
                  onReject={() => onRejectTool?.(tc.approvalId || tc.id)}
                />
              ) : (
                /* Standard Low-Noise Tool Execution Disclosure */
                <Tool defaultOpen={shouldDefaultOpen}>
                  <ToolHeader
                    type={tc.name}
                    state={toolState}
                    title={toolDisplayName(tc.name)}
                  />
                  {(hasArgs || hasOutput || isRunning) && (
                    <ToolContent>
                      {/* Live Execution Indicator when in-flight */}
                      {isRunning && !hasOutput && (
                        <div className="my-1.5 flex items-center gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75 motion-reduce:hidden" />
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
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <DocumentTextIcon className="size-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-medium text-foreground text-xs">
                                {draftTitle}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                {draftTotalUnits !== undefined && (
                                  <span>
                                    {formatCurrencyMinor(
                                      draftTotalUnits,
                                      draftCurrency
                                    )}
                                  </span>
                                )}
                                {draftTotalMinor !== undefined && (
                                  <span>
                                    {formatCurrencyMinor(
                                      draftTotalMinor,
                                      draftCurrency
                                    )}
                                  </span>
                                )}
                                {draftCustomer && (
                                  <span>• {draftCustomer}</span>
                                )}
                                {draftRevision !== undefined && (
                                  <span className="rounded bg-muted px-1 py-0.5 text-[10px]">
                                    v{draftRevision}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {draftId && (
                            <div className="shrink-0 pt-1 sm:pt-0">
                              <a
                                href={
                                  tc.name.includes("invoice")
                                    ? `/invoices/${draftId}`
                                    : `/proposals/${draftId}`
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 font-medium text-primary-foreground text-xs transition-colors hover:bg-primary/90"
                              >
                                <span>Open in Editor</span>
                                <ArrowTopRightOnSquareIcon className="size-3.5" />
                              </a>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Rich Action Banner for Scheduled Dispatches */}
                      {isScheduleResult && (
                        <div className="my-2.5 flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <ClockIcon className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-foreground">
                              Dispatch Scheduled
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              Will send to {schedRecipient} at {schedFor}
                            </div>
                          </div>
                        </div>
                      )}

                      {hasOutput && (
                        <ToolOutput output={tc.result} errorText={errorText} />
                      )}
                    </ToolContent>
                  )}
                </Tool>
              )}

              {/* Interactive Questionnaire */}
              {isQuestionnaire && !isError && (
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
            </div>
          )
        })}
      </div>
    </div>
  )
}
