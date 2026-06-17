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

export const Timeline = Node.create({
  name: "timeline",
  group: "block",
  content: "timelineItem+",
  defining: true,
  parseHTML() {
    return [{ tag: 'div[data-type="timeline"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "timeline",
        class: "notion-timeline my-6",
      }),
      0,
    ]
  },
})

export const TimelineItem = Node.create({
  name: "timelineItem",
  content: "timelineDate timelineTitle timelineDescription",
  defining: true,
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
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { state } = this.editor
        const { selection } = state
        const { $from, empty } = selection

        if (!empty) return false

        // 1. Handle Enter in Date -> Move to Title
        if ($from.node(-1).type.name === "timelineDate") {
          return this.editor.commands.focus($from.after() + 1)
        }

        // 2. Handle Enter in Title -> Move to Description
        if ($from.node(-1).type.name === "timelineTitle") {
          return this.editor.commands.focus($from.after() + 2) // +1 for description, +1 for paragraph
        }

        // 3. Handle Enter in Description
        let descriptionDepth = -1
        for (let d = $from.depth; d > 0; d--) {
          if (
            state.doc.nodeAt($from.before(d))?.type.name ===
            "timelineDescription"
          ) {
            descriptionDepth = d
            break
          }
        }

        if (descriptionDepth !== -1) {
          const isLastBlockInDescription =
            $from.indexAfter(descriptionDepth) ===
            $from.node(descriptionDepth).childCount
          const isAtEndOfParagraph =
            $from.parentOffset === $from.parent.content.size
          const isEmptyParagraph = $from.parent.content.size === 0

          // Double Enter to exit timeline
          if (isEmptyParagraph && isLastBlockInDescription) {
            return this.editor
              .chain()
              .deleteSelection()
              .insertContentAt($from.after(descriptionDepth - 1), {
                type: "paragraph",
              })
              .focus($from.after(descriptionDepth - 1) + 1)
              .run()
          }

          // Enter at end to add new Item
          if (isAtEndOfParagraph && isLastBlockInDescription) {
            const itemPos = $from.after(descriptionDepth - 1)
            return this.editor
              .chain()
              .insertContentAt(itemPos, {
                type: "timelineItem",
                content: [
                  { type: "timelineDate" },
                  { type: "timelineTitle" },
                  {
                    type: "timelineDescription",
                    content: [{ type: "paragraph" }],
                  },
                ],
              })
              .focus(itemPos + 2)
              .run()
          }
        }

        return false
      },
    }
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
