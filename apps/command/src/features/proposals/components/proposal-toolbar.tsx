import { HugeiconsIcon } from "@hugeicons/react"
import {
  Download01Icon,
  Image01Icon,
  LayoutGridIcon,
  LayoutTableIcon,
  QuillWrite02Icon,
  Share01Icon,
  StarIcon,
  TextFontIcon,
  VideoReplayIcon,
} from "@hugeicons/core-free-icons"
import { Button } from "@workspace/ui/components/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { useSidebar } from "@workspace/ui/components/sidebar"
import type { Editor } from "@tiptap/react"

import { insertProposalBlock } from "@/features/proposals/utils/insert-proposal-block"

const ACTIONS = [
  { icon: TextFontIcon, label: "Text", command: "text" },
  { icon: Image01Icon, label: "Image", command: "image" },
  { icon: VideoReplayIcon, label: "Video", command: "video" },
  { icon: QuillWrite02Icon, label: "Quote", command: "quote" },
  { icon: StarIcon, label: "Icon", command: "icon" },
  { icon: LayoutTableIcon, label: "Table", command: "table" },
  { icon: LayoutGridIcon, label: "Layout", command: "layout" },
]

interface ProposalToolbarProps {
  editor: Editor | null
  onExport?: () => void
  onSendProposal?: () => void
}

export function ProposalToolbar({
  editor,
  onExport,
  onSendProposal,
}: ProposalToolbarProps) {
  const { toggleSidebar } = useSidebar()

  const runCommand = (command: string) => {
    if (!editor) return

    switch (command) {
      case "text":
        editor.chain().focus().setNode("paragraph").run()
        break
      case "image":
        insertProposalBlock(editor, { type: "gallery" })
        break
      case "video":
        insertProposalBlock(editor, { type: "timeline" })
        break
      case "quote":
        insertProposalBlock(editor, { type: "testimonials" })
        break
      case "table":
        insertProposalBlock(editor, { type: "pricingTable" })
        break
      case "layout":
        toggleSidebar()
        break
      case "icon":
        insertProposalBlock(editor, { type: "teamMembers" })
        break
    }
  }

  return (
    <TooltipProvider delay={0}>
      <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2">
        <div className="flex items-center gap-1 rounded-2xl border bg-background/80 p-1.5 shadow-2xl backdrop-blur-xl transition-all hover:bg-background">
          {ACTIONS.map((action) => (
            <Tooltip key={action.label}>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => runCommand(action.command)}
                    className="h-10 w-10 rounded-xl hover:bg-accent hover:text-accent-foreground"
                  />
                }
              >
                <HugeiconsIcon icon={action.icon} className="h-5 w-5" />
                <span className="sr-only">{action.label}</span>
              </TooltipTrigger>
              <TooltipContent side="top" className="rounded-lg font-medium">
                {action.label}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        <div className="flex items-center gap-1 pl-1">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  onClick={onExport}
                  className="h-10 gap-2 rounded-xl bg-background/80 px-3"
                />
              }
            >
              <HugeiconsIcon icon={Download01Icon} className="h-4 w-4" />
              <span className="text-sm font-medium">Export</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="rounded-lg font-medium">
              Export
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  onClick={onSendProposal}
                  size={"icon-lg"}
                  className="aspect-square h-10 w-10 gap-2 rounded-full"
                />
              }
            >
              <HugeiconsIcon icon={Share01Icon} className="h-4 w-4" />
            </TooltipTrigger>
            <TooltipContent side="top" className="rounded-lg font-medium">
              Send Proposal
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  )
}
