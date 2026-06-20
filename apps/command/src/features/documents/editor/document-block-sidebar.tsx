import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  Cancel01Icon,
  LayoutGridIcon,
} from "@hugeicons/core-free-icons"
import { ColorPicker } from "@workspace/ui/components/color-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { useSidebar } from "@workspace/ui/components/sidebar"
import { cn } from "@workspace/ui/lib/utils"
import { insertDocumentBlockFromDefinition } from "./definition"
import {
  documentHeaderLayouts,
  isDocumentHeaderLayoutId,
} from "./header-layouts"
import {
  documentColorTokenOptions,
  documentFontOptions,
  documentRadiusOptions,
  documentSpacingOptions,
  updateDocumentTemplateToken,
} from "./templates"
import type {
  DocumentBlockDefinition,
  DocumentDefinition,
  DocumentHeaderLayoutId,
  DocumentTemplate,
  DocumentTemplateTokens,
  InsertableDocumentBlockDefinition,
  SingletonDocumentBlockDefinition,
} from "./types"
import type { Editor } from "@tiptap/react"

type SidebarPanel = "customize" | "blocks"

type DocumentBlockSidebarProps = {
  editor: Editor | null
  definition: DocumentDefinition
  defaultTemplate: DocumentTemplate
  template: DocumentTemplate
  onTemplateChange: (template: DocumentTemplate) => void
  onTemplateReset: () => void
}

export function DocumentBlockSidebar({
  editor,
  definition,
  defaultTemplate,
  template,
  onTemplateChange,
  onTemplateReset,
}: DocumentBlockSidebarProps) {
  const { isMobile, open, openMobile, setOpen, setOpenMobile } = useSidebar()
  const [activePanel, setActivePanel] =
    React.useState<SidebarPanel>("customize")
  const [selectedBlockId, setSelectedBlockId] = React.useState<string | null>(
    null
  )
  const [headerLayoutState, setHeaderLayoutState] = React.useState<{
    editor: Editor | null
    override: DocumentHeaderLayoutId | null
  }>({ editor, override: null })

  let headerLayout = headerLayoutState.override ?? getHeaderLayout(editor)

  if (headerLayoutState.editor !== editor) {
    headerLayout = getHeaderLayout(editor)
    setHeaderLayoutState({ editor, override: null })
  }

  const blocks = React.useMemo(
    () =>
      definition.blocks.filter(
        (block) => block.kind !== "action" && block.showInSidebar
      ),
    [definition.blocks]
  )

  const selectedBlock = React.useMemo(() => {
    return blocks.find((block) => block.id === selectedBlockId)
  }, [blocks, selectedBlockId])

  const handleInsertLayout = (
    block: InsertableDocumentBlockDefinition | SingletonDocumentBlockDefinition,
    layoutId?: string
  ) => {
    if (!editor) return

    const layout = block.layouts?.find((item) => item.id === layoutId)
    insertDocumentBlockFromDefinition({ editor, definition, block, layout })
  }

  const handleSelectBlock = (block: DocumentBlockDefinition) => {
    if (block.kind === "action") return

    if (!block.layouts?.length) {
      handleInsertLayout(block)
      return
    }

    setSelectedBlockId(block.id)
  }

  const updateToken = <TKey extends keyof DocumentTemplateTokens>(
    key: TKey,
    value: DocumentTemplateTokens[TKey]
  ) => {
    onTemplateChange(updateDocumentTemplateToken(template, key, value))
  }

  const openPanel = (panel: SidebarPanel) => {
    setActivePanel(panel)
    setSelectedBlockId(null)
  }

  const updateHeaderLayout = (layout: DocumentHeaderLayoutId) => {
    setHeaderLayoutState({ editor, override: layout })
    updateDocumentHeaderLayout(editor, layout)
  }

  const visible = isMobile ? openMobile : open
  const closeSidebar = () => {
    if (isMobile) {
      setOpenMobile(false)
      return
    }

    setOpen(false)
  }

  return (
    <aside
      aria-hidden={!visible}
      className={cn(
        "absolute inset-y-0 right-0 z-30 flex w-[min(var(--sidebar-width),calc(100%-1rem))] overflow-hidden p-3 text-foreground transition-[opacity,transform] duration-200 ease-linear md:relative md:z-auto md:w-(--sidebar-width) md:shrink-0 md:transition-[width,padding,opacity]",
        visible
          ? "translate-x-0 opacity-100"
          : "pointer-events-none translate-x-full opacity-0 md:w-0 md:translate-x-0 md:p-0"
      )}
    >
      <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-background/95 shadow-2xl backdrop-blur-xl">
        {selectedBlock && selectedBlock.kind !== "action" ? (
          <>
            <div className="flex shrink-0 flex-row items-center justify-between gap-3 border-b border-border/70 px-4 py-4">
              <button
                type="button"
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
                type="button"
                onClick={closeSidebar}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
              </button>
            </div>

            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden p-4">
              <ScrollArea className="relative min-h-0 flex-1 overflow-hidden">
                <div className="space-y-4">
                  <div className="px-1 text-xs text-muted-foreground/85">
                    Select a layout structure to insert into your{" "}
                    {definition.title.toLowerCase()}.
                  </div>
                  <div className="space-y-3">
                    {selectedBlock.layouts?.map((layout) => (
                      <button
                        type="button"
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
            </div>
          </>
        ) : (
          <>
            <div className="flex shrink-0 flex-col gap-3 border-b border-border/70 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <HugeiconsIcon icon={LayoutGridIcon} className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-bold">
                    {definition.title} Builder
                  </span>
                </div>
                <button
                  type="button"
                  onClick={closeSidebar}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground"
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
                </button>
              </div>
              <div className="flex rounded-xl border border-border/15 bg-muted/65 p-1">
                <SidebarTabButton
                  active={activePanel === "customize"}
                  onClick={() => openPanel("customize")}
                >
                  Customize
                </SidebarTabButton>
                <SidebarTabButton
                  active={activePanel === "blocks"}
                  onClick={() => openPanel("blocks")}
                >
                  Blocks
                </SidebarTabButton>
              </div>
            </div>

            <div className="relative flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4">
              {activePanel === "customize" ? (
                <DesignPanel
                  defaultTemplate={defaultTemplate}
                  headerLayout={headerLayout}
                  template={template}
                  onHeaderLayoutChange={updateHeaderLayout}
                  onReset={onTemplateReset}
                  onTokenChange={updateToken}
                />
              ) : (
                <BlocksPanel
                  blocks={blocks}
                  onSelectBlock={handleSelectBlock}
                />
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  )
}

function SidebarTabButton({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  )
}

function BlocksPanel({
  blocks,
  onSelectBlock,
}: {
  blocks: Array<DocumentBlockDefinition>
  onSelectBlock: (block: DocumentBlockDefinition) => void
}) {
  return (
    <ScrollArea className="relative min-h-0 flex-1 px-4">
      <div className="grid grid-cols-1 gap-3 pb-4">
        {blocks.map((block) => (
          <button
            type="button"
            key={block.id}
            onClick={() => onSelectBlock(block)}
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
    </ScrollArea>
  )
}

function DesignPanel({
  defaultTemplate,
  headerLayout,
  template,
  onHeaderLayoutChange,
  onReset,
  onTokenChange,
}: {
  defaultTemplate: DocumentTemplate
  headerLayout: DocumentHeaderLayoutId
  template: DocumentTemplate
  onHeaderLayoutChange: (layout: DocumentHeaderLayoutId) => void
  onReset: () => void
  onTokenChange: <TKey extends keyof DocumentTemplateTokens>(
    key: TKey,
    value: DocumentTemplateTokens[TKey]
  ) => void
}) {
  return (
    <ScrollArea className="relative min-h-0 flex-1 px-1">
      <div className="space-y-6 pb-4">
        <div className="flex items-center justify-between gap-3 px-1">
          <div>
            <h3 className="text-sm font-bold text-foreground">Customize</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {template.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onReset}
            className="rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Reset
          </button>
        </div>

        <DesignSection title="Colors">
          <div className="space-y-3">
            {documentColorTokenOptions.map((option) => (
              <ColorTokenField
                key={option.key}
                colors={option.colors}
                label={option.label}
                value={template.tokens[option.key]}
                onChange={(value) => onTokenChange(option.key, value)}
              />
            ))}
          </div>
        </DesignSection>

        <DesignSection title="Header layout">
          <div className="grid grid-cols-2 gap-2">
            {documentHeaderLayouts.map((layout) => (
              <button
                key={layout.id}
                type="button"
                onClick={() => onHeaderLayoutChange(layout.id)}
                className={cn(
                  "rounded-lg border p-2 text-left transition-colors hover:bg-muted/50",
                  headerLayout === layout.id
                    ? "border-primary bg-primary/10"
                    : "border-border/60 bg-background/50"
                )}
              >
                <HeaderLayoutPreview layout={layout.id} />
                <div className="mt-2 text-xs font-semibold text-foreground">
                  {layout.name}
                </div>
                <div className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                  {layout.description}
                </div>
              </button>
            ))}
          </div>
        </DesignSection>

        <DesignSection title="Typography">
          <SelectTokenField
            label="Body font"
            value={template.tokens.fontFamily}
            onChange={(value) => onTokenChange("fontFamily", value)}
            options={documentFontOptions}
          />
          <SelectTokenField
            label="Heading font"
            value={template.tokens.headingFontFamily}
            onChange={(value) => onTokenChange("headingFontFamily", value)}
            options={documentFontOptions}
          />
        </DesignSection>

        <DesignSection title="Layout">
          <SelectTokenField
            label="Spacing"
            value={template.tokens.spacingScale}
            onChange={(value) => onTokenChange("spacingScale", value)}
            options={documentSpacingOptions}
          />
          <SelectTokenField
            label="Radius"
            value={template.tokens.radius}
            onChange={(value) => onTokenChange("radius", value)}
            options={documentRadiusOptions}
          />
        </DesignSection>

        <div className="rounded-xl border border-border/60 bg-background/50 p-3">
          <div className="text-xs font-semibold text-foreground">
            Default template
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Reset restores {defaultTemplate.name}.
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}

const HEADER_PREVIEW_LOGO = (
  <div className="h-4 w-7 rounded-sm border border-current/25" />
)
const HEADER_PREVIEW_TITLE = (
  <div className="h-2 w-14 rounded-full bg-current" />
)
const HEADER_PREVIEW_SHORT_TITLE = (
  <div className="h-2 w-10 rounded-full bg-current" />
)
const HEADER_PREVIEW_DATES = (
  <div className="grid justify-items-end gap-1">
    <div className="h-1 w-8 rounded-full bg-current/45" />
    <div className="h-1 w-8 rounded-full bg-current/30" />
  </div>
)
const HEADER_PREVIEW_CENTERED_DATES = (
  <div className="flex justify-center gap-1">
    <div className="h-1 w-8 rounded-full bg-current/45" />
    <div className="h-1 w-8 rounded-full bg-current/30" />
  </div>
)
const HEADER_PREVIEW_LEFT_DATES = (
  <div className="flex justify-start gap-1">
    <div className="h-1 w-8 rounded-full bg-current/45" />
    <div className="h-1 w-8 rounded-full bg-current/30" />
  </div>
)

function HeaderLayoutPreview({ layout }: { layout: DocumentHeaderLayoutId }) {
  if (layout === "centered-stack") {
    return (
      <div className="flex h-14 flex-col items-center justify-center gap-2 text-muted-foreground">
        {HEADER_PREVIEW_LOGO}
        {HEADER_PREVIEW_CENTERED_DATES}
        {HEADER_PREVIEW_TITLE}
      </div>
    )
  }

  if (layout === "left-stack") {
    return (
      <div className="flex h-14 flex-col items-start justify-center gap-2 text-muted-foreground">
        {HEADER_PREVIEW_LOGO}
        {HEADER_PREVIEW_TITLE}
        {HEADER_PREVIEW_LEFT_DATES}
      </div>
    )
  }

  if (layout === "editorial-band") {
    return (
      <div className="flex h-14 flex-col justify-center gap-2 text-muted-foreground">
        <div className="flex justify-between">
          {HEADER_PREVIEW_LOGO}
          {HEADER_PREVIEW_DATES}
        </div>
        <div className="flex justify-center">{HEADER_PREVIEW_TITLE}</div>
      </div>
    )
  }

  return (
    <div className="grid h-14 grid-cols-[1fr_auto] items-start gap-2 text-muted-foreground">
      <div className="flex flex-col items-start gap-2">
        {HEADER_PREVIEW_LOGO}
        {HEADER_PREVIEW_SHORT_TITLE}
      </div>
      {HEADER_PREVIEW_DATES}
    </div>
  )
}

function DesignSection({
  children,
  title,
}: {
  children: React.ReactNode
  title: string
}) {
  return (
    <section className="space-y-3">
      <h4 className="px-1 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
        {title}
      </h4>
      <div className="space-y-3 rounded-xl border border-border/60 bg-background/50 p-3">
        {children}
      </div>
    </section>
  )
}

function ColorTokenField({
  colors,
  label,
  value,
  onChange,
}: {
  colors: ReadonlyArray<string>
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="grid grid-cols-[minmax(0,1fr)_minmax(0,8.5rem)] items-center gap-3">
      <span className="text-xs font-medium text-foreground">{label}</span>
      <ColorPicker
        colors={colors}
        label={label}
        value={value}
        onValueChange={onChange}
      />
    </label>
  )
}

function SelectTokenField<TValue extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: ReadonlyArray<{ value: TValue; label: string }>
  value: TValue
  onChange: (value: TValue) => void
}) {
  return (
    <label className="grid grid-cols-[minmax(0,1fr)_8.5rem] items-center gap-3">
      <span className="text-xs font-medium text-foreground">{label}</span>
      <Select
        value={value}
        onValueChange={(nextValue) => {
          if (nextValue !== null) {
            onChange(nextValue)
          }
        }}
      >
        <SelectTrigger size="sm" className="h-7 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}

function getHeaderLayout(editor: Editor | null): DocumentHeaderLayoutId {
  if (!editor) return "mark-left-dates-right"

  const header = editor
    .getJSON()
    .content.find((node) => node.type === "documentHeader")
  const layout = header?.attrs?.headerLayout

  return isDocumentHeaderLayoutId(layout) ? layout : "mark-left-dates-right"
}

function updateDocumentHeaderLayout(
  editor: Editor | null,
  layout: DocumentHeaderLayoutId
) {
  if (!editor) return

  editor
    .chain()
    .focus()
    .command(({ dispatch, state, tr }) => {
      let position = 0

      for (let index = 0; index < state.doc.childCount; index += 1) {
        const child = state.doc.child(index)

        if (child.type.name === "documentHeader") {
          tr.setNodeMarkup(position, undefined, {
            ...child.attrs,
            headerLayout: layout,
          })
          dispatch?.(tr)
          return true
        }

        position += child.nodeSize
      }

      return false
    })
    .run()
}
