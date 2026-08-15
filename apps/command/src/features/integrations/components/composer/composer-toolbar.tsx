import {
  ArrowTopRightOnSquareIcon,
  CalendarDaysIcon,
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  DocumentDuplicateIcon,
  FaceSmileIcon,
  LinkIcon,
  PaperAirplaneIcon,
  PaperClipIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import * as React from "react"
import { CustomScheduleSubmenu } from "./custom-schedule-submenu"

interface ComposerToolbarProps {
  isSending: boolean
  isDraftSaved?: boolean
  statusMessage?: string | null
  documentType: "proposal" | "invoice"
  onSend: () => void
  onOpenGmailWeb: () => void
  onCopyShareLink: () => void
  onAttachFile: (files: FileList) => void
  onInsertGreeting: (snippet: string) => void
  onInsertSignature: () => void
  onDiscardDraft: () => void
  onScheduleSend?: (scheduledDate: Date, timeLabel: string) => void
}

function getTomorrowMorning(): Date {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(9, 0, 0, 0)
  return d
}

function getNextMondayMorning(): Date {
  const d = new Date()
  const day = d.getDay()
  const daysUntilNextMonday = ((7 - day + 1) % 7) || 7
  d.setDate(d.getDate() + daysUntilNextMonday)
  d.setHours(9, 0, 0, 0)
  return d
}

export function ComposerToolbar({
  isSending,
  isDraftSaved = true,
  statusMessage,
  documentType,
  onSend,
  onOpenGmailWeb,
  onCopyShareLink,
  onAttachFile,
  onInsertGreeting,
  onInsertSignature,
  onDiscardDraft,
  onScheduleSend,
}: ComposerToolbarProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [copiedLink, setCopiedLink] = React.useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAttachFile(e.target.files)
      e.target.value = ""
    }
  }

  const handleCopyLinkClick = () => {
    onCopyShareLink()
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  return (
    <TooltipProvider delay={200}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-border/50 border-t pt-3 pb-1">
        {/* Left: Draft saved status & Quick action tools */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <div className="flex select-none items-center gap-1.5 pr-1.5 text-muted-foreground text-xs">
            {isSending ? (
              <span className="flex animate-pulse items-center gap-1 font-medium text-primary">
                <span className="size-2 rounded-full bg-primary" />
                Sending...
              </span>
            ) : statusMessage ? (
              <span className="max-w-[160px] truncate font-medium text-[11px]">
                {statusMessage}
              </span>
            ) : isDraftSaved ? (
              <span className="flex items-center gap-1 font-medium text-[11px]">
                <CheckIcon className="size-3 text-emerald-500" />
                Draft saved
              </span>
            ) : null}
          </div>

          <div className="h-4 w-px bg-border/60" />

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Paperclip / Attach File */}
          <Tooltip>
            <TooltipTrigger
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex size-7.5 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Attach file"
            >
              <PaperClipIcon className="size-4" />
            </TooltipTrigger>
            <TooltipContent>Attach files</TooltipContent>
          </Tooltip>

          {/* Quick Greetings / Snippets Dropdown */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger
                render={
                  <DropdownMenuTrigger
                    type="button"
                    className="flex size-7.5 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    aria-label="Insert quick greeting"
                  >
                    <FaceSmileIcon className="size-4" />
                  </DropdownMenuTrigger>
                }
              />
              <TooltipContent>Insert quick snippet</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Quick Snippets</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() =>
                    onInsertGreeting(
                      "Great catching up earlier! I've put together the full proposal details below for your review."
                    )
                  }
                >
                  Catching up earlier...
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    onInsertGreeting(
                      "Please find attached the finalized draft for your review and digital signature."
                    )
                  }
                >
                  Review and sign...
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    onInsertGreeting(
                      "Please let me know if you need any adjustments or have questions before moving forward."
                    )
                  }
                >
                  Questions or adjustments...
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Copy Share Link */}
          <Tooltip>
            <TooltipTrigger
              type="button"
              onClick={handleCopyLinkClick}
              className="flex size-7.5 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Copy share link"
            >
              {copiedLink ? (
                <CheckIcon className="size-4 text-emerald-500" />
              ) : (
                <LinkIcon className="size-4" />
              )}
            </TooltipTrigger>
            <TooltipContent>
              {copiedLink ? "Link copied!" : "Copy document share link"}
            </TooltipContent>
          </Tooltip>

          {/* Insert Signature */}
          <Tooltip>
            <TooltipTrigger
              type="button"
              onClick={onInsertSignature}
              className="flex size-7.5 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Insert signature"
            >
              <PencilSquareIcon className="size-4" />
            </TooltipTrigger>
            <TooltipContent>Insert signature sign-off</TooltipContent>
          </Tooltip>

          {/* Discard Draft */}
          <Tooltip>
            <TooltipTrigger
              type="button"
              onClick={onDiscardDraft}
              className="flex size-7.5 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              aria-label="Discard draft"
            >
              <TrashIcon className="size-4 text-destructive/80" />
            </TooltipTrigger>
            <TooltipContent>Reset / Discard draft</TooltipContent>
          </Tooltip>
        </div>

        {/* Right: Primary Split Send Button */}
        <div className="flex items-center gap-1">
          <div className="inline-flex rounded-lg shadow-2xs">
            <Button
              type="button"
              onClick={onSend}
              disabled={isSending}
              size="sm"
              className="gap-1.5 rounded-r-none pr-3 font-semibold text-xs"
            >
              <PaperAirplaneIcon className="size-3.5" />
              {isSending
                ? "Sending..."
                : `Send ${documentType === "proposal" ? "Proposal" : "Invoice"}`}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    disabled={isSending}
                    size="sm"
                    variant="default"
                    className="rounded-l-none border-primary-foreground/20 border-l px-2 text-xs"
                    aria-label="More send options"
                  >
                    <ChevronDownIcon className="size-3.5" />
                  </Button>
                }
              />

              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Send Options</DropdownMenuLabel>
                  <DropdownMenuItem onClick={onSend}>
                    <PaperAirplaneIcon className="mr-1 size-3.5 text-primary" />
                    Send via Gmail API
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onOpenGmailWeb}>
                    <ArrowTopRightOnSquareIcon className="mr-1 size-3.5" />
                    Open in Gmail Web
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopyLinkClick}>
                    <DocumentDuplicateIcon className="mr-1 size-3.5" />
                    Copy Share Link
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Schedule Presets
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => {
                      const dt = getTomorrowMorning()
                      onScheduleSend?.(dt, "Tomorrow at 9:00 AM")
                    }}
                  >
                    <ClockIcon className="mr-1 size-3.5" />
                    Tomorrow at 9:00 AM
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      const dt = getNextMondayMorning()
                      onScheduleSend?.(dt, "Next Monday at 9:00 AM")
                    }}
                  >
                    <ClockIcon className="mr-1 size-3.5" />
                    Next Monday at 9:00 AM
                  </DropdownMenuItem>

                  {/* Submenu for Custom Date & Time (comp-503) */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <CalendarDaysIcon className="mr-1 size-3.5 text-primary" />
                      Custom Date &amp; Time
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent
                      side="left"
                      align="start"
                      sideOffset={8}
                      className="p-2"
                    >
                      <CustomScheduleSubmenu
                        documentType={documentType}
                        onSchedule={(label, scheduledDate) =>
                          onScheduleSend?.(scheduledDate, label)
                        }
                      />
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
