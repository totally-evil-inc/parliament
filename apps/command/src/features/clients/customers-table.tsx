import { formatMoneyMinor } from "@workspace/document/calculate"
import type { CustomerStatus } from "@workspace/document/schema"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { PlusIcon, UsersIcon, XMarkIcon } from "@heroicons/react/24/outline"
import { useMemo, useState } from "react"

type CustomerRow = {
  id: string
  name: string
  billingEmail: string | null
  website: string | null
  city: string | null
  country: string | null
  status: CustomerStatus
  preferredCurrency: string
  isArchived: boolean
  totalRevenueMinorUnits: number
  proposalsCount: number
}

type Props = {
  customers: CustomerRow[]
  isLoading?: boolean
  onSelectCustomer: (id: string) => void
  onNewClient: () => void
}

export function CustomersTable({
  customers,
  isLoading,
  onSelectCustomer,
  onNewClient,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | CustomerStatus>(
    "all"
  )

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch =
        !searchQuery.trim() ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.billingEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.city?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter === "all" || c.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [customers, searchQuery, statusFilter])

  return (
    <div className="flex flex-col gap-4">
      {/* Header controls & tabs */}
      <div className="flex flex-col justify-between gap-4 border-border border-b pb-3 sm:flex-row sm:items-center">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
          <Button
            type="button"
            variant={statusFilter === "all" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter("all")}
            className="h-7 px-3 font-semibold text-xs"
          >
            All Clients ({customers.length})
          </Button>
          <Button
            type="button"
            variant={statusFilter === "active" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter("active")}
            className="h-7 px-3 font-semibold text-xs"
          >
            Active
          </Button>
          <Button
            type="button"
            variant={statusFilter === "lead" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter("lead")}
            className="h-7 px-3 font-semibold text-xs"
          >
            Leads
          </Button>
          <Button
            type="button"
            variant={statusFilter === "inactive" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter("inactive")}
            className="h-7 px-3 font-semibold text-xs"
          >
            Inactive
          </Button>
        </div>

        {/* Search & Add Client Button */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 lg:w-64"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute top-1.5 right-2 text-muted-foreground text-xs hover:text-foreground"
              >
                <XMarkIcon className="size-3.5" />
              </button>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            onClick={onNewClient}
            className="gap-1.5"
          >
            <PlusIcon className="size-3.5" />
            <span>Add Client</span>
          </Button>
        </div>
      </div>

      {/* Customers Table */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12 text-muted-foreground text-sm">
          Loading client directory...
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border/80 border-dashed bg-card/30 p-12 text-center">
          <UsersIcon className="size-10 text-muted-foreground/50" />
          <div className="flex flex-col gap-1">
            <h3 className="font-bold text-foreground text-sm">
              No clients found
            </h3>
            <p className="text-muted-foreground text-xs">
              {searchQuery
                ? "No clients match your filter criteria."
                : "Get started by adding your first client."}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={onNewClient}
            className="mt-2 gap-1.5"
          >
            <PlusIcon className="size-3.5" />
            <span>Add Client</span>
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-border border-b bg-muted/40 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                <th className="px-4 py-3">Client Name</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Billing Email</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3 text-right">Proposals</th>
                <th className="px-4 py-3 text-right">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCustomers.map((cust) => (
                <tr
                  key={cust.id}
                  onClick={() => onSelectCustomer(cust.id)}
                  className="cursor-pointer transition-colors hover:bg-muted/50"
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 font-bold text-primary text-xs">
                        {cust.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground leading-tight">
                          {cust.name}
                        </span>
                        {cust.website && (
                          <span className="text-[11px] text-muted-foreground">
                            {cust.website.replace(/^https?:\/\//, "")}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3.5">
                    <Badge
                      variant="outline"
                      className={`px-2 py-0.5 font-bold text-[10px] uppercase ${
                        cust.status === "active"
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : cust.status === "lead"
                            ? "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            : "border-border bg-muted text-muted-foreground"
                      }`}
                    >
                      {cust.status}
                    </Badge>
                  </td>

                  <td className="px-4 py-3.5 text-muted-foreground">
                    {cust.billingEmail || "—"}
                  </td>

                  <td className="px-4 py-3.5 text-muted-foreground text-xs">
                    {[cust.city, cust.country].filter(Boolean).join(", ") ||
                      "—"}
                  </td>

                  <td className="px-4 py-3.5 text-right font-medium text-foreground">
                    {cust.proposalsCount}
                  </td>

                  <td className="px-4 py-3.5 text-right font-mono font-semibold text-foreground">
                    {formatMoneyMinor(
                      cust.totalRevenueMinorUnits,
                      cust.preferredCurrency || "USD",
                      "en-US"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
