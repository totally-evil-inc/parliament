import {
  AdjustmentsHorizontalIcon,
  BanknotesIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  EllipsisHorizontalIcon,
  ListBulletIcon,
  MagnifyingGlassIcon,
  NoSymbolIcon,
  PlusIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline"
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { formatDateOnly, formatMoneyMinor } from "@workspace/document/calculate"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Calendar } from "@workspace/ui/components/calendar"
import { Card } from "@workspace/ui/components/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { proposalDraftsQuery } from "@/api/proposals"
import { useConfirm } from "@/components/confirm-dialog-provider"
import { PageHeader } from "@/components/page-header"
import { useProposalsFilter } from "@/hooks/use-proposals-filter"
import { AppHeader } from "@/layouts/header-portal"
import { buildPublicLink } from "@/lib/public-links"
import type {
  PersistedProposalDraft,
  ProposalDraftListItem,
} from "@/server/proposals"
import { createProposalDraft, deleteProposalDraft } from "@/server/proposals"

export const Route = createFileRoute("/_workspace/proposals/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(proposalDraftsQuery)
  },
  component: ProposalsRoute,
})

function ProposalsRoute() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const { data: proposals } = useSuspenseQuery(proposalDraftsQuery)

  const {
    dateRange,
    setDateRange,
    searchQuery,
    setSearchQuery,
    filteredList,
    currentStats,
    trends,
    showTrend,
  } = useProposalsFilter(proposals)

  const createDraft = useMutation({
    mutationFn: () => createProposalDraft({ data: { blueprint: "classic" } }),
    onSuccess: async (draftResult) => {
      const draft = draftResult as PersistedProposalDraft
      await queryClient.invalidateQueries({ queryKey: ["proposals"] })
      await navigate({
        to: "/proposals/$proposalId",
        params: { proposalId: draft.id },
      })
    },
  })

  const deleteDraft = useMutation({
    mutationFn: (id: string) => deleteProposalDraft({ data: { id } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["proposals"] })
    },
  })

  // Monthly Grouping function
  const groupProposalsByMonth = (list: ProposalDraftListItem[]) => {
    const groups: {
      [key: string]: {
        monthName: string
        proposals: ProposalDraftListItem[]
        totalMinor: number
        currency: string
      }
    } = {}

    // Sort by issueDate descending
    const sorted = [...list].sort((a, b) => {
      const dateA = new Date(a.issueDate)
      const dateB = new Date(b.issueDate)
      if (dateB.getTime() !== dateA.getTime()) {
        return dateB.getTime() - dateA.getTime()
      }
      return b.updatedAt.localeCompare(a.updatedAt)
    })

    for (const p of sorted) {
      const date = new Date(p.issueDate)
      const monthName = date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })

      if (!groups[monthName]) {
        groups[monthName] = {
          monthName,
          proposals: [],
          totalMinor: 0,
          currency: p.currency || "USD",
        }
      }
      groups[monthName].proposals.push(p)
      groups[monthName].totalMinor += p.valueMinor
    }

    return Object.values(groups)
  }

  const groupedMonths = groupProposalsByMonth(filteredList)

  const formatValueNoDecimals = (valueMinor: number, currency: string) => {
    return formatMoneyMinor(valueMinor, currency, "en-US").replace(/\.00$/, "")
  }

  const getInitials = (name: string) => {
    if (!name) return "AC"
    const parts = name.split(" ")
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  const handleDelete = async (id: string, title: string) => {
    const isConfirmed = await confirm({
      title: "Delete proposal",
      description: `Are you sure you want to delete "${
        title || "Untitled proposal"
      }"? This action cannot be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "destructive",
    })

    if (isConfirmed) {
      deleteDraft.mutate(id)
    }
  }

  const renderTrendBadge = (val: number) => {
    if (!showTrend) return null
    const isNegative = val < 0
    const text = isNegative ? `${val}%` : `+${val}%`

    return (
      <Badge
        variant="outline"
        className={`ml-2 rounded px-1.5 py-0.5 font-bold text-[10px] ${
          isNegative
            ? "border-destructive/20 bg-destructive/10 text-destructive"
            : "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        }`}
      >
        {text}
      </Badge>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <AppHeader />
      <PageHeader
        title="Proposals"
        description="Track proposed value, acceptance and pipeline."
        action={
          <div className="flex items-center gap-3">
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    className="flex h-9 cursor-pointer items-center gap-2 rounded-lg text-xs"
                  />
                }
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {formatDateOnly(
                        dateRange.from.toISOString().split("T")[0],
                        "en-US"
                      )}{" "}
                      -{" "}
                      {formatDateOnly(
                        dateRange.to.toISOString().split("T")[0],
                        "en-US"
                      )}
                    </>
                  ) : (
                    formatDateOnly(
                      dateRange.from.toISOString().split("T")[0],
                      "en-US"
                    )
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            <Button
              type="button"
              className="flex h-9 cursor-pointer items-center gap-2 rounded-full px-4 py-2 font-semibold text-xs"
              onClick={() => createDraft.mutate()}
              disabled={createDraft.isPending}
            >
              <PlusIcon className="h-3.5 w-3.5" />
              {createDraft.isPending ? "Creating..." : "New Proposal"}
            </Button>
          </div>
        }
      />
      <ScrollArea className="min-h-0 flex-1">
        <div className="grid gap-6 bg-background p-6 text-foreground md:p-8">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {/* Card 1: Total Proposed */}
            <Card className="relative rounded-2xl border-border/80 bg-card p-5">
              <div className="flex items-start justify-between">
                <span className="font-medium text-muted-foreground text-xs">
                  Total Proposed
                </span>
                <div className="rounded-lg border border-border bg-muted/60 p-1.5 text-muted-foreground">
                  <BanknotesIcon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="font-semibold text-3xl text-foreground tracking-tight">
                  {formatValueNoDecimals(currentStats.proposedSum, "USD")}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {currentStats.proposedCount} proposals
                </span>
                {renderTrendBadge(trends.proposed)}
              </div>
            </Card>

            {/* Card 2: Accepted */}
            <Card className="relative rounded-2xl border-border/80 bg-card p-5">
              <div className="flex items-start justify-between">
                <span className="font-medium text-muted-foreground text-xs">
                  Accepted
                </span>
                <div className="rounded-lg border border-border bg-muted/60 p-1.5 text-muted-foreground">
                  <CheckCircleIcon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="font-semibold text-3xl text-foreground tracking-tight">
                  {formatValueNoDecimals(currentStats.acceptedSum, "USD")}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {currentStats.acceptedCount} accepted
                </span>
                {renderTrendBadge(trends.accepted)}
              </div>
            </Card>

            {/* Card 3: Pending */}
            <Card className="relative rounded-2xl border-border/80 bg-card p-5">
              <div className="flex items-start justify-between">
                <span className="font-medium text-muted-foreground text-xs">
                  Pending
                </span>
                <div className="rounded-lg border border-border bg-muted/60 p-1.5 text-muted-foreground">
                  <ClockIcon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="font-semibold text-3xl text-foreground tracking-tight">
                  {formatValueNoDecimals(currentStats.pendingSum, "USD")}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {currentStats.pendingCount} awaiting
                </span>
                {renderTrendBadge(trends.pending)}
              </div>
            </Card>

            {/* Card 4: Rejected */}
            <Card className="relative rounded-2xl border-border/80 bg-card p-5">
              <div className="flex items-start justify-between">
                <span className="font-medium text-muted-foreground text-xs">
                  Rejected
                </span>
                <div className="rounded-lg border border-border bg-muted/60 p-1.5 text-muted-foreground">
                  <NoSymbolIcon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="font-semibold text-3xl text-foreground tracking-tight">
                  {formatValueNoDecimals(currentStats.rejectedSum, "USD")}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {currentStats.rejectedCount} lost
                </span>
                {renderTrendBadge(trends.rejected)}
              </div>
            </Card>
          </div>

          {/* Proposals List Card Container */}
          <Card className="mt-2 overflow-hidden rounded-2xl border-border/80 bg-card p-6">
            {/* List Card Header */}
            <div className="mb-6 flex flex-col gap-4 border-border/50 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-foreground text-lg">
                  All proposals
                </h2>
                <p className="mt-1 text-muted-foreground text-xs">
                  {filteredList.length} of {proposals.length} shown
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {/* Layout Switcher */}
                <div className="flex items-center rounded-lg border border-border/80 bg-muted/50 p-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded bg-background text-foreground shadow-2xs"
                  >
                    <ListBulletIcon className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  >
                    <Squares2X2Icon className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Filters */}
                <Button
                  variant="outline"
                  className="h-8 cursor-pointer gap-1.5 rounded-lg text-xs"
                >
                  <AdjustmentsHorizontalIcon className="h-3.5 w-3.5" />
                  Filters
                </Button>

                {/* Search bar */}
                <div className="relative w-full sm:w-[220px]">
                  <MagnifyingGlassIcon className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 w-full pl-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Month Grouped Table View */}
            {groupedMonths.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                No proposals found.
              </div>
            ) : (
              <div className="space-y-8">
                {groupedMonths.map((group) => (
                  <div key={group.monthName} className="space-y-3">
                    {/* Month Header Grid */}
                    <div className="grid grid-cols-[48px_1fr_110px_110px_90px_100px_40px] items-center gap-4 border-border/60 border-b px-2 pb-2 font-semibold text-muted-foreground text-xs">
                      <div className="col-span-2 flex items-center gap-1.5">
                        <span className="font-bold text-foreground">
                          {group.monthName}
                        </span>
                        <span className="rounded-full bg-muted px-1.5 py-0.5 font-normal text-[10px] text-muted-foreground">
                          {group.proposals.length}
                        </span>
                      </div>
                      <div className="text-right">Created</div>
                      <div className="text-right">Valid</div>
                      <div className="text-right">Status</div>
                      <div className="text-right font-bold text-foreground">
                        {formatValueNoDecimals(
                          group.totalMinor,
                          group.currency
                        )}
                      </div>
                      <div></div>
                    </div>

                    {/* Month Rows */}
                    <div className="space-y-2">
                      {group.proposals.map((proposal) => (
                        <div
                          key={proposal.id}
                          className="grid grid-cols-[48px_1fr_110px_110px_90px_100px_40px] items-center gap-4 rounded-xl border border-border/40 bg-background/50 px-2 py-3 transition duration-150 hover:bg-muted/40"
                        >
                          {/* Initials Circle */}
                          <div className="flex h-9 w-9 select-none items-center justify-center rounded-full border border-border bg-muted font-semibold text-muted-foreground text-xs">
                            {getInitials(proposal.title)}
                          </div>

                          {/* Details */}
                          <div className="flex min-w-0 flex-col">
                            <Link
                              to="/proposals/$proposalId"
                              params={{ proposalId: proposal.id }}
                              className="truncate font-medium text-foreground text-sm transition-colors hover:text-primary"
                            >
                              {proposal.title || "Untitled proposal"}
                            </Link>
                            <div className="mt-1 flex min-w-0 items-center gap-2">
                              <span className="truncate text-muted-foreground text-xs">
                                {proposal.customerName || "Untitled client"}
                              </span>
                              <Badge
                                variant="outline"
                                className="rounded border-border bg-muted/50 px-1 py-0 text-[9px] text-muted-foreground"
                              >
                                Proposal
                              </Badge>
                            </div>
                          </div>

                          {/* Created Date */}
                          <div className="text-right text-muted-foreground text-xs">
                            {formatDateOnly(proposal.issueDate, "en-US")}
                          </div>

                          {/* Valid Until Date */}
                          <div className="text-right text-muted-foreground text-xs">
                            {proposal.validUntil
                              ? formatDateOnly(proposal.validUntil, "en-US")
                              : "—"}
                          </div>

                          {/* Status Badge */}
                          <div className="flex justify-end">
                            <Badge
                              variant="outline"
                              className={`rounded px-2 py-0.5 font-semibold text-[10px] uppercase tracking-wider ${
                                proposal.status === "accepted"
                                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : proposal.status === "scheduled"
                                    ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                    : proposal.status === "sent"
                                      ? "border-blue-500/25 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                      : "border-border bg-muted/40 text-muted-foreground"
                              }`}
                            >
                              {proposal.status}
                            </Badge>
                          </div>

                          {/* Value */}
                          <div className="text-right font-semibold text-foreground text-sm">
                            {formatValueNoDecimals(
                              proposal.valueMinor,
                              proposal.currency
                            )}
                          </div>

                          {/* Action Menu */}
                          <div className="flex justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 cursor-pointer rounded-lg text-muted-foreground hover:text-foreground"
                                  />
                                }
                              >
                                <EllipsisHorizontalIcon className="h-3.5 w-3.5" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem
                                  render={
                                    <Link
                                      to="/proposals/$proposalId"
                                      params={{ proposalId: proposal.id }}
                                      className="cursor-pointer text-xs"
                                    />
                                  }
                                >
                                  Edit
                                </DropdownMenuItem>
                                {proposal.publicToken && (
                                  <DropdownMenuItem
                                    render={
                                      <a
                                        href={buildPublicLink(
                                          "proposal",
                                          proposal.publicToken!
                                        )}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="cursor-pointer text-xs"
                                      />
                                    }
                                  >
                                    View public page
                                  </DropdownMenuItem>
                                )}
                                {proposal.publicToken && (
                                  <DropdownMenuItem
                                    className="cursor-pointer text-xs"
                                    onClick={() => {
                                      const shareUrl = buildPublicLink(
                                        "proposal",
                                        proposal.publicToken!
                                      )
                                      navigator.clipboard.writeText(shareUrl)
                                    }}
                                  >
                                    Copy public link
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  variant="destructive"
                                  className="cursor-pointer text-xs"
                                  onClick={() =>
                                    handleDelete(proposal.id, proposal.title)
                                  }
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </ScrollArea>
    </div>
  )
}
