import { useMemo, useState } from "react"
import { formatMoneyMinor } from "@workspace/document/calculate"
import type { CustomerStatus } from "@workspace/document/schema"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"

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
  const [statusFilter, setStatusFilter] = useState<"all" | CustomerStatus>("all")

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch =
        !searchQuery.trim() ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.billingEmail && c.billingEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.city && c.city.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesStatus = statusFilter === "all" || c.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [customers, searchQuery, statusFilter])

  return (
    <div className="flex flex-col gap-4">
      {/* Header controls & tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border">
          <Button
            type="button"
            variant={statusFilter === "all" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter("all")}
            className="h-7 text-xs px-3 font-semibold"
          >
            All Clients ({customers.length})
          </Button>
          <Button
            type="button"
            variant={statusFilter === "active" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter("active")}
            className="h-7 text-xs px-3 font-semibold"
          >
            Active
          </Button>
          <Button
            type="button"
            variant={statusFilter === "lead" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter("lead")}
            className="h-7 text-xs px-3 font-semibold"
          >
            Leads
          </Button>
          <Button
            type="button"
            variant={statusFilter === "inactive" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter("inactive")}
            className="h-7 text-xs px-3 font-semibold"
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
                className="absolute right-2 top-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            onClick={onNewClient}
            className="gap-1"
          >
            <span>+</span> Add Client
          </Button>
        </div>
      </div>

      {/* Customers Table */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12 text-muted-foreground text-sm">
          Loading client directory...
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border/80 rounded-xl bg-card/30 gap-3">
          <span className="text-3xl">🏢</span>
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-bold text-foreground">No clients found</h3>
            <p className="text-xs text-muted-foreground">
              {searchQuery ? "No clients match your filter criteria." : "Get started by adding your first client."}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={onNewClient}
            className="mt-2"
          >
            + Add Client
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-4">Client Name</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Billing Email</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4 text-right">Proposals</th>
                <th className="py-3 px-4 text-right">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCustomers.map((cust) => (
                <tr
                  key={cust.id}
                  onClick={() => onSelectCustomer(cust.id)}
                  className="hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center border border-primary/20">
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

                  <td className="py-3.5 px-4">
                    <Badge variant="outline" className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                      cust.status === "active"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : cust.status === "lead"
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                        : "bg-muted text-muted-foreground border-border"
                    }`}>
                      {cust.status}
                    </Badge>
                  </td>

                  <td className="py-3.5 px-4 text-muted-foreground">
                    {cust.billingEmail || "—"}
                  </td>

                  <td className="py-3.5 px-4 text-muted-foreground text-xs">
                    {[cust.city, cust.country].filter(Boolean).join(", ") || "—"}
                  </td>

                  <td className="py-3.5 px-4 text-right font-medium text-foreground">
                    {cust.proposalsCount}
                  </td>

                  <td className="py-3.5 px-4 text-right font-mono font-semibold text-foreground">
                    {formatMoneyMinor(cust.totalRevenueMinorUnits, cust.preferredCurrency || "USD", "en-US")}
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
