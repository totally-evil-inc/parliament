import type { Editor } from "@tiptap/react"
import { Button } from "@workspace/ui/components/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"
import { insertDocumentBlockFromDefinition } from "../core/definition"
import type {
  DocumentBlockDefinition,
  DocumentDefinition,
  DocumentToolbarAction,
} from "../core/types"
import { useOptionalDocumentEditorHost } from "../runtime/react"
import { useDocumentSidebar } from "../runtime/sidebar-context"

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
  const host = useOptionalDocumentEditorHost()

  const runBlock = (block: DocumentBlockDefinition) => {
    if (!editor) return

    if (block.kind === "action") {
      block.command(editor)
      return
    }

    insertDocumentBlockFromDefinition({ editor, definition, block })
  }

  const runAction = (actionId: string) => {
    const action = definition?.toolbarActions?.find(
      (item) => item.id === actionId
    )
    if (!action) return

    if (action.hostAction) {
      void (onAction ?? host?.onAction)?.(action.id)
      return
    }

    if (action.togglesSidebar) {
      toggleSidebar()
      return
    }

    if (!editor) return

    if (action.command) {
      action.command(editor)
      return
    }

    if (action.blockId) {
      const block = definition.blocks?.find(
        (item) => item.id === action.blockId
      )
      if (!block) return

      runBlock(block)
    }
  }

  const blockActions = (definition?.toolbarActions ?? []).filter(
    (action) => !action.togglesSidebar && !action.hostAction
  )
  const layoutActions = (definition?.toolbarActions ?? []).filter(
    (action) => action.togglesSidebar
  )
  const hostActions = (definition?.toolbarActions ?? []).filter(
    (action) => action.hostAction
  )

  const renderAction = (action: DocumentToolbarAction) => {
    const isPrimary = action.variant === "default" || action.id === "send"
    const Icon = action.icon

    return (
      <Tooltip key={action.id}>
        <TooltipTrigger
          render={
            <Button
              variant={action.variant ?? (isPrimary ? "default" : "ghost")}
              size="icon"
              onClick={() => runAction(action.id)}
              className={cn(
                "h-9 w-9 rounded-full",
                isPrimary
                  ? "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            />
          }
        >
          {Icon ? <Icon className="pointer-events-none h-4 w-4" /> : null}
          <span className="sr-only">{action.label}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="rounded-lg font-medium">
          {action.label}
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <TooltipProvider delay={0}>
      {/* Desktop Toolbar Dock */}
      <div className="fixed bottom-6 left-1/2 z-50 hidden -translate-x-1/2 items-center md:flex">
        <div
          role="toolbar"
          aria-label="Document formatting and action toolbar"
          className="flex items-center gap-1 rounded-full border border-border bg-background/95 p-1.5 shadow-lg backdrop-blur-md"
        >
          {/* Block insert & format actions */}
          {blockActions.map(renderAction)}

          {/* Divider between blocks and layout */}
          {layoutActions.length > 0 && blockActions.length > 0 && (
            <div className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
          )}

          {/* Layout action */}
          {layoutActions.map(renderAction)}

          {/* Divider between layout/blocks and host actions */}
          {hostActions.length > 0 &&
            (blockActions.length > 0 || layoutActions.length > 0) && (
              <div className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
            )}

          {/* Host actions (Export, Send) */}
          {hostActions.map(renderAction)}
        </div>
      </div>

      {/* Mobile Compact Toolbar Dock */}
      <MobileCompactDock
        definition={definition}
        onAction={onAction ?? host?.onAction}
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
  const compactActions = (definition?.toolbarActions ?? []).filter(
    (action) => action.togglesSidebar || action.hostAction
  )

  const handleAction = (actionId: string) => {
    const action = definition?.toolbarActions?.find((a) => a.id === actionId)
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
      <div
        role="toolbar"
        aria-label="Mobile document toolbar"
        className="flex items-center gap-1 rounded-full border border-border bg-background/95 p-1.5 shadow-lg backdrop-blur-md"
      >
        {compactActions.map((action) => {
          const isPrimary = action.variant === "default" || action.id === "send"
          const Icon = action.icon
          return (
            <Button
              key={action.id}
              variant={action.variant ?? (isPrimary ? "default" : "ghost")}
              size="icon"
              onClick={() => handleAction(action.id)}
              className={cn(
                "h-9 w-9 rounded-full",
                isPrimary
                  ? "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {Icon ? <Icon className="pointer-events-none h-4 w-4" /> : null}
              <span className="sr-only">{action.label}</span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
