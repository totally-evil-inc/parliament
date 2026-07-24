import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { IconCircleCheck, IconDeleteX } from "nucleo-glass"
import { PageHeader } from "@/components/page-header"
import type { PendingAction } from "./use-agent-approvals"
import { useApproveAction, usePendingApprovals, useRejectAction } from "./use-agent-approvals"

export function ApprovalsPage() {
  const { data: pendingActions, isLoading } = usePendingApprovals()
  const approveMutation = useApproveAction()
  const rejectMutation = useRejectAction()

  return (
    <>
      <PageHeader
        title="Agent Action Approvals"
        description="Review and authorize high-risk actions requested by autonomous AI agents before execution."
      />

      <div className="flex flex-1 flex-col gap-5 p-6 md:p-8">
        {isLoading ? (
          <div className="text-muted-foreground text-sm">Loading pending agent requests...</div>
        ) : !pendingActions || pendingActions.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center">
            <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-600">
              <IconCircleCheck className="size-6" />
            </div>
            <h3 className="mt-4 font-semibold text-lg">All Caught Up</h3>
            <p className="mt-1 text-muted-foreground text-sm">
              No pending staged actions requiring Human-in-the-Loop (HITL) approval.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {pendingActions.map((action) => (
              <ApprovalCard
                key={action.id}
                action={action}
                onApprove={() => approveMutation.mutate(action.id)}
                onReject={() => rejectMutation.mutate(action.id)}
                isPending={approveMutation.isPending || rejectMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function ApprovalCard({
  action,
  onApprove,
  onReject,
  isPending,
}: {
  action: PendingAction
  onApprove: () => void
  onReject: () => void
  isPending: boolean
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div>
          <CardTitle className="font-mono text-base">{action.toolName}</CardTitle>
          <CardDescription className="mt-1">{action.reason}</CardDescription>
        </div>
        <CardAction>
          <Badge variant="outline" className="border-amber-500/30 text-amber-600 bg-amber-500/10">
            {(action.confidenceScore * 100).toFixed(0)}% Confidence
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-2">
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Proposed Arguments Payload
        </span>
        <pre className="max-h-48 overflow-auto rounded-md bg-muted/50 p-3 font-mono text-xs">
          {JSON.stringify(action.args, null, 2)}
        </pre>
      </CardContent>

      <CardFooter className="mt-auto justify-end gap-2 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={onReject}
        >
          <IconDeleteX data-icon="inline-start" />
          Reject
        </Button>
        <Button
          type="button"
          variant="default"
          size="sm"
          disabled={isPending}
          onClick={onApprove}
        >
          <IconCircleCheck data-icon="inline-start" />
          Approve Action
        </Button>
      </CardFooter>
    </Card>
  )
}
