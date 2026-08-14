import {
  ArrowTopRightOnSquareIcon,
  DocumentCheckIcon,
  DocumentIcon,
  DocumentTextIcon,
  PhotoIcon,
  TableCellsIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline"
import type { AttachmentType, ComposerAttachment } from "./composer-types"

interface FileBadgeProps {
  type: AttachmentType
}

function FileTypeBadge({ type }: FileBadgeProps) {
  switch (type) {
    case "gate":
      return (
        <div className="flex size-9 shrink-0 flex-col items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
          <DocumentCheckIcon className="size-4.5" />
          <span className="-mt-0.5 font-bold font-mono text-[8px] uppercase tracking-tighter">
            GATE
          </span>
        </div>
      )
    case "pdf":
      return (
        <div className="flex size-9 shrink-0 flex-col items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400">
          <DocumentTextIcon className="size-4.5" />
          <span className="-mt-0.5 font-bold font-mono text-[8px] uppercase tracking-tighter">
            PDF
          </span>
        </div>
      )
    case "pptx":
      return (
        <div className="flex size-9 shrink-0 flex-col items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <DocumentIcon className="size-4.5" />
          <span className="-mt-0.5 font-bold font-mono text-[8px] uppercase tracking-tighter">
            PPT
          </span>
        </div>
      )
    case "xlsx":
      return (
        <div className="flex size-9 shrink-0 flex-col items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <TableCellsIcon className="size-4.5" />
          <span className="-mt-0.5 font-bold font-mono text-[8px] uppercase tracking-tighter">
            XLS
          </span>
        </div>
      )
    case "docx":
      return (
        <div className="flex size-9 shrink-0 flex-col items-center justify-center rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400">
          <DocumentTextIcon className="size-4.5" />
          <span className="-mt-0.5 font-bold font-mono text-[8px] uppercase tracking-tighter">
            DOC
          </span>
        </div>
      )
    case "image":
      return (
        <div className="flex size-9 shrink-0 flex-col items-center justify-center rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400">
          <PhotoIcon className="size-4.5" />
          <span className="-mt-0.5 font-bold font-mono text-[8px] uppercase tracking-tighter">
            IMG
          </span>
        </div>
      )
    default:
      return (
        <div className="flex size-9 shrink-0 flex-col items-center justify-center rounded-lg border border-border bg-muted/60 text-muted-foreground">
          <DocumentIcon className="size-4.5" />
          <span className="-mt-0.5 font-bold font-mono text-[8px] uppercase tracking-tighter">
            FILE
          </span>
        </div>
      )
  }
}

interface ComposerAttachmentCardProps {
  attachment: ComposerAttachment
  onRemove?: (id: string) => void
}

export function ComposerAttachmentCard({
  attachment,
  onRemove,
}: ComposerAttachmentCardProps) {
  const isGateDoc = attachment.type === "gate"

  return (
    <div className="group relative flex min-w-[200px] max-w-[300px] flex-1 items-center gap-2.5 rounded-xl border border-border/70 bg-card/60 p-2.5 text-left shadow-2xs transition-all hover:border-border hover:bg-accent/30">
      <FileTypeBadge type={attachment.type} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <span
          className="truncate font-semibold text-foreground text-xs"
          title={attachment.name}
        >
          {attachment.name}
        </span>
        <span className="font-medium text-[11px] text-muted-foreground">
          {attachment.size}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1 opacity-80 group-hover:opacity-100">
        {attachment.url ? (
          <a
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title={isGateDoc ? "Open Client Gate Document" : "Open link"}
          >
            <ArrowTopRightOnSquareIcon className="size-3.5" />
          </a>
        ) : null}
        {!attachment.isPrimary && onRemove && (
          <button
            type="button"
            onClick={() => onRemove(attachment.id)}
            className="flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="Remove attachment"
          >
            <XMarkIcon className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
