import { HugeiconsIcon } from "@hugeicons/react"
import { Download01Icon, Share01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@workspace/ui/components/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { useSidebar } from "@workspace/ui/components/sidebar"
import { insertDocumentBlockFromDefinition } from "./definition"
import type { DocumentDefinition } from "./types"
import type { Editor } from "@tiptap/react"

type DocumentToolbarProps = {
  editor: Editor | null
  definition: DocumentDefinition
  onExport?: () => void
  onSend?: () => void
}

export function DocumentToolbar({
  editor,
  definition,
  onExport,
  onSend,
}: DocumentToolbarProps) {
  const { toggleSidebar } = useSidebar()

  const runAction = (actionId: string) => {
    if (!editor) return

    const action = definition.toolbarActions.find((item) => item.id === actionId)
    if (!action) return

    if (action.togglesSidebar) {
      toggleSidebar()
      return
    }

    if (action.command) {
      action.command(editor)
      return
    }

    if (action.blockId) {
      const block = definition.blocks.find((item) => item.id === action.blockId)
      if (!block) return

      insertDocumentBlockFromDefinition({ editor, definition, block })
    }
  }

  return (
    <TooltipProvider delay={0}>
      <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2">
        <div className="flex items-center gap-1 rounded-2xl border bg-background/80 p-1.5 shadow-2xl backdrop-blur-xl transition-all hover:bg-background">
          {definition.toolbarActions.map((action) => (
            <Tooltip key={action.id}>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => runAction(action.id)}
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
                  onClick={onSend}
                  size="icon-lg"
                  className="aspect-square h-10 w-10 gap-2 rounded-full"
                />
              }
            >
              <HugeiconsIcon icon={Share01Icon} className="h-4 w-4" />
            </TooltipTrigger>
            <TooltipContent side="top" className="rounded-lg font-medium">
              Send {definition.title}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  )
}
