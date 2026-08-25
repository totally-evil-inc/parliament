import { CheckCircleIcon, ShieldCheckIcon } from "@heroicons/react/24/outline"
import { Card } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { PageHeader } from "@/components/page-header"
import { AppHeader } from "@/layouts/header-portal"
import { ApprovalDecisionCard } from "./components/approval-decision-card"
import { usePendingApprovals, useResolveAction } from "./use-agent-approvals"

export function ApprovalsPage() {
  const {
    data: pendingActions,
    isLoading,
    isError,
    error,
  } = usePendingApprovals()
  const resolveMutation = useResolveAction()

  return (
    <>
      <AppHeader />
      <PageHeader
        title="Agent Action Approvals"
        description="Review and authorize sensitive actions requested by autonomous AI agents before execution."
      />

      <main className="flex flex-1 flex-col gap-6 p-6 md:p-8">
        {/* Mutation Error Toast / Banner */}
        {resolveMutation.isError && (
          <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="size-5 shrink-0" />
              <span className="font-semibold">
                Authorization error:{" "}
                {resolveMutation.error?.message || "Failed to resolve action"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => resolveMutation.reset()}
              className="text-xs underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading ? (
          <div className="grid gap-5 md:grid-cols-2">
            {[1, 2].map((i) => (
              <Card key={i} className="flex flex-col gap-4 p-6">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-48 rounded-md" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-20 w-full rounded-lg" />
                <div className="mt-auto flex justify-end gap-2 pt-2">
                  <Skeleton className="h-8 w-20 rounded-md" />
                  <Skeleton className="h-8 w-28 rounded-md" />
                </div>
              </Card>
            ))}
          </div>
        ) : isError ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center">
            <div className="rounded-full bg-destructive/10 p-3 text-destructive">
              <ShieldCheckIcon className="size-6" />
            </div>
            <h3 className="mt-4 font-semibold text-lg">
              Unable to Load Approvals
            </h3>
            <p className="mt-1 text-muted-foreground text-sm">
              {error?.message ||
                "An unexpected error occurred while fetching pending requests."}
            </p>
          </Card>
        ) : !pendingActions || pendingActions.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center">
            <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-600">
              <CheckCircleIcon className="size-6" />
            </div>
            <h3 className="mt-4 font-semibold text-lg">All Caught Up</h3>
            <p className="mt-1 max-w-sm text-muted-foreground text-sm">
              No pending actions requiring Human-in-the-Loop (HITL)
              authorization in your workspace.
            </p>
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {pendingActions.map((action) => {
              const isActionPending =
                resolveMutation.isPending &&
                resolveMutation.variables?.actionId === action.id

              return (
                <ApprovalDecisionCard
                  key={action.id}
                  approvalId={action.id}
                  toolName={action.toolName}
                  args={action.toolArgs}
                  summary={action.summary}
                  status={action.status}
                  expiresAt={action.expiresAt}
                  createdAt={action.createdAt}
                  confidenceScore={action.confidenceScore}
                  isPending={isActionPending}
                  variant="dashboard"
                  onApprove={(feedback) =>
                    resolveMutation.mutate({
                      actionId: action.id,
                      approved: true,
                      feedback,
                    })
                  }
                  onReject={(feedback) =>
                    resolveMutation.mutate({
                      actionId: action.id,
                      approved: false,
                      feedback,
                    })
                  }
                />
              )
            })}
          </div>
        )}
      </main>
    </>
  )
}
