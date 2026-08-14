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
    list_customers: "Reviewing customers",
    get_customer: "Opening customer details",
    create_proposal: "Preparing proposal",
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
          const isQuestionnaire =
            tc.name === "ask_clarifying_questions" ||
            tc.name === "askClarifyingQuestions" ||
            tc.name.toLowerCase().includes("clarifying_question")
          const hasArgs = tc.args && Object.keys(tc.args).length > 0
          const hasOutput = tc.result !== undefined || tc.errorText

          return (
            <div key={tc.id} className="w-full">
              <Tool
                defaultOpen={
                  toolState === "approval-requested" ||
                  toolState === "output-error" ||
                  tc.needsApproval
                }
              >
                <ToolHeader
                  type={tc.name}
                  state={toolState}
                  title={toolDisplayName(tc.name)}
                />
                {!isQuestionnaire && (hasArgs || hasOutput) && (
                  <ToolContent>
                    {hasArgs && <ToolInput input={tc.args} />}
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
