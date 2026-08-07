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
import * as React from "react"
import type { DateRange } from "react-day-picker"
import { invoiceDraftsQuery } from "@/api/invoices"
import { useConfirm } from "@/components/confirm-dialog-provider"
import { PageHeader } from "@/components/page-header"
import { buildPublicLink } from "@/lib/public-links"
import type {
  InvoiceDraftListItem,
  PersistedInvoiceDraft,
} from "@/server/invoices"
import { createInvoiceDraft, deleteInvoiceDraft } from "@/server/invoices"

export const Route = createFileRoute("/_workspace/invoices/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(invoiceDraftsQuery)
  },
  component: InvoicesRoute,
})

function InvoicesRoute() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const { data: invoices } = useSuspenseQuery(invoiceDraftsQuery)

  const [searchQuery, setSearchQuery] = React.useState("")
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
    undefined
  )

  const createDraft = useMutation({
    mutationFn: () => createInvoiceDraft({ data: { blueprint: "standard" } }),
    onSuccess: async (draftResult) => {
      const draft = draftResult as PersistedInvoiceDraft
      await queryClient.invalidateQueries({ queryKey: ["invoices"] })
      await navigate({
        to: "/invoices/$invoiceId",
        params: { invoiceId: draft.id },
      })
    },
  })

  const deleteDraft = useMutation({
    mutationFn: (id: string) => deleteInvoiceDraft({ data: { id } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["invoices"] })
    },
  })

  // Filtering
  const filteredList = React.useMemo(() => {
    return invoices.filter((item: InvoiceDraftListItem) => {
      const matchSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.customerName.toLowerCase().includes(searchQuery.toLowerCase())

      let matchDate = true
      if (dateRange?.from) {
        const itemDate = new Date(item.issueDate)
        if (dateRange.to) {
          matchDate = itemDate >= dateRange.from && itemDate <= dateRange.to
        } else {
          matchDate = itemDate >= dateRange.from
        }
      }
      return matchSearch && matchDate
    })
  }, [invoices, searchQuery, dateRange])

  // Stats calculation
  const stats = React.useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0]
    let totalSum = 0
    let paidSum = 0
    let outstandingSum = 0
    let overdueSum = 0

    let totalCount = 0
    let paidCount = 0
    let outstandingCount = 0
    let overdueCount = 0

    for (const item of filteredList) {
      totalSum += item.valueMinor
      totalCount++

      if (item.status === "paid") {
        paidSum += item.valueMinor
        paidCount++
      } else {
        outstandingSum += item.valueMinor
        outstandingCount++

        if (item.dueDate < todayStr && item.status === "sent") {
          overdueSum += item.valueMinor
          overdueCount++
        }
      }
    }

    return {
      totalSum,
      totalCount,
      paidSum,
      paidCount,
      outstandingSum,
      outstandingCount,
      overdueSum,
      overdueCount,
    }
  }, [filteredList])

  const groupInvoicesByMonth = (list: InvoiceDraftListItem[]) => {
    const groups: {
      [key: string]: {
        monthName: string
        invoices: InvoiceDraftListItem[]
        totalMinor: number
        currency: string
      }
    } = {}

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
          invoices: [],
          totalMinor: 0,
          currency: p.currency || "USD",
        }
      }
      groups[monthName].invoices.push(p)
      groups[monthName].totalMinor += p.valueMinor
    }

    return Object.values(groups)
  }

  const groupedMonths = groupInvoicesByMonth(filteredList)

  const formatValueNoDecimals = (valueMinor: number, currency: string) => {
    return formatMoneyMinor(valueMinor, currency, "en-US").replace(/\.00$/, "")
  }

  const getInitials = (name: string) => {
    if (!name) return "INV"
    const parts = name.split(" ")
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  const handleDelete = async (id: string, title: string) => {
    const isConfirmed = await confirm({
      title: "Delete invoice",
      description: `Are you sure you want to delete "${
        title || "Untitled invoice"
      }"? This action cannot be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "destructive",
    })

    if (isConfirmed) {
      deleteDraft.mutate(id)
    }
  }

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Manage and track bills, payments, and receivables."
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
              {createDraft.isPending ? "Creating..." : "New Invoice"}
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 bg-neutral-950/40 p-6 text-neutral-200 md:p-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card className="relative rounded-2xl border-neutral-800/80 bg-neutral-900/60 p-5">
            <div className="flex items-start justify-between">
              <span className="font-medium text-neutral-400 text-xs">
                Total Invoiced
              </span>
              <div className="rounded-lg border border-neutral-800 bg-neutral-800/40 p-1.5 text-neutral-400">
                <IconMoneyBill className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="font-semibold text-3xl text-white tracking-tight">
                {formatValueNoDecimals(stats.totalSum, "KES")}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between text-neutral-500 text-xs">
              <span>{stats.totalCount} invoices</span>
            </div>
          </Card>

          <Card className="relative rounded-2xl border-neutral-800/80 bg-neutral-900/60 p-5">
            <div className="flex items-start justify-between">
              <span className="font-medium text-neutral-400 text-xs">
                Paid Invoices
              </span>
              <div className="rounded-lg border border-neutral-800 bg-neutral-800/40 p-1.5 text-neutral-400">
                <IconCircleCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="font-semibold text-3xl text-white tracking-tight">
                {formatValueNoDecimals(stats.paidSum, "KES")}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between text-neutral-500 text-xs">
              <span>{stats.paidCount} paid</span>
            </div>
          </Card>

          <Card className="relative rounded-2xl border-neutral-800/80 bg-neutral-900/60 p-5">
            <div className="flex items-start justify-between">
              <span className="font-medium text-neutral-400 text-xs">
                Outstanding
              </span>
              <div className="rounded-lg border border-neutral-800 bg-neutral-800/40 p-1.5 text-neutral-400">
                <IconCircleCoin className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="font-semibold text-3xl text-white tracking-tight">
                {formatValueNoDecimals(stats.outstandingSum, "KES")}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between text-neutral-500 text-xs">
              <span>{stats.outstandingCount} outstanding</span>
            </div>
          </Card>

          <Card className="relative rounded-2xl border-neutral-800/80 bg-neutral-900/60 p-5">
            <div className="flex items-start justify-between">
              <span className="font-medium text-neutral-400 text-xs">
                Overdue
              </span>
              <div className="rounded-lg border border-neutral-800 bg-neutral-800/40 p-1.5 text-neutral-400">
                <IconBan className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="font-semibold text-3xl text-red-400 tracking-tight">
                {formatValueNoDecimals(stats.overdueSum, "KES")}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between text-neutral-500 text-xs">
              <span>{stats.overdueCount} overdue</span>
            </div>
          </Card>
        </div>

        {/* Invoices List Card Container */}
        <Card className="mt-2 overflow-hidden rounded-2xl border-neutral-800/80 bg-neutral-900/30 p-6">
          <div className="mb-6 flex flex-col gap-4 border-neutral-800/50 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-lg text-white">All invoices</h2>
              <p className="mt-1 text-neutral-500 text-xs">
                {filteredList.length} of {invoices.length} shown
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
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

              <Button
                variant="outline"
                className="h-8 cursor-pointer gap-1.5 rounded-lg border-neutral-800/80 bg-neutral-900/60 text-xs hover:bg-neutral-800/50"
              >
                <IconSlidersVertical className="h-3.5 w-3.5" />
                Filters
              </Button>

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

          {groupedMonths.length === 0 ? (
            <div className="py-12 text-center text-neutral-500 text-sm">
              No invoices found.
            </div>
          ) : (
            <div className="space-y-8">
              {groupedMonths.map((group) => (
                <div key={group.monthName} className="space-y-3">
                  <div className="grid grid-cols-[48px_1fr_110px_110px_90px_100px_40px] items-center gap-4 border-neutral-900 border-b px-2 pb-2 font-semibold text-neutral-500 text-xs">
                    <div className="col-span-2 flex items-center gap-1.5">
                      <span className="font-bold text-neutral-300">
                        {group.monthName}
                      </span>
                      <span className="rounded-full bg-neutral-800/60 px-1.5 py-0.2 font-normal text-[10px] text-neutral-400">
                        {group.invoices.length}
                      </span>
                    </div>
                    <div className="text-right">Created</div>
                    <div className="text-right">Due Date</div>
                    <div className="text-right">Status</div>
                    <div className="text-right font-bold text-neutral-400">
                      {formatValueNoDecimals(group.totalMinor, group.currency)}
                    </div>
                    <div></div>
                  </div>

                  <div className="space-y-2">
                    {group.invoices.map((invoice) => {
                      const isOverdue =
                        invoice.status === "sent" &&
                        invoice.dueDate < new Date().toISOString().split("T")[0]
                      return (
                        <div
                          key={invoice.id}
                          className="grid grid-cols-[48px_1fr_110px_110px_90px_100px_40px] items-center gap-4 rounded-xl border border-neutral-900/40 bg-neutral-900/20 px-2 py-3 transition duration-150 hover:bg-neutral-900/55"
                        >
                          <div className="flex h-9 w-9 select-none items-center justify-center rounded-full border border-neutral-700/30 bg-neutral-800/80 font-semibold text-neutral-400 text-xs">
                            {getInitials(invoice.title)}
                          </div>

                          <div className="flex min-w-0 flex-col">
                            <Link
                              to="/invoices/$invoiceId"
                              params={{ invoiceId: invoice.id }}
                              className="truncate font-medium text-neutral-200 text-sm transition-colors hover:text-white"
                            >
                              {invoice.title || "Untitled invoice"}{" "}
                              <span className="font-normal text-neutral-500 text-xs">
                                ({invoice.invoiceNumber})
                              </span>
                            </Link>
                            <div className="mt-1 flex min-w-0 items-center gap-2">
                              <span className="truncate text-neutral-500 text-xs">
                                {invoice.customerName || "Untitled client"}
                              </span>
                              <Badge
                                variant="outline"
                                className="rounded border-neutral-800 bg-neutral-800/40 px-1 py-0 text-[9px] text-neutral-500"
                              >
                                Invoice
                              </Badge>
                            </div>
                          </div>

                          <div className="text-right text-neutral-400 text-xs">
                            {formatDateOnly(invoice.issueDate, "en-US")}
                          </div>

                          <div
                            className={`text-right text-xs ${
                              isOverdue
                                ? "font-medium text-red-400"
                                : "text-neutral-400"
                            }`}
                          >
                            {formatDateOnly(invoice.dueDate, "en-US")}
                          </div>

                          <div className="flex justify-end">
                            <Badge
                              variant="outline"
                              className={`rounded px-2 py-0.5 font-semibold text-[10px] uppercase tracking-wider ${
                                invoice.status === "paid"
                                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
                                  : invoice.status === "sent"
                                    ? isOverdue
                                      ? "border-red-500/25 bg-red-500/10 text-red-400"
                                      : "border-blue-500/25 bg-blue-500/10 text-blue-400"
                                    : "border-neutral-800 bg-neutral-900 text-neutral-500"
                              }`}
                            >
                              {invoice.status === "sent" && isOverdue
                                ? "overdue"
                                : invoice.status}
                            </Badge>
                          </div>

                          <div className="text-right font-semibold text-sm text-white">
                            {formatValueNoDecimals(
                              invoice.valueMinor,
                              invoice.currency
                            )}
                          </div>

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
                                      to="/invoices/$invoiceId"
                                      params={{ invoiceId: invoice.id }}
                                      className="cursor-pointer text-xs"
                                    />
                                  }
                                >
                                  Edit
                                </DropdownMenuItem>
                                {invoice.publicToken && (
                                  <DropdownMenuItem
                                    render={
                                      <a
                                        href={buildPublicLink(
                                          "invoice",
                                          invoice.publicToken
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
                                <DropdownMenuItem
                                  variant="destructive"
                                  className="cursor-pointer text-red-500 text-xs focus:bg-red-500/10 focus:text-red-500"
                                  onClick={() =>
                                    handleDelete(invoice.id, invoice.title)
                                  }
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      )
                    })}
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
