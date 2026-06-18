import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@workspace/ui/components/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { useSidebar } from "@workspace/ui/components/sidebar"
import { insertDocumentBlockFromDefinition } from "./definition"
import type { DocumentBlockDefinition, DocumentDefinition } from "./types"
import type { Editor } from "@tiptap/react"

type DocumentToolbarProps = {
  editor: Editor | null
  definition: DocumentDefinition
}

export function DocumentToolbar({
  editor,
  definition,
}: DocumentToolbarProps) {
  const { toggleSidebar } = useSidebar()

  const runBlock = (block: DocumentBlockDefinition) => {
    if (!editor) return

    if (block.kind === "action") {
      block.command(editor)
      return
    }

    insertDocumentBlockFromDefinition({ editor, definition, block })
  }

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

      runBlock(block)
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
      </div>
    </TooltipProvider>
  )
}
