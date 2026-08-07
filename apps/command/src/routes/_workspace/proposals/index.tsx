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
import {
  IconBan,
  IconBulletList,
  IconCalendar,
  IconCircleCheck,
  IconCircleCoin,
  IconCircleCopyPlus,
  IconDots,
  IconGrid,
  IconMagnifier,
  IconMoneyBill,
  IconSlidersVertical,
} from "nucleo-glass"
import { proposalDraftsQuery } from "@/api/proposals"
import { useConfirm } from "@/components/confirm-dialog-provider"
import { PageHeader } from "@/components/page-header"
import { useProposalsFilter } from "@/hooks/use-proposals-filter"
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
            ? "border-red-500/20 bg-red-500/10 text-red-500"
            : "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
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
                    className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border-neutral-800 bg-neutral-900 text-neutral-300 text-xs"
                  />
                }
              >
                <IconCalendar className="h-3.5 w-3.5" />
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
              <PopoverContent
                className="w-auto border-neutral-800 bg-neutral-900 p-0"
                align="end"
              >
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
              className="flex h-9 cursor-pointer items-center gap-2 rounded-full border-0 bg-white px-4 py-2 font-semibold text-black text-xs hover:bg-neutral-200"
              onClick={() => createDraft.mutate()}
              disabled={createDraft.isPending}
            >
              <IconCircleCopyPlus className="h-3.5 w-3.5" />
              {createDraft.isPending ? "Creating..." : "New Proposal"}
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 bg-neutral-950/40 p-6 text-neutral-200 md:p-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {/* Card 1: Total Proposed */}
          <Card className="relative rounded-2xl border-neutral-800/80 bg-neutral-900/60 p-5">
            <div className="flex items-start justify-between">
              <span className="font-medium text-neutral-400 text-xs">
                Total Proposed
              </span>
              <div className="rounded-lg border border-neutral-800 bg-neutral-800/40 p-1.5 text-neutral-400">
                <IconMoneyBill className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="font-semibold text-3xl text-white tracking-tight">
                {formatValueNoDecimals(currentStats.proposedSum, "USD")}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-neutral-500">
                {currentStats.proposedCount} proposals
              </span>
              {renderTrendBadge(trends.proposed)}
            </div>
          </Card>

          {/* Card 2: Accepted */}
          <Card className="relative rounded-2xl border-neutral-800/80 bg-neutral-900/60 p-5">
            <div className="flex items-start justify-between">
              <span className="font-medium text-neutral-400 text-xs">
                Accepted
              </span>
              <div className="rounded-lg border border-neutral-800 bg-neutral-800/40 p-1.5 text-neutral-400">
                <IconCircleCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="font-semibold text-3xl text-white tracking-tight">
                {formatValueNoDecimals(currentStats.acceptedSum, "USD")}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-neutral-500">
                {currentStats.acceptedCount} accepted
              </span>
              {renderTrendBadge(trends.accepted)}
            </div>
          </Card>

          {/* Card 3: Pending */}
          <Card className="relative rounded-2xl border-neutral-800/80 bg-neutral-900/60 p-5">
            <div className="flex items-start justify-between">
              <span className="font-medium text-neutral-400 text-xs">
                Pending
              </span>
              <div className="rounded-lg border border-neutral-800 bg-neutral-800/40 p-1.5 text-neutral-400">
                <IconCircleCoin className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="font-semibold text-3xl text-white tracking-tight">
                {formatValueNoDecimals(currentStats.pendingSum, "USD")}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-neutral-500">
                {currentStats.pendingCount} awaiting
              </span>
              {renderTrendBadge(trends.pending)}
            </div>
          </Card>

          {/* Card 4: Rejected */}
          <Card className="relative rounded-2xl border-neutral-800/80 bg-neutral-900/60 p-5">
            <div className="flex items-start justify-between">
              <span className="font-medium text-neutral-400 text-xs">
                Rejected
              </span>
              <div className="rounded-lg border border-neutral-800 bg-neutral-800/40 p-1.5 text-neutral-400">
                <IconBan className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="font-semibold text-3xl text-white tracking-tight">
                {formatValueNoDecimals(currentStats.rejectedSum, "USD")}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-neutral-500">
                {currentStats.rejectedCount} lost
              </span>
              {renderTrendBadge(trends.rejected)}
            </div>
          </Card>
        </div>

        {/* Proposals List Card Container */}
        <Card className="mt-2 overflow-hidden rounded-2xl border-neutral-800/80 bg-neutral-900/30 p-6">
          {/* List Card Header */}
          <div className="mb-6 flex flex-col gap-4 border-neutral-800/50 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-lg text-white">
                All proposals
              </h2>
              <p className="mt-1 text-neutral-500 text-xs">
                {filteredList.length} of {proposals.length} shown
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Layout Switcher */}
              <div className="flex items-center rounded-lg border border-neutral-800/80 bg-neutral-900/60 p-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded bg-neutral-800 text-white"
                >
                  <IconBulletList className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-neutral-500 hover:text-neutral-300"
                >
                  <IconGrid className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Filters */}
              <Button
                variant="outline"
                className="h-8 cursor-pointer gap-1.5 rounded-lg border-neutral-800/80 bg-neutral-900/60 text-xs hover:bg-neutral-800/50"
              >
                <IconSlidersVertical className="h-3.5 w-3.5" />
                Filters
              </Button>

              {/* Search bar */}
              <div className="relative w-full sm:w-[220px]">
                <IconMagnifier className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-neutral-500" />
                <Input
                  type="search"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 w-full rounded-lg border-neutral-800/80 bg-neutral-900/60 pl-8 text-neutral-200 text-xs placeholder-neutral-500 focus-visible:border-neutral-700 focus-visible:ring-neutral-700"
                />
              </div>
            </div>
          </div>

          {/* Month Grouped Table View */}
          {groupedMonths.length === 0 ? (
            <div className="py-12 text-center text-neutral-500 text-sm">
              No proposals found.
            </div>
          ) : (
            <div className="space-y-8">
              {groupedMonths.map((group) => (
                <div key={group.monthName} className="space-y-3">
                  {/* Month Header Grid */}
                  <div className="grid grid-cols-[48px_1fr_110px_110px_90px_100px_40px] items-center gap-4 border-neutral-900 border-b px-2 pb-2 font-semibold text-neutral-500 text-xs">
                    <div className="col-span-2 flex items-center gap-1.5">
                      <span className="font-bold text-neutral-300">
                        {group.monthName}
                      </span>
                      <span className="rounded-full bg-neutral-800/60 px-1.5 py-0.2 font-normal text-[10px] text-neutral-400">
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
                        className="grid grid-cols-[48px_1fr_110px_110px_90px_100px_40px] items-center gap-4 rounded-xl border border-neutral-900/40 bg-neutral-900/20 px-2 py-3 transition duration-150 hover:bg-neutral-900/55"
                      >
                        {/* Initials Circle */}
                        <div className="flex h-9 w-9 select-none items-center justify-center rounded-full border border-neutral-700/30 bg-neutral-800/80 font-semibold text-neutral-400 text-xs">
                          {getInitials(proposal.title)}
                        </div>

                        {/* Details */}
                        <div className="flex min-w-0 flex-col">
                          <Link
                            to="/proposals/$proposalId"
                            params={{ proposalId: proposal.id }}
                            className="truncate font-medium text-neutral-200 text-sm transition-colors hover:text-white"
                          >
                            {proposal.title || "Untitled proposal"}
                          </Link>
                          <div className="mt-1 flex min-w-0 items-center gap-2">
                            <span className="truncate text-neutral-500 text-xs">
                              {proposal.customerName || "Untitled client"}
                            </span>
                            <Badge
                              variant="outline"
                              className="rounded border-neutral-800 bg-neutral-800/40 px-1 py-0 text-[9px] text-neutral-500"
                            >
                              Proposal
                            </Badge>
                          </div>
                        </div>

                        {/* Created Date */}
                        <div className="text-right text-neutral-400 text-xs">
                          {formatDateOnly(proposal.issueDate, "en-US")}
                        </div>

                        {/* Valid Until Date */}
                        <div className="text-right text-neutral-400 text-xs">
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
                                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
                                : proposal.status === "sent"
                                  ? "border-neutral-700/60 bg-neutral-800/60 text-neutral-300"
                                  : "border-neutral-800 bg-neutral-900 text-neutral-500"
                            }`}
                          >
                            {proposal.status}
                          </Badge>
                        </div>

                        {/* Value */}
                        <div className="text-right font-semibold text-sm text-white">
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
                                  className="h-7 w-7 cursor-pointer rounded-lg text-neutral-500 hover:text-neutral-200"
                                />
                              }
                            >
                              <IconDots className="h-3.5 w-3.5" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-40 border-neutral-800 bg-neutral-900 text-neutral-300"
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
                                    <a
                                      href={`${(import.meta.env.VITE_GATE_URL as string | undefined) || "http://localhost:4100"}/p/${proposal.publicToken}`}
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
                                    const gateBaseUrl =
                                      (import.meta.env.VITE_GATE_URL as string | undefined) ||
                                      "http://localhost:4100"
                                    const shareUrl = `${gateBaseUrl}/p/${proposal.publicToken}`
                                    navigator.clipboard.writeText(shareUrl)
                                  }}
                                >
                                  Copy public link
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                variant="destructive"
                                className="cursor-pointer text-red-500 text-xs focus:bg-red-500/10 focus:text-red-500"
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
    </>
  )
}
