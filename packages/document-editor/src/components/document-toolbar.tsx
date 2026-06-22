import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@workspace/ui/components/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { useDocumentSidebar } from "../runtime/sidebar-context"
import { insertDocumentBlockFromDefinition } from "../core/definition"
import type { DocumentBlockDefinition, DocumentDefinition } from "../core/types"
import type { Editor } from "@tiptap/react"

import { useDocumentEditorHost } from "../runtime/react"

type DocumentToolbarProps = {
  editor: Editor | null
  definition: DocumentDefinition
  onAction?: (actionId: string) => void | Promise<void>
}

export function DocumentToolbar({
  editor,
  definition,
  onAction,
}: DocumentToolbarProps) {
  const { setOpenMobile, toggleSidebar } = useDocumentSidebar()
  const host = useDocumentEditorHost()

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

    const action = definition.toolbarActions.find(
      (item) => item.id === actionId
    )
    if (!action) return

    if (action.hostAction) {
      void (onAction ?? host.onAction)?.(action.id)
      return
    }

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
      <div className="fixed bottom-6 left-1/2 z-50 hidden -translate-x-1/2 items-center gap-2 md:flex">
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
      <MobileCompactDock
        definition={definition}
        onAction={onAction ?? host.onAction}
        openDrawer={() => setOpenMobile(true)}
      />
    </TooltipProvider>
  )
}

function MobileCompactDock({
  definition,
  openDrawer,
  onAction,
}: {
  definition: DocumentDefinition
  openDrawer: () => void
  onAction?: (actionId: string) => void | Promise<void>
}) {
  const compactActions = definition.toolbarActions.filter(
    (action) => action.togglesSidebar || action.id === "export"
  )

  const handleAction = (actionId: string) => {
    const action = definition.toolbarActions.find((a) => a.id === actionId)
    if (!action) return

    if (action.togglesSidebar) {
      openDrawer()
      return
    }

    if (action.hostAction) {
      void onAction?.(action.id)
    }
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 md:hidden">
      <div className="flex items-center gap-1 rounded-2xl border bg-background/80 p-1.5 shadow-2xl backdrop-blur-xl">
        {compactActions.map((action) => (
          <Button
            key={action.id}
            variant="ghost"
            size="icon"
            onClick={() => handleAction(action.id)}
            className="h-9 w-9 rounded-xl hover:bg-accent hover:text-accent-foreground"
          >
            <HugeiconsIcon icon={action.icon} className="h-4 w-4" />
            <span className="sr-only">{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}
