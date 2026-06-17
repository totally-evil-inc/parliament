import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  Cancel01Icon,
  Image01Icon,
  LayoutGridIcon,
  LayoutTableIcon,
  QuillWrite02Icon,
  StarIcon,
  VideoReplayIcon,
} from "@hugeicons/core-free-icons"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  useSidebar,
} from "@workspace/ui/components/sidebar"
import { cn } from "@workspace/ui/lib/utils"
import type { JSONContent } from "@tiptap/core"
import type { Editor } from "@tiptap/react"

import { insertProposalBlock } from "@/features/proposals/utils/insert-proposal-block"

type LayoutOption = {
  name: string
  description: string
  type: string
  attrs?: JSONContent["attrs"]
  preview: React.ReactNode
}

type Category = {
  id: string
  name: string
  icon: any
  preview: React.ReactNode
  layouts: Array<LayoutOption>
}

function MetricPreview({
  value,
  label,
  detail,
}: {
  value: string
  label: string
  detail?: boolean
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl bg-muted/35 p-2 text-center">
      <span className="text-sm leading-none font-black text-muted-foreground">
        {value}
      </span>
      <span className="mt-1 text-[8px] leading-none font-medium text-muted-foreground/80">
        {label}
      </span>
      {detail ? (
        <span className="mt-1.5 h-1 w-8 rounded-full bg-muted-foreground/20" />
      ) : null}
    </div>
  )
}

export function ProposalSidebar({ editor }: { editor: Editor | null }) {
  const { setOpen } = useSidebar()
  const [activeTab, setActiveTab] = React.useState<"all" | "my">("all")
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<
    string | null
  >(null)

  const categories = React.useMemo<Array<Category>>(
    () => [
      {
        id: "key-numbers",
        name: "Key Numbers",
        icon: StarIcon,
        preview: (
          <div className="mt-2 flex h-12 w-full gap-1.5">
            <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-border/30 bg-muted/60 p-1">
              <span className="text-[10px] leading-none font-bold text-muted-foreground/80">
                99%
              </span>
              <span className="mt-0.5 scale-75 text-[6px] leading-none text-muted-foreground/50">
                Stat
              </span>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-border/30 bg-muted/60 p-1">
              <span className="text-[10px] leading-none font-bold text-muted-foreground/80">
                $10M
              </span>
              <span className="mt-0.5 scale-75 text-[6px] leading-none text-muted-foreground/50">
                Stat
              </span>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-border/30 bg-muted/60 p-1">
              <span className="text-[10px] leading-none font-bold text-muted-foreground/80">
                24/7
              </span>
              <span className="mt-0.5 scale-75 text-[6px] leading-none text-muted-foreground/50">
                Stat
              </span>
            </div>
          </div>
        ),
        layouts: [
          {
            name: "1-Column Metrics",
            description: "Feature one headline metric with supporting context",
            type: "keyNumbers",
            attrs: {
              columns: 1,
              metrics: [
                {
                  value: "99%",
                  label: "Projects Delivered",
                  detail: "Briefly explain what makes this result meaningful.",
                },
              ],
            },
            preview: (
              <div className="flex h-20 w-full items-center justify-center">
                <MetricPreview value="99%" label="Projects" detail />
              </div>
            ),
          },
          {
            name: "2-Column Metrics",
            description: "Compare two important numbers side by side",
            type: "keyNumbers",
            attrs: {
              columns: 2,
              metrics: [
                {
                  value: "99%",
                  label: "Projects Delivered",
                  detail: "Briefly explain what makes this result meaningful.",
                },
                {
                  value: "$10M",
                  label: "Managed budget",
                  detail: "Add muted context that supports this metric.",
                },
              ],
            },
            preview: (
              <div className="flex h-20 w-full gap-2.5">
                <MetricPreview value="99%" label="Projects" detail />
                <MetricPreview value="$10M" label="Budget" detail />
              </div>
            ),
          },
          {
            name: "3-Column Metrics",
            description: "Showcase three core metrics or KPIs in a clean grid",
            type: "keyNumbers",
            attrs: {
              columns: 3,
              metrics: [
                {
                  value: "150+",
                  label: "Projects Delivered",
                  detail: "Successfully completed across multiple industries",
                },
                {
                  value: "150+",
                  label: "Projects Delivered",
                  detail: "Successfully completed across multiple industries",
                },
                {
                  value: "24/7",
                  label: "Support coverage",
                  detail: "Describe the promise, impact, or scope behind it.",
                },
              ],
            },
            preview: (
              <div className="flex h-20 w-full gap-2.5">
                <MetricPreview value="150+" label="Projects" detail />
                <MetricPreview value="150+" label="Projects" detail />
                <MetricPreview value="24/7" label="Support" detail />
              </div>
            ),
          },
        ],
      },
      {
        id: "team-members",
        name: "Team Members",
        icon: StarIcon,
        preview: (
          <div className="mt-2 flex h-12 w-full items-center justify-center gap-4">
            <div className="flex flex-col items-center gap-1">
              <div className="h-5 w-5 rounded-full border border-border/30 bg-muted/70" />
              <div className="h-1 w-6 rounded-full bg-muted/40" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="h-5 w-5 rounded-full border border-border/30 bg-muted/70" />
              <div className="h-1 w-6 rounded-full bg-muted/40" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="h-5 w-5 rounded-full border border-border/30 bg-muted/70" />
              <div className="h-1 w-6 rounded-full bg-muted/40" />
            </div>
          </div>
        ),
        layouts: [
          {
            name: "Team Grid Layout",
            description: "Display your core team members with profile cards",
            type: "teamMembers",
            preview: (
              <div className="flex h-20 w-full items-center justify-around gap-2 px-2">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="h-8 w-8 rounded-full border border-border/40 bg-muted/60 shadow-sm" />
                  <div className="h-1.5 w-10 rounded-full bg-muted/40" />
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <div className="h-8 w-8 rounded-full border border-border/40 bg-muted/60 shadow-sm" />
                  <div className="h-1.5 w-10 rounded-full bg-muted/40" />
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <div className="h-8 w-8 rounded-full border border-border/40 bg-muted/60 shadow-sm" />
                  <div className="h-1.5 w-10 rounded-full bg-muted/40" />
                </div>
              </div>
            ),
          },
        ],
      },
      {
        id: "testimonials",
        name: "Testimonials",
        icon: QuillWrite02Icon,
        preview: (
          <div className="mt-2 flex h-12 w-full items-center gap-2">
            <div className="flex flex-1 flex-col gap-1 rounded-lg border border-border/30 bg-muted/60 p-1.5">
              <div className="flex gap-0.5">
                <span className="text-[6px] text-yellow-500">★</span>
                <span className="text-[6px] text-yellow-500">★</span>
                <span className="text-[6px] text-yellow-500">★</span>
              </div>
              <div className="h-1 w-full rounded-full bg-muted/45" />
              <div className="h-1 w-3/4 rounded-full bg-muted/45" />
            </div>
            <div className="flex flex-1 flex-col gap-1 rounded-lg border border-border/30 bg-muted/60 p-1.5">
              <div className="flex gap-0.5">
                <span className="text-[6px] text-yellow-500">★</span>
                <span className="text-[6px] text-yellow-500">★</span>
                <span className="text-[6px] text-yellow-500">★</span>
              </div>
              <div className="h-1 w-full rounded-full bg-muted/45" />
              <div className="h-1 w-3/4 rounded-full bg-muted/45" />
            </div>
          </div>
        ),
        layouts: [
          {
            name: "Testimonial Cards",
            description:
              "Showcase client testimonials and feedback with ratings",
            type: "testimonials",
            preview: (
              <div className="flex h-20 w-full items-center gap-3">
                <div className="flex flex-1 flex-col gap-1.5 rounded-xl border border-border/40 bg-muted/50 p-2 shadow-sm">
                  <div className="flex gap-0.5 text-[8px] text-yellow-500">
                    <span>★</span>
                    <span>★</span>
                    <span>★</span>
                    <span>★</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted/40" />
                  <div className="h-1.5 w-2/3 rounded-full bg-muted/40" />
                </div>
                <div className="flex flex-1 flex-col gap-1.5 rounded-xl border border-border/40 bg-muted/50 p-2 shadow-sm">
                  <div className="flex gap-0.5 text-[8px] text-yellow-500">
                    <span>★</span>
                    <span>★</span>
                    <span>★</span>
                    <span>★</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted/40" />
                  <div className="h-1.5 w-2/3 rounded-full bg-muted/40" />
                </div>
              </div>
            ),
          },
        ],
      },
      {
        id: "gallery",
        name: "Gallery",
        icon: Image01Icon,
        preview: (
          <div className="mt-2 grid h-12 w-full grid-cols-3 gap-1">
            <div className="col-span-2 rounded-lg border border-border/30 bg-muted/65" />
            <div className="flex flex-col gap-1">
              <div className="flex-1 rounded-lg border border-border/30 bg-muted/60" />
              <div className="flex-1 rounded-lg border border-border/30 bg-muted/60" />
            </div>
          </div>
        ),
        layouts: [
          {
            name: "Grid Layout Gallery",
            description:
              "A beautiful staggered grid layout for case studies and media",
            type: "gallery",
            preview: (
              <div className="grid h-20 w-full grid-cols-3 gap-1.5">
                <div className="col-span-2 rounded-xl border border-border/40 bg-muted/50 shadow-sm" />
                <div className="flex flex-col gap-1.5">
                  <div className="flex-1 rounded-xl border border-border/40 bg-muted/50 shadow-sm" />
                  <div className="flex-1 rounded-xl border border-border/40 bg-muted/50 shadow-sm" />
                </div>
              </div>
            ),
          },
        ],
      },
      {
        id: "timeline",
        name: "Goals & Timeline",
        icon: VideoReplayIcon,
        preview: (
          <div className="mt-2 flex h-12 w-full flex-col justify-center gap-2 px-3">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-primary/70" />
              <div className="h-1 w-full rounded-full bg-muted/50" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
              <div className="h-1 w-2/3 rounded-full bg-muted/50" />
            </div>
          </div>
        ),
        layouts: [
          {
            name: "Project Timeline",
            description: "Deliverables checklist and phase progression dates",
            type: "timeline",
            preview: (
              <div className="flex h-20 w-full flex-col justify-center gap-2 px-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary/80" />
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="h-2 w-3/4 rounded-full bg-muted/40" />
                    <div className="h-1 w-1/2 rounded-full bg-muted/30" />
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary/80" />
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="h-2 w-2/3 rounded-full bg-muted/40" />
                    <div className="h-1 w-1/3 rounded-full bg-muted/30" />
                  </div>
                </div>
              </div>
            ),
          },
        ],
      },
      {
        id: "pricing",
        name: "Pricing Table",
        icon: LayoutTableIcon,
        preview: (
          <div className="mt-2 flex h-12 w-full flex-col justify-center gap-1 rounded-lg border border-border/25 bg-muted/30 p-1.5">
            <div className="flex gap-1 border-b border-border/20 pb-0.5">
              <div className="h-1.5 flex-1 rounded-full bg-muted/65" />
              <div className="h-1.5 flex-1 rounded-full bg-muted/65" />
            </div>
            <div className="mt-0.5 flex gap-1">
              <div className="h-1 flex-1 rounded-full bg-muted/50" />
              <div className="h-1 flex-1 rounded-full bg-muted/50" />
            </div>
            <div className="flex gap-1">
              <div className="h-1 flex-1 rounded-full bg-muted/50" />
              <div className="h-1 flex-1 rounded-full bg-muted/50" />
            </div>
          </div>
        ),
        layouts: [
          {
            name: "Pricing Comparison Table",
            description:
              "Compare plans, rates, pricing, and scope list features",
            type: "pricingTable",
            preview: (
              <div className="flex h-20 w-full flex-col justify-center gap-1.5 rounded-xl border border-border/40 bg-muted/20 p-2.5 shadow-sm">
                <div className="flex gap-2 border-b border-border/30 pb-1.5">
                  <div className="h-2 flex-1 rounded-full bg-muted/50" />
                  <div className="h-2 flex-1 rounded-full bg-muted/50" />
                </div>
                <div className="flex gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-muted/40" />
                  <div className="h-1.5 flex-1 rounded-full bg-muted/40" />
                </div>
                <div className="flex gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-muted/40" />
                  <div className="h-1.5 flex-1 rounded-full bg-muted/40" />
                </div>
              </div>
            ),
          },
        ],
      },
    ],
    []
  )

  const selectedCategory = React.useMemo(() => {
    return categories.find((c) => c.id === selectedCategoryId)
  }, [categories, selectedCategoryId])

  const handleInsertLayout = (layout: LayoutOption) => {
    if (!editor) return

    switch (layout.type) {
      case "keyNumbers":
        insertProposalBlock(editor, { type: "keyNumbers", attrs: layout.attrs })
        break
      case "teamMembers":
        insertProposalBlock(editor, { type: "teamMembers" })
        break
      case "testimonials":
        insertProposalBlock(editor, { type: "testimonials" })
        break
      case "gallery":
        insertProposalBlock(editor, { type: "gallery" })
        break
      case "timeline":
        insertProposalBlock(editor, { type: "timeline" })
        break
      case "pricingTable":
        insertProposalBlock(editor, { type: "pricingTable" })
        break
    }
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
      {selectedCategory ? (
        // DETAIL VIEW
        <>
          <SidebarHeader className="flex shrink-0 flex-row items-center justify-between gap-3 border-b border-border/70 px-4 py-4">
            <button
              onClick={() => setSelectedCategoryId(null)}
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
                {selectedCategory.name}
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
                  Select a layout structure to insert into your proposal.
                </div>
                <div className="space-y-3">
                  {selectedCategory.layouts.map((layout, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleInsertLayout(layout)}
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
        // CATEGORIES LIST VIEW
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
            {/* Tabs Segmented Control */}
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
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategoryId(category.id)}
                      className="group w-full rounded-xl border border-border/60 bg-background/50 p-3 text-left shadow-xs transition-all hover:border-border hover:bg-accent/40"
                    >
                      <div className="flex w-full items-center justify-between">
                        <div className="flex items-center gap-2">
                          <HugeiconsIcon
                            icon={category.icon}
                            className="h-4 w-4 text-muted-foreground"
                          />
                          <span className="text-sm font-bold text-foreground">
                            {category.name}
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
                        {category.preview}
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
                    Save customized sections from your proposals to access them
                    here.
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
