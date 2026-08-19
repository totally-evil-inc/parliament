import type React from "react"
import {
  type ApprovalCardStatus,
  ApprovalDecisionCard,
} from "../../approvals/components/approval-decision-card"

export interface ApprovalCardProps {
  approvalId?: string
  toolName: string
  args: Record<string, unknown>
  summary?: string
  status?: ApprovalCardStatus
  expiresAt?: string | Date
  confidenceScore?: number
  errorText?: string
  isPending?: boolean
  onApprove: (feedback?: string) => void | Promise<void>
  onReject: (feedback?: string) => void | Promise<void>
  className?: string
}

export const ApprovalCard: React.FC<ApprovalCardProps> = ({
  approvalId,
  toolName,
  args,
  summary,
  status = "pending",
  expiresAt,
  confidenceScore,
  errorText,
  isPending,
  onApprove,
  onReject,
  className,
}) => {
  return (
    <ApprovalDecisionCard
      approvalId={approvalId}
      toolName={toolName}
      args={args}
      summary={summary}
      status={status}
      expiresAt={expiresAt}
      confidenceScore={confidenceScore}
      errorText={errorText}
      isPending={isPending}
      variant="inline"
      onApprove={onApprove}
      onReject={onReject}
      className={className}
    />
  )
}
