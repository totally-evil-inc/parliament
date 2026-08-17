import { cn } from "@workspace/ui/lib/utils"
import type { IntegrationPreview } from "../data"

type IntegrationPreviewCarouselProps = {
  previews?: IntegrationPreview[]
  className?: string
}

export function IntegrationPreviewCarousel({
  previews,
  className,
}: IntegrationPreviewCarouselProps) {
  if (!previews || previews.length === 0) {
    return null
  }

  return (
    <div className={cn("w-full overflow-hidden py-1", className)}>
      <div className="no-scrollbar flex w-full gap-3.5 overflow-x-auto pb-2 pt-1 snap-x snap-mandatory">
        {previews.map((preview) => (
          <PreviewCard key={preview.id} preview={preview} />
        ))}
      </div>
    </div>
  )
}

function PreviewCard({ preview }: { preview: IntegrationPreview }) {
  return (
    <div
      className={cn(
        "relative flex h-[190px] w-[290px] shrink-0 snap-start select-none flex-col overflow-hidden rounded-2xl p-4 shadow-md transition-all duration-300 hover:shadow-lg sm:w-[320px]",
        "bg-gradient-to-br",
        preview.gradient
      )}
    >
      {/* Ambient sheen overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/20 pointer-events-none" />

      {/* Visual Mockup Content */}
      <div className="relative z-10 flex h-full w-full flex-col justify-center">
        {preview.type === "toast" && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 rounded-xl border border-white/40 bg-white/90 p-2.5 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-slate-900/90">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white shadow-xs">
                <IconBell className="size-3.5" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-semibold text-slate-900 text-xs dark:text-slate-100">
                  Visionary Group
                </span>
                <span className="truncate text-slate-600 text-[11px] leading-tight dark:text-slate-300">
                  {preview.title}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/40 bg-white/90 p-2.5 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-slate-900/90">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-purple-500 text-white shadow-xs">
                <IconCheck className="size-3.5" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-semibold text-slate-900 text-xs dark:text-slate-100">
                  Empowerment Team
                </span>
                <span className="truncate text-slate-600 text-[11px] leading-tight dark:text-slate-300">
                  Payment Reminder: Completed
                </span>
              </div>
            </div>
          </div>
        )}

        {preview.type === "card" && (
          <div className="flex flex-col rounded-xl border border-white/40 bg-white/95 p-3.5 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-slate-900/95">
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <div className="flex size-6 items-center justify-center rounded-full bg-amber-500 font-bold text-white text-xs">
                  S
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-900 text-xs dark:text-slate-100">
                    Synergy Squad
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    team@synergy.com
                  </span>
                </div>
              </div>
              <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-[10px] text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                Action Required
              </span>
            </div>
            <h4 className="mt-1 font-semibold text-slate-900 text-xs dark:text-slate-100">
              {preview.title}
            </h4>
            <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
              <span>To: kate@auna.com</span>
              <span>•</span>
              <span>Cc: team@auna.com</span>
            </div>
            <div className="mt-2 space-y-1">
              <div className="h-1.5 w-full rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-1.5 w-4/5 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
        )}

        {preview.type === "sidebar" && (
          <div className="flex w-full items-center justify-center">
            <div className="flex w-[210px] flex-col rounded-xl border border-white/40 bg-white/95 p-3 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-slate-900/95">
              <span className="pb-2 font-bold text-[11px] text-slate-400 tracking-wider">
                MAILS
              </span>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2.5 rounded-lg bg-slate-100 px-2.5 py-1.5 font-medium text-slate-900 dark:bg-slate-800 dark:text-slate-100">
                  <IconInbox className="size-3.5 text-primary" />
                  <span>Inbox</span>
                  <span className="ml-auto rounded-full bg-primary/10 px-1.5 py-0.2 font-semibold text-[10px] text-primary">
                    12
                  </span>
                </div>
                <div className="flex items-center gap-2.5 px-2.5 py-1 text-slate-600 dark:text-slate-400">
                  <IconFolder className="size-3.5" />
                  <span>Drafts</span>
                </div>
                <div className="flex items-center gap-2.5 px-2.5 py-1 text-slate-600 dark:text-slate-400">
                  <IconStar className="size-3.5" />
                  <span>Starred</span>
                </div>
                <div className="flex items-center gap-2.5 px-2.5 py-1 text-slate-600 dark:text-slate-400">
                  <IconPaperPlane className="size-3.5" />
                  <span>Sent</span>
                </div>
                <div className="flex items-center gap-2.5 px-2.5 py-1 text-slate-600 dark:text-slate-400">
                  <IconTrash className="size-3.5" />
                  <span>Deleted</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {preview.type !== "toast" &&
          preview.type !== "card" &&
          preview.type !== "sidebar" && (
            <div className="flex flex-col rounded-xl border border-white/40 bg-white/90 p-4 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-slate-900/90">
              <h4 className="font-semibold text-slate-900 text-xs dark:text-slate-100">
                {preview.title}
              </h4>
              {preview.subtitle && (
                <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                  {preview.subtitle}
                </p>
              )}
            </div>
          )}
      </div>
    </div>
  )
}

function IconBell(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  )
}

function IconCheck(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconInbox(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  )
}

function IconFolder(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M20 20H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8l2 2h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2z" />
    </svg>
  )
}

function IconStar(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

function IconPaperPlane(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function IconTrash(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}
