import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  Cancel01Icon,
  LayoutGridIcon,
  StarIcon,
} from "@hugeicons/core-free-icons"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  useSidebar,
} from "@workspace/ui/components/sidebar"
import { cn } from "@workspace/ui/lib/utils"
import { insertDocumentBlockFromDefinition } from "./definition"
import type { DocumentBlockDefinition, DocumentDefinition } from "./types"
import type { Editor } from "@tiptap/react"

type DocumentBlockSidebarProps = {
  editor: Editor | null
  definition: DocumentDefinition
}

export function DocumentBlockSidebar({
  editor,
  definition,
}: DocumentBlockSidebarProps) {
  const { setOpen } = useSidebar()
  const [activeTab, setActiveTab] = React.useState<"all" | "my">("all")
  const [selectedBlockId, setSelectedBlockId] = React.useState<string | null>(
    null
  )

  const blocks = React.useMemo(
    () => definition.blocks.filter((block) => block.showInSidebar),
    [definition.blocks]
  )

  const selectedBlock = React.useMemo(() => {
    return blocks.find((block) => block.id === selectedBlockId)
  }, [blocks, selectedBlockId])

  const handleInsertLayout = (
    block: DocumentBlockDefinition,
    layoutId?: string
  ) => {
    if (!editor) return

    const layout = block.layouts?.find((item) => item.id === layoutId)
    insertDocumentBlockFromDefinition({ editor, definition, block, layout })
  }

  return (
    <Sidebar
      side="right"
      variant="floating"
      collapsible="offcanvas"
      className={cn(
        "absolute! h-full p-3!",
        "*:data-[sidebar=sidebar]:rounded-xl *:data-[sidebar=sidebar]:border *:data-[sidebar=sidebar]:border-border/70",
        "*:data-[sidebar=sidebar]:bg-background/95 *:data-[sidebar=sidebar]:shadow-2xl *:data-[sidebar=sidebar]:backdrop-blur-xl"
      )}
    >
      {selectedBlock ? (
        <>
          <SidebarHeader className="flex shrink-0 flex-row items-center justify-between gap-3 border-b border-border/70 px-4 py-4">
            <button
              onClick={() => setSelectedBlockId(null)}
              className="group/back flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <HugeiconsIcon
                icon={ArrowLeft01Icon}
                className="h-4 w-4 transition-transform group-hover/back:-translate-x-0.5"
              />
              Back
            </button>
            <div className="absolute left-1/2 -translate-x-1/2">
              <span className="text-sm font-semibold">
                {selectedBlock.label}
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
            </button>
          </SidebarHeader>

          <SidebarContent className="relative flex min-h-0 flex-col overflow-scroll p-4">
            <ScrollArea className="relative min-h-0 flex-1">
              <div className="space-y-4">
                <div className="px-1 text-xs text-muted-foreground/85">
                  Select a layout structure to insert into your{" "}
                  {definition.title.toLowerCase()}.
                </div>
                <div className="space-y-3">
                  {(selectedBlock.layouts ?? []).map((layout) => (
                    <button
                      key={layout.id}
                      onClick={() =>
                        handleInsertLayout(selectedBlock, layout.id)
                      }
                      className="group w-full rounded-xl border border-border/60 bg-background/50 p-3.5 text-left shadow-xs transition-all hover:border-border hover:bg-accent/40"
                    >
                      <div className="mb-3.5 rounded-lg border border-border/30 bg-muted/15 p-2 transition-all group-hover:bg-muted/25">
                        {layout.preview}
                      </div>
                      <h4 className="text-sm leading-none font-bold">
                        {layout.name}
                      </h4>
                      <p className="mt-1 text-xs leading-normal text-muted-foreground">
                        {layout.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </SidebarContent>
        </>
      ) : (
        <>
          <SidebarHeader className="flex shrink-0 flex-row items-center justify-between gap-3 border-b border-border/70 px-4 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                <HugeiconsIcon icon={LayoutGridIcon} className="h-4 w-4" />
              </div>
              <span className="text-sm font-bold">Section Blocks</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
            </button>
          </SidebarHeader>

          <SidebarContent className="relative flex min-h-0 flex-col gap-4 p-4">
            <div className="flex shrink-0 rounded-xl border border-border/15 bg-muted/65 p-1">
              <button
                onClick={() => setActiveTab("all")}
                className={cn(
                  "flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all",
                  activeTab === "all"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                All Blocks
              </button>
              <button
                onClick={() => setActiveTab("my")}
                className={cn(
                  "flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all",
                  activeTab === "my"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                My Blocks
              </button>
            </div>

            <ScrollArea className="relative min-h-0 flex-1 px-4">
              {activeTab === "all" ? (
                <div className="grid grid-cols-1 gap-3 pb-4">
                  {blocks.map((block) => (
                    <button
                      key={block.id}
                      onClick={() => setSelectedBlockId(block.id)}
                      className="group w-full rounded-xl border border-border/60 bg-background/50 p-3 text-left shadow-xs transition-all hover:border-border hover:bg-accent/40"
                    >
                      <div className="flex w-full items-center justify-between">
                        <div className="flex items-center gap-2">
                          <HugeiconsIcon
                            icon={block.icon}
                            className="h-4 w-4 text-muted-foreground"
                          />
                          <span className="text-sm font-bold text-foreground">
                            {block.label}
                          </span>
                        </div>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="2.5"
                          stroke="currentColor"
                          className="h-3.5 w-3.5 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-foreground"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8.25 4.5l7.5 7.5-7.5 7.5"
                          />
                        </svg>
                      </div>
                      <div className="mt-1.5 rounded-lg border border-border/30 bg-muted/15 p-2 transition-all group-hover:bg-muted/25">
                        {block.preview}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <HugeiconsIcon icon={StarIcon} className="h-4 w-4" />
                  </div>
                  <h4 className="text-xs font-semibold text-foreground">
                    Custom blocks feature coming soon.
                  </h4>
                  <p className="mt-1 max-w-40 text-[11px] leading-normal text-muted-foreground">
                    Save customized sections from your{" "}
                    {definition.title.toLowerCase()}s to access them here.
                  </p>
                </div>
              )}
            </ScrollArea>
          </SidebarContent>
        </>
      )}
    </Sidebar>
  )
}
