import { HugeiconsIcon } from "@hugeicons/react"
import {
  Image01Icon,
  LayoutGridIcon,
  LayoutTableIcon,
  MoreHorizontalIcon,
  QuillWrite02Icon,
  StarIcon,
  TextFontIcon,
  VideoReplayIcon,
} from "@hugeicons/core-free-icons"
import { Button } from "@workspace/ui/components/button"
import { Separator } from "@workspace/ui/components/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import type { Editor } from "@tiptap/react"

const ACTIONS = [
  { icon: TextFontIcon, label: "Text", command: "text" },
  { icon: Image01Icon, label: "Image", command: "image" },
  { icon: VideoReplayIcon, label: "Video", command: "video" },
  { icon: QuillWrite02Icon, label: "Quote", command: "quote" },
  { icon: StarIcon, label: "Icon", command: "icon" },
  { icon: LayoutTableIcon, label: "Table", command: "table" },
  { icon: LayoutGridIcon, label: "Layout", command: "layout" },
]

export function ProposalToolbar({ editor }: { editor: Editor | null }) {
  const runCommand = (command: string) => {
    if (!editor) return

    switch (command) {
      case "text":
        editor.chain().focus().setNode("paragraph").run()
        break
      case "image":
        editor.chain().focus().insertContent({ type: "gallery" }).run()
        break
      case "video":
        editor.chain().focus().insertContent({ type: "timeline" }).run()
        break
      case "quote":
        editor.chain().focus().insertContent({ type: "testimonials" }).run()
        break
      case "table":
        editor.chain().focus().insertContent({ type: "pricingTable" }).run()
        break
      case "layout":
        editor.chain().focus().insertContent({ type: "keyNumbers" }).run()
        break
      case "icon":
        editor.chain().focus().insertContent({ type: "teamMembers" }).run()
        break
    }
  }

  return (
    <TooltipProvider delay={0}>
      <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
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
          <Separator orientation="vertical" className="mx-1 h-6" />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-xl hover:bg-accent hover:text-accent-foreground"
                />
              }
            >
              <HugeiconsIcon icon={MoreHorizontalIcon} className="h-5 w-5" />
              <span className="sr-only">More</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="rounded-lg font-medium">
              More
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  )
}
