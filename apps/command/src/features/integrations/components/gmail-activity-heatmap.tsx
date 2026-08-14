import { BoltIcon, CheckCircleIcon } from "@heroicons/react/24/outline"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  useGmailThreadActivity,
  useRegisterGmailWatch,
} from "../hooks/use-gmail-operations"

export function GmailActivityHeatmap() {
  const { data, isLoading, error } = useGmailThreadActivity()
  const registerWatchMutation = useRegisterGmailWatch()

  if (isLoading) {
    return (
      <div className="p-4 text-muted-foreground text-xs">
        Loading Gmail activity heatmap...
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-destructive text-xs">
        Failed to load Gmail activity heatmap.
      </div>
    )
  }

  const activities = data?.activities || []
  const subscription = data?.subscription

  return (
    <Card className="mt-4 border border-border/80 bg-muted/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BoltIcon className="size-4 text-emerald-500" />
            <CardTitle className="font-medium text-sm">
              Gmail Real-Time Thread Activity
            </CardTitle>
          </div>
          <Badge
            variant={
              subscription?.status === "active" ? "secondary" : "outline"
            }
            className={
              subscription?.status === "active"
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                : ""
            }
          >
            {subscription?.status === "active"
              ? "Pub/Sub Active"
              : "Polling Mode"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {activities.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            No thread metadata events captured yet. Real-time Pub/Sub watcher is
            listening.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {activities.slice(0, 15).map((act) => (
              <div
                key={
                  act.id || `${act.threadId}-${act.senderEmail || "unknown"}`
                }
                className="flex items-center justify-between rounded border border-border/60 bg-background p-2.5 text-xs"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">
                    {act.senderEmail || "Unknown Sender"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {act.subject || "No subject"}
                  </span>
                </div>
                {act.isSilent ? (
                  <Badge
                    variant="outline"
                    className="border-amber-500/30 text-[10px] text-amber-600"
                  >
                    Inactive (Last activity &gt; 5d)
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-emerald-500/30 text-[10px] text-emerald-600"
                  >
                    <CheckCircleIcon className="mr-1 inline size-3" />
                    Active
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t pt-3">
          <span className="text-muted-foreground text-xs">
            Push Notification Watch Status:
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={registerWatchMutation.isPending}
            onClick={() => registerWatchMutation.mutate(undefined)}
            className="text-xs"
          >
            {registerWatchMutation.isPending
              ? "Renewing Watch..."
              : "Renew Gmail Watch Subscription"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
