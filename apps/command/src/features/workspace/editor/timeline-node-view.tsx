import { NodeViewContent, NodeViewWrapper } from "@tiptap/react"
import { Tick01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

export function TimelineItemNodeView() {
  return (
    <NodeViewWrapper className="timeline-item group relative flex gap-4">
      <div className="flex flex-col items-center">
        <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-border bg-background text-foreground transition-colors group-focus-within:border-primary">
          <HugeiconsIcon
            icon={Tick01Icon}
            className="h-3.5 w-3.5"
            strokeWidth={3}
          />
        </div>
        <div className="timeline-line absolute top-6 bottom-0 w-0.5 bg-border group-last:hidden" />
      </div>
      <div className="min-w-0 flex-1 pb-8 group-last:pb-0">
        <NodeViewContent />
      </div>
    </NodeViewWrapper>
  )
}
