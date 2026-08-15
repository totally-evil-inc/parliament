import {
  CalendarDaysIcon,
  CheckIcon,
  ClockIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  PaperAirplaneIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Calendar } from "@workspace/ui/components/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { cn } from "@workspace/ui/lib/utils"
import * as React from "react"
import { useConfirm } from "@/components/confirm-dialog-provider"
import type { ScheduledDispatchItem } from "@/server/scheduled-dispatches"
import {
  useCancelScheduledDispatch,
  useSendScheduledDispatchNow,
  useUpdateScheduledDispatch,
} from "../hooks/use-scheduled-dispatches"

export interface ScheduledEmailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dispatch: ScheduledDispatchItem | null
  documentTitle: string
}

function formatScheduledRelative(dateStr: string): string {
  const target = new Date(dateStr).getTime()
  const now = Date.now()
  const diffMs = target - now

  if (diffMs <= 0) return "Due for immediate dispatch"

  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 1) return `In ${diffDays} days`
  if (diffDays === 1) return "Tomorrow"
  if (diffHours > 1) return `In ${diffHours} hours`
  if (diffHours === 1) return "In ~1 hour"
  if (diffMinutes > 1) return `In ${diffMinutes} minutes`
  return "In less than a minute"
}

export function ScheduledEmailModal({
  open,
  onOpenChange,
  dispatch,
  documentTitle,
}: ScheduledEmailModalProps) {
  const confirm = useConfirm()
  const updateMutation = useUpdateScheduledDispatch()
  const cancelMutation = useCancelScheduledDispatch()
  const sendNowMutation = useSendScheduledDispatchNow()

  const [isEditing, setIsEditing] = React.useState(false)
  const [recipientEmail, setRecipientEmail] = React.useState("")
  const [subject, setSubject] = React.useState("")
  const [message, setMessage] = React.useState("")
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>()
  const [timeStr, setTimeStr] = React.useState("09:00")
  const [actionStatus, setActionStatus] = React.useState<string | null>(null)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  // Sync state when dispatch changes or modal opens
  React.useEffect(() => {
    if (dispatch && open) {
      setRecipientEmail(dispatch.recipientEmail)
      setSubject(dispatch.subject)
      setMessage(dispatch.message)
      const parsedDate = new Date(dispatch.scheduledFor)
      setSelectedDate(parsedDate)
      const h = String(parsedDate.getHours()).padStart(2, "0")
      const m = String(parsedDate.getMinutes()).padStart(2, "0")
      setTimeStr(`${h}:${m}`)
      setIsEditing(false)
      setActionStatus(null)
      setErrorMessage(null)
    }
  }, [dispatch, open])

  const scheduledDateObj = React.useMemo(() => {
    return dispatch ? new Date(dispatch.scheduledFor) : new Date()
  }, [dispatch?.scheduledFor])

  const combinedEditDate = React.useMemo((): Date | null => {
    if (!selectedDate) return null
    const [hoursStr, minutesStr] = timeStr.split(":")
    const hours = Number.parseInt(hoursStr || "9", 10)
    const minutes = Number.parseInt(minutesStr || "0", 10)
    const result = new Date(selectedDate)
    result.setHours(hours, minutes, 0, 0)
    return result
  }, [selectedDate, timeStr])

  const isEditDateInPast = React.useMemo(() => {
    if (!combinedEditDate) return false
    return combinedEditDate.getTime() <= Date.now()
  }, [combinedEditDate])

  if (!dispatch) return null

  const handleSaveChanges = async () => {
    setErrorMessage(null)
    if (!recipientEmail.trim()) {
      setErrorMessage("Recipient email cannot be empty.")
      return
    }
    if (!subject.trim()) {
      setErrorMessage("Subject line cannot be empty.")
      return
    }
    if (!message.trim()) {
      setErrorMessage("Message note cannot be empty.")
      return
    }
    if (!combinedEditDate || isEditDateInPast) {
      setErrorMessage("Scheduled time must be in the future.")
      return
    }

    try {
      setActionStatus("Saving updated schedule...")
      await updateMutation.mutateAsync({
        id: dispatch.id,
        recipientEmail: recipientEmail.trim(),
        subject: subject.trim(),
        message: message.trim(),
        scheduledFor: combinedEditDate.toISOString(),
      })
      setActionStatus("Schedule updated successfully!")
      setIsEditing(false)
      setTimeout(() => setActionStatus(null), 2500)
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to update schedule"
      setErrorMessage(msg)
      setActionStatus(null)
    }
  }

  const handleCancelSchedule = async () => {
    const ok = await confirm({
      title: "Cancel Scheduled Email?",
      description: `Are you sure you want to cancel the scheduled send for "${documentTitle}"? The document will return to Draft status.`,
      confirmLabel: "Cancel Schedule",
      cancelLabel: "Keep Scheduled",
      variant: "destructive",
    })

    if (!ok) return

    try {
      setActionStatus("Cancelling schedule...")
      await cancelMutation.mutateAsync({
        id: dispatch.id,
        documentId: dispatch.documentId,
        documentType: dispatch.documentType,
      })
      setActionStatus("Schedule cancelled.")
      setTimeout(() => {
        onOpenChange(false)
      }, 1000)
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to cancel schedule"
      setErrorMessage(msg)
      setActionStatus(null)
    }
  }

  const handleSendNow = async () => {
    const ok = await confirm({
      title: "Send Email Immediately?",
      description: `Are you sure you want to bypass the schedule and dispatch "${documentTitle}" to ${dispatch.recipientEmail} right now?`,
      confirmLabel: "Send Now",
      cancelLabel: "Keep Schedule",
    })

    if (!ok) return

    try {
      setActionStatus("Dispatching email now...")
      await sendNowMutation.mutateAsync(dispatch.id)
      setActionStatus(`Sent to ${dispatch.recipientEmail}!`)
      setTimeout(() => {
        onOpenChange(false)
      }, 1200)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send email"
      setErrorMessage(msg)
      setActionStatus(null)
    }
  }

  const isPendingAction =
    updateMutation.isPending ||
    cancelMutation.isPending ||
    sendNowMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        {/* Header */}
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between border-border/60 border-b px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl border border-border/80 bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ClockIcon className="size-5" />
            </div>
            <div>
              <DialogTitle className="flex items-center gap-2 font-semibold text-foreground text-sm tracking-tight">
                Scheduled Email Details
                <Badge
                  variant="outline"
                  className={cn(
                    "font-semibold text-[10px] uppercase tracking-wider",
                    dispatch.status === "pending" &&
                      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
                    dispatch.status === "processing" &&
                      "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
                    dispatch.status === "sent" &&
                      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                    dispatch.status === "failed" &&
                      "border-destructive/30 bg-destructive/10 text-destructive"
                  )}
                >
                  {dispatch.status}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs">
                {documentTitle} •{" "}
                <span className="font-medium text-foreground capitalize">
                  {dispatch.documentType}
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content Area */}
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-4.5 p-5">
            {/* Status Banner / Countdown */}
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/30 p-3.5">
              <div className="flex items-center gap-2.5">
                <CalendarDaysIcon className="size-4.5 text-primary" />
                <div className="flex flex-col">
                  <span className="font-medium text-foreground text-xs">
                    {scheduledDateObj.toLocaleString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {formatScheduledRelative(dispatch.scheduledFor)}
                  </span>
                </div>
              </div>

              {!isEditing && dispatch.status === "pending" && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="h-7.5 gap-1.5 font-medium text-xs shadow-2xs"
                >
                  <PencilSquareIcon className="size-3.5" />
                  Edit Schedule
                </Button>
              )}
            </div>

            {/* Error Message Alert (if any) */}
            {dispatch.lastError && (
              <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive text-xs">
                <ExclamationTriangleIcon className="mt-0.5 size-4 shrink-0" />
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold">Last Delivery Attempt Failed</span>
                  <span className="leading-relaxed">{dispatch.lastError}</span>
                </div>
              </div>
            )}

            {/* Action Feedback Messages */}
            {errorMessage && (
              <div className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-destructive text-xs">
                <span>{errorMessage}</span>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="cursor-pointer hover:opacity-80"
                >
                  <XMarkIcon className="size-3.5" />
                </button>
              </div>
            )}

            {actionStatus && !errorMessage && (
              <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-emerald-600 text-xs dark:text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <CheckIcon className="size-3.5" />
                  {actionStatus}
                </span>
                <button
                  type="button"
                  onClick={() => setActionStatus(null)}
                  className="cursor-pointer hover:opacity-80"
                >
                  <XMarkIcon className="size-3.5" />
                </button>
              </div>
            )}

            {/* Editing Form vs Readonly View */}
            {isEditing ? (
              <div className="flex flex-col gap-4 rounded-xl border border-border/80 bg-background p-4 shadow-2xs">
                <div className="flex items-center justify-between border-border/50 border-b pb-2">
                  <span className="font-semibold text-foreground text-xs">
                    Edit Scheduled Dispatch
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                    className="h-6 text-muted-foreground text-xs hover:text-foreground"
                  >
                    Cancel Edit
                  </Button>
                </div>

                {/* Recipient Input */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-muted-foreground text-xs">To Recipient</Label>
                  <Input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="recipient@example.com"
                    className="h-8.5 text-xs"
                  />
                </div>

                {/* Subject Input */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-muted-foreground text-xs">Subject</Label>
                  <Input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Subject line..."
                    className="h-8.5 text-xs"
                  />
                </div>

                {/* Message Textarea */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-muted-foreground text-xs">Personal Note</Label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-input bg-transparent p-2 text-foreground text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>

                {/* Date & Time Reschedule Picker */}
                <div className="flex flex-col gap-2 pt-1">
                  <Label className="text-muted-foreground text-xs">Reschedule Delivery Time</Label>
                  <div className="overflow-hidden rounded-lg border border-border/70 bg-background/80">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                      className="w-full p-2.5"
                    />
                    <div className="flex items-center gap-3 border-border/60 border-t bg-muted/20 p-2.5">
                      <Label className="shrink-0 font-medium text-foreground text-xs">
                        Time
                      </Label>
                      <Input
                        type="time"
                        value={timeStr}
                        onChange={(e) => setTimeStr(e.target.value)}
                        className="h-8 font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                    className="h-8 text-xs"
                  >
                    Discard
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isPendingAction || isEditDateInPast}
                    onClick={handleSaveChanges}
                    className="h-8 font-semibold text-xs"
                  >
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/15 p-4 text-xs">
                {/* To */}
                <div className="flex items-center justify-between border-border/40 border-b pb-2">
                  <span className="text-muted-foreground">Recipient (To):</span>
                  <span className="font-medium text-foreground">
                    {dispatch.recipientEmail}
                  </span>
                </div>

                {/* CC / BCC (if any) */}
                {dispatch.ccRecipients.length > 0 && (
                  <div className="flex items-center justify-between border-border/40 border-b pb-2">
                    <span className="text-muted-foreground">Cc:</span>
                    <span className="font-medium text-foreground">
                      {dispatch.ccRecipients.join(", ")}
                    </span>
                  </div>
                )}

                {/* Channel */}
                <div className="flex items-center justify-between border-border/40 border-b pb-2">
                  <span className="text-muted-foreground">Channel:</span>
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <EnvelopeIcon className="size-3.5 text-primary" />
                    {dispatch.sendMethod === "gmail"
                      ? "Gmail API (Authenticated)"
                      : "Workspace SMTP"}
                  </span>
                </div>

                {/* Subject */}
                <div className="flex flex-col gap-1 border-border/40 border-b pb-2">
                  <span className="text-muted-foreground">Subject:</span>
                  <span className="font-medium text-foreground">
                    {dispatch.subject}
                  </span>
                </div>

                {/* Personal Note Preview */}
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Personal Message:</span>
                  <p className="whitespace-pre-wrap rounded-md bg-muted/40 p-2.5 text-foreground text-xs leading-relaxed">
                    {dispatch.message}
                  </p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <DialogFooter className="flex shrink-0 flex-row items-center justify-between border-border/60 border-t bg-muted/20 px-5 py-3 sm:justify-between">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isPendingAction || dispatch.status !== "pending"}
            onClick={handleCancelSchedule}
            className="h-8 gap-1.5 text-xs shadow-2xs"
          >
            <TrashIcon className="size-3.5" />
            {cancelMutation.isPending ? "Cancelling..." : "Cancel Schedule"}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs"
            >
              Close
            </Button>

            {dispatch.status === "pending" && (
              <Button
                type="button"
                size="sm"
                disabled={isPendingAction}
                onClick={handleSendNow}
                className="h-8 gap-1.5 font-semibold text-xs shadow-2xs"
              >
                <PaperAirplaneIcon className="size-3.5" />
                {sendNowMutation.isPending ? "Sending..." : "Send Now"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
