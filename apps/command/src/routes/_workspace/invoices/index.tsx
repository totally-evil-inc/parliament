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
import * as React from "react"
import type { DateRange } from "react-day-picker"
import { invoiceDraftsQuery } from "@/api/invoices"
import { useConfirm } from "@/components/confirm-dialog-provider"
import { PageHeader } from "@/components/page-header"
import { AppHeader } from "@/layouts/header-portal"
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
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <AppHeader />
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
              {createDraft.isPending ? "Creating..." : "New Invoice"}
            </Button>
          </div>
        }
      />
      <ScrollArea className="min-h-0 flex-1">
        <div className="grid gap-6 bg-background p-6 text-foreground md:p-8">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card className="relative rounded-2xl border-border/80 bg-card p-5">
              <div className="flex items-start justify-between">
                <span className="font-medium text-muted-foreground text-xs">
                  Total Invoiced
                </span>
                <div className="rounded-lg border border-border bg-muted/60 p-1.5 text-muted-foreground">
                  <BanknotesIcon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="font-semibold text-3xl text-foreground tracking-tight">
                  {formatValueNoDecimals(stats.totalSum, "KES")}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between text-muted-foreground text-xs">
                <span>{stats.totalCount} invoices</span>
              </div>
            </Card>

            <Card className="relative rounded-2xl border-border/80 bg-card p-5">
              <div className="flex items-start justify-between">
                <span className="font-medium text-muted-foreground text-xs">
                  Paid Invoices
                </span>
                <div className="rounded-lg border border-border bg-muted/60 p-1.5 text-muted-foreground">
                  <CheckCircleIcon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="font-semibold text-3xl text-foreground tracking-tight">
                  {formatValueNoDecimals(stats.paidSum, "KES")}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between text-muted-foreground text-xs">
                <span>{stats.paidCount} paid</span>
              </div>
            </Card>

            <Card className="relative rounded-2xl border-border/80 bg-card p-5">
              <div className="flex items-start justify-between">
                <span className="font-medium text-muted-foreground text-xs">
                  Outstanding
                </span>
                <div className="rounded-lg border border-border bg-muted/60 p-1.5 text-muted-foreground">
                  <ClockIcon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="font-semibold text-3xl text-foreground tracking-tight">
                  {formatValueNoDecimals(stats.outstandingSum, "KES")}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between text-muted-foreground text-xs">
                <span>{stats.outstandingCount} outstanding</span>
              </div>
            </Card>

            <Card className="relative rounded-2xl border-border/80 bg-card p-5">
              <div className="flex items-start justify-between">
                <span className="font-medium text-muted-foreground text-xs">
                  Overdue
                </span>
                <div className="rounded-lg border border-border bg-muted/60 p-1.5 text-muted-foreground">
                  <NoSymbolIcon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="font-semibold text-3xl text-destructive tracking-tight">
                  {formatValueNoDecimals(stats.overdueSum, "KES")}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between text-muted-foreground text-xs">
                <span>{stats.overdueCount} overdue</span>
              </div>
            </Card>
          </div>

          {/* Invoices List Card Container */}
          <Card className="mt-2 overflow-hidden rounded-2xl border-border/80 bg-card p-6">
            <div className="mb-6 flex flex-col gap-4 border-border/50 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-foreground text-lg">
                  All invoices
                </h2>
                <p className="mt-1 text-muted-foreground text-xs">
                  {filteredList.length} of {invoices.length} shown
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
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

                <Button
                  variant="outline"
                  className="h-8 cursor-pointer gap-1.5 rounded-lg text-xs"
                >
                  <AdjustmentsHorizontalIcon className="h-3.5 w-3.5" />
                  Filters
                </Button>

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

            {groupedMonths.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                No invoices found.
              </div>
            ) : (
              <div className="space-y-8">
                {groupedMonths.map((group) => (
                  <div key={group.monthName} className="space-y-3">
                    <div className="grid grid-cols-[48px_1fr_110px_110px_90px_100px_40px] items-center gap-4 border-border/60 border-b px-2 pb-2 font-semibold text-muted-foreground text-xs">
                      <div className="col-span-2 flex items-center gap-1.5">
                        <span className="font-bold text-foreground">
                          {group.monthName}
                        </span>
                        <span className="rounded-full bg-muted px-1.5 py-0.5 font-normal text-[10px] text-muted-foreground">
                          {group.invoices.length}
                        </span>
                      </div>
                      <div className="text-right">Created</div>
                      <div className="text-right">Due Date</div>
                      <div className="text-right">Status</div>
                      <div className="text-right font-bold text-foreground">
                        {formatValueNoDecimals(
                          group.totalMinor,
                          group.currency
                        )}
                      </div>
                      <div></div>
                    </div>

                    <div className="space-y-2">
                      {group.invoices.map((invoice) => {
                        const isOverdue =
                          invoice.status === "sent" &&
                          invoice.dueDate <
                            new Date().toISOString().split("T")[0]
                        return (
                          <div
                            key={invoice.id}
                            className="grid grid-cols-[48px_1fr_110px_110px_90px_100px_40px] items-center gap-4 rounded-xl border border-border/40 bg-background/50 px-2 py-3 transition duration-150 hover:bg-muted/40"
                          >
                            <div className="flex h-9 w-9 select-none items-center justify-center rounded-full border border-border bg-muted font-semibold text-muted-foreground text-xs">
                              {getInitials(invoice.title)}
                            </div>

                            <div className="flex min-w-0 flex-col">
                              <Link
                                to="/invoices/$invoiceId"
                                params={{ invoiceId: invoice.id }}
                                className="truncate font-medium text-foreground text-sm transition-colors hover:text-primary"
                              >
                                {invoice.title || "Untitled invoice"}{" "}
                                <span className="font-normal text-muted-foreground text-xs">
                                  ({invoice.invoiceNumber})
                                </span>
                              </Link>
                              <div className="mt-1 flex min-w-0 items-center gap-2">
                                <span className="truncate text-muted-foreground text-xs">
                                  {invoice.customerName || "Untitled client"}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="rounded border-border bg-muted/50 px-1 py-0 text-[9px] text-muted-foreground"
                                >
                                  Invoice
                                </Badge>
                              </div>
                            </div>

                            <div className="text-right text-muted-foreground text-xs">
                              {formatDateOnly(invoice.issueDate, "en-US")}
                            </div>

                            <div
                              className={`text-right text-xs ${
                                isOverdue
                                  ? "font-medium text-destructive"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {formatDateOnly(invoice.dueDate, "en-US")}
                            </div>

                            <div className="flex justify-end">
                              <Badge
                                variant="outline"
                                className={`rounded px-2 py-0.5 font-semibold text-[10px] uppercase tracking-wider ${
                                  invoice.status === "paid"
                                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : invoice.status === "scheduled"
                                      ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                      : invoice.status === "sent"
                                        ? isOverdue
                                          ? "border-destructive/25 bg-destructive/10 text-destructive"
                                          : "border-blue-500/25 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                        : "border-border bg-muted/40 text-muted-foreground"
                                }`}
                              >
                                {invoice.status === "sent" && isOverdue
                                  ? "overdue"
                                  : invoice.status}
                              </Badge>
                            </div>

                            <div className="text-right font-semibold text-foreground text-sm">
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
                                      className="h-7 w-7 cursor-pointer rounded-lg text-muted-foreground hover:text-foreground"
                                    />
                                  }
                                >
                                  <EllipsisHorizontalIcon className="h-3.5 w-3.5" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="w-40"
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
                                    className="cursor-pointer text-xs"
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
      </ScrollArea>
    </div>
  )
}
