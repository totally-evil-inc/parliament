import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
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
import { Calendar } from "@workspace/ui/components/calendar"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  FilterIcon,
  SearchIcon,
  MoreHorizontalIcon,
  GridViewIcon,
  ListViewIcon,
  DollarCircleIcon,
  CheckmarkCircle01Icon,
  CancelCircleIcon,
  PlusSignIcon,
  FileDollarIcon,
  Calendar01Icon,
} from "@hugeicons/core-free-icons"
import { PageHeader } from "@/components/page-header"
import { useConfirm } from "@/components/confirm-dialog-provider"
import { useProposalsFilter } from "@/hooks/use-proposals-filter"
import { proposalDraftsQuery } from "@/api/proposals"
import { createProposalDraft, deleteProposalDraft } from "@/server/proposals"
import type { PersistedProposalDraft, ProposalDraftListItem } from "@/server/proposals"
import { formatMoneyMinor, formatDateOnly } from "@workspace/document/calculate"

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
    mutationFn: () =>
      createProposalDraft({ data: { blueprint: "classic" } }),
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
        className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${
          isNegative
            ? "bg-red-500/10 text-red-500 border-red-500/20"
            : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
        }`}
      >
        {text}
      </Badge>
    )
  }

  return (
    <>
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
                    className="bg-neutral-900 border-neutral-800 text-xs text-neutral-300 rounded-lg flex items-center gap-2 h-9 cursor-pointer"
                  />
                }
              >
                <HugeiconsIcon icon={Calendar01Icon} className="w-3.5 h-3.5" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {formatDateOnly(dateRange.from.toISOString().split("T")[0], "en-US")} -{" "}
                      {formatDateOnly(dateRange.to.toISOString().split("T")[0], "en-US")}
                    </>
                  ) : (
                    formatDateOnly(dateRange.from.toISOString().split("T")[0], "en-US")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-neutral-900 border-neutral-800" align="end">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  className="bg-neutral-900 text-neutral-300"
                />
              </PopoverContent>
            </Popover>

            <Button
              type="button"
              className="bg-white hover:bg-neutral-200 text-black font-semibold text-xs py-2 px-4 rounded-full flex items-center gap-2 border-0 cursor-pointer h-9"
              onClick={() => createDraft.mutate()}
              disabled={createDraft.isPending}
            >
              <HugeiconsIcon icon={PlusSignIcon} className="w-3.5 h-3.5" />
              {createDraft.isPending ? "Creating..." : "New Proposal"}
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 p-6 md:p-8 bg-neutral-950/40 text-neutral-200">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Card 1: Total Proposed */}
          <Card className="bg-neutral-900/60 border-neutral-800/80 rounded-2xl p-5 relative">
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-neutral-400">Total Proposed</span>
              <div className="p-1.5 rounded-lg bg-neutral-800/40 text-neutral-400 border border-neutral-800">
                <HugeiconsIcon icon={FileDollarIcon} className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-semibold text-white tracking-tight">
                {formatValueNoDecimals(currentStats.proposedSum, "USD")}
              </span>
            </div>
            <div className="mt-4 flex justify-between items-center text-xs">
              <span className="text-neutral-500">{currentStats.proposedCount} proposals</span>
              {renderTrendBadge(trends.proposed)}
            </div>
          </Card>

          {/* Card 2: Accepted */}
          <Card className="bg-neutral-900/60 border-neutral-800/80 rounded-2xl p-5 relative">
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-neutral-400">Accepted</span>
              <div className="p-1.5 rounded-lg bg-neutral-800/40 text-neutral-400 border border-neutral-800">
                <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-semibold text-white tracking-tight">
                {formatValueNoDecimals(currentStats.acceptedSum, "USD")}
              </span>
            </div>
            <div className="mt-4 flex justify-between items-center text-xs">
              <span className="text-neutral-500">{currentStats.acceptedCount} accepted</span>
              {renderTrendBadge(trends.accepted)}
            </div>
          </Card>

          {/* Card 3: Pending */}
          <Card className="bg-neutral-900/60 border-neutral-800/80 rounded-2xl p-5 relative">
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-neutral-400">Pending</span>
              <div className="p-1.5 rounded-lg bg-neutral-800/40 text-neutral-400 border border-neutral-800">
                <HugeiconsIcon icon={DollarCircleIcon} className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-semibold text-white tracking-tight">
                {formatValueNoDecimals(currentStats.pendingSum, "USD")}
              </span>
            </div>
            <div className="mt-4 flex justify-between items-center text-xs">
              <span className="text-neutral-500">{currentStats.pendingCount} awaiting</span>
              {renderTrendBadge(trends.pending)}
            </div>
          </Card>

          {/* Card 4: Rejected */}
          <Card className="bg-neutral-900/60 border-neutral-800/80 rounded-2xl p-5 relative">
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-neutral-400">Rejected</span>
              <div className="p-1.5 rounded-lg bg-neutral-800/40 text-neutral-400 border border-neutral-800">
                <HugeiconsIcon icon={CancelCircleIcon} className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-semibold text-white tracking-tight">
                {formatValueNoDecimals(currentStats.rejectedSum, "USD")}
              </span>
            </div>
            <div className="mt-4 flex justify-between items-center text-xs">
              <span className="text-neutral-500">{currentStats.rejectedCount} lost</span>
              {renderTrendBadge(trends.rejected)}
            </div>
          </Card>
        </div>

        {/* Proposals List Card Container */}
        <Card className="bg-neutral-900/30 border-neutral-800/80 rounded-2xl overflow-hidden p-6 mt-2">
          {/* List Card Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-800/50 pb-6 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-white">All proposals</h2>
              <p className="text-xs text-neutral-500 mt-1">
                {filteredList.length} of {proposals.length} shown
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Layout Switcher */}
              <div className="flex items-center bg-neutral-900/60 border border-neutral-800/80 rounded-lg p-0.5">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-white bg-neutral-800 rounded">
                  <HugeiconsIcon icon={ListViewIcon} className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-neutral-500 hover:text-neutral-300">
                  <HugeiconsIcon icon={GridViewIcon} className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Filters */}
              <Button
                variant="outline"
                className="bg-neutral-900/60 border-neutral-800/80 hover:bg-neutral-800/50 text-xs gap-1.5 h-8 rounded-lg cursor-pointer"
              >
                <HugeiconsIcon icon={FilterIcon} className="w-3.5 h-3.5" />
                Filters
              </Button>

              {/* Search bar */}
              <div className="relative w-full sm:w-[220px]">
                <HugeiconsIcon
                  icon={SearchIcon}
                  className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-500"
                />
                <Input
                  type="search"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 bg-neutral-900/60 border-neutral-800/80 text-xs rounded-lg h-8 w-full placeholder-neutral-500 text-neutral-200 focus-visible:ring-neutral-700 focus-visible:border-neutral-700"
                />
              </div>
            </div>
          </div>

          {/* Month Grouped Table View */}
          {groupedMonths.length === 0 ? (
            <div className="py-12 text-center text-sm text-neutral-500">
              No proposals found.
            </div>
          ) : (
            <div className="space-y-8">
              {groupedMonths.map((group) => (
                <div key={group.monthName} className="space-y-3">
                  {/* Month Header Grid */}
                  <div className="grid grid-cols-[48px_1fr_110px_110px_90px_100px_40px] items-center gap-4 px-2 text-xs font-semibold text-neutral-500 border-b border-neutral-900 pb-2">
                    <div className="flex items-center gap-1.5 col-span-2">
                      <span className="text-neutral-300 font-bold">{group.monthName}</span>
                      <span className="bg-neutral-800/60 text-neutral-400 text-[10px] px-1.5 py-0.2 rounded-full font-normal">
                        {group.proposals.length}
                      </span>
                    </div>
                    <div className="text-right">Created</div>
                    <div className="text-right">Valid</div>
                    <div className="text-right">Status</div>
                    <div className="text-right font-bold text-neutral-400">
                      {formatValueNoDecimals(group.totalMinor, group.currency)}
                    </div>
                    <div></div>
                  </div>

                  {/* Month Rows */}
                  <div className="space-y-2">
                    {group.proposals.map((proposal) => (
                      <div
                        key={proposal.id}
                        className="grid grid-cols-[48px_1fr_110px_110px_90px_100px_40px] items-center gap-4 px-2 py-3 bg-neutral-900/20 hover:bg-neutral-900/55 border border-neutral-900/40 rounded-xl transition duration-150"
                      >
                        {/* Initials Circle */}
                        <div className="w-9 h-9 rounded-full bg-neutral-800/80 border border-neutral-700/30 flex items-center justify-center text-xs font-semibold text-neutral-400 select-none">
                          {getInitials(proposal.title)}
                        </div>

                        {/* Details */}
                        <div className="min-w-0 flex flex-col">
                          <Link
                            to="/proposals/$proposalId"
                            params={{ proposalId: proposal.id }}
                            className="font-medium text-sm text-neutral-200 hover:text-white truncate transition-colors"
                          >
                            {proposal.title || "Untitled proposal"}
                          </Link>
                          <div className="flex items-center gap-2 mt-1 min-w-0">
                            <span className="text-xs text-neutral-500 truncate">
                              {proposal.customerName || "Untitled client"}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[9px] bg-neutral-800/40 text-neutral-500 border-neutral-800 px-1 py-0 rounded"
                            >
                              Proposal
                            </Badge>
                          </div>
                        </div>

                        {/* Created Date */}
                        <div className="text-right text-xs text-neutral-400">
                          {formatDateOnly(proposal.issueDate, "en-US")}
                        </div>

                        {/* Valid Until Date */}
                        <div className="text-right text-xs text-neutral-400">
                          {proposal.validUntil
                            ? formatDateOnly(proposal.validUntil, "en-US")
                            : "—"}
                        </div>

                        {/* Status Badge */}
                        <div className="flex justify-end">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded ${
                              proposal.status === "accepted"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                                : proposal.status === "sent"
                                ? "bg-neutral-800/60 text-neutral-300 border-neutral-700/60"
                                : "bg-neutral-900 text-neutral-500 border-neutral-800"
                            }`}
                          >
                            {proposal.status}
                          </Badge>
                        </div>

                        {/* Value */}
                        <div className="text-right text-sm font-semibold text-white">
                          {formatValueNoDecimals(proposal.valueMinor, proposal.currency)}
                        </div>

                        {/* Action Menu */}
                        <div className="flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-neutral-500 hover:text-neutral-200 cursor-pointer rounded-lg"
                                />
                              }
                            >
                              <HugeiconsIcon
                                icon={MoreHorizontalIcon}
                                className="w-3.5 h-3.5"
                              />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="bg-neutral-900 border-neutral-800 text-neutral-300 w-40"
                            >
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
                                    <Link
                                      to="/proposal/$publicToken"
                                      params={{ publicToken: proposal.publicToken }}
                                      target="_blank"
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
                                    const shareUrl = `${window.location.origin}/proposal/${proposal.publicToken}`
                                    navigator.clipboard.writeText(shareUrl)
                                  }}
                                >
                                  Copy public link
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                variant="destructive"
                                className="cursor-pointer text-xs text-red-500 focus:text-red-500 focus:bg-red-500/10"
                                onClick={() => handleDelete(proposal.id, proposal.title)}
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
    </>
  )
}
