import { Node, mergeAttributes } from "@tiptap/core"
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from "@tiptap/react"
import { Tick01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

const TimelineItemNodeView = () => {
  return (
    <NodeViewWrapper className="timeline-item relative flex gap-4 pb-8 last:pb-0">
      <div className="flex flex-col items-center">
        <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-border bg-background text-foreground">
          <HugeiconsIcon icon={Tick01Icon} className="h-3.5 w-3.5" strokeWidth={3} />
        </div>
        <div className="timeline-line absolute bottom-0 top-6 w-0.5 bg-border" />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <NodeViewContent />
      </div>
    </NodeViewWrapper>
  )
}

export const Timeline = Node.create({
  name: "timeline",
  group: "block",
  content: "timelineItem+",
  parseHTML() {
    return [{ tag: 'div[data-type="timeline"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "timeline", class: "notion-timeline my-6" }),
      0,
    ]
  },
})

export const TimelineItem = Node.create({
  name: "timelineItem",
  content: "timelineDate timelineTitle timelineDescription",
  parseHTML() {
    return [{ tag: 'div[data-type="timelineItem"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "timelineItem" }),
      0,
    ]
  },
  addNodeView() {
    return ReactNodeViewRenderer(TimelineItemNodeView)
  },
})

export const TimelineDate = Node.create({
  name: "timelineDate",
  content: "inline*",
  parseHTML() {
    return [{ tag: 'div[data-type="timelineDate"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "timelineDate",
        class: "text-xs text-muted-foreground font-medium mb-1",
      }),
      0,
    ]
  },
})

export const TimelineTitle = Node.create({
  name: "timelineTitle",
  content: "inline*",
  parseHTML() {
    return [{ tag: 'div[data-type="timelineTitle"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "timelineTitle",
        class: "text-base font-bold text-foreground mb-1",
      }),
      0,
    ]
  },
})

export const TimelineDescription = Node.create({
  name: "timelineDescription",
  content: "block+",
  parseHTML() {
    return [{ tag: 'div[data-type="timelineDescription"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "timelineDescription",
        class: "text-sm text-muted-foreground",
      }),
      0,
    ]
  },
})
