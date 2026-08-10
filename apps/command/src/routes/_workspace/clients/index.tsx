import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { CustomerCreateSheet } from "../../../features/clients/customer-create-sheet"
import { CustomerDetailsSheet } from "../../../features/clients/customer-details-sheet"
import { CustomerSummaryBar } from "../../../features/clients/customer-summary-bar"
import { CustomersTable } from "../../../features/clients/customers-table"
import { getCustomerAnalyticsServerFn, listCustomersServerFn } from "../../../server/customers"

export const Route = createFileRoute("/_workspace/clients/")({
  component: ClientsHubRoute,
})

export function ClientsHubRoute() {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const {
    data: customers = [],
    isLoading: isCustomersLoading,
    error: customersError,
    refetch: refetchCustomers,
  } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => await listCustomersServerFn(),
  })

  const {
    data: analytics,
    isLoading: isAnalyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics,
  } = useQuery({
    queryKey: ["customer-analytics"],
    queryFn: async () => await getCustomerAnalyticsServerFn(),
  })

  const hasError = Boolean(customersError || analyticsError)
  const errorMessage =
    (customersError as Error)?.message || (analyticsError as Error)?.message || "Failed to load clients"

  return (
    <div className="flex flex-col h-full min-h-screen bg-background text-foreground p-6 gap-6">
      {/* Page Title & Intro */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Client Directory & CRM</h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary/10 text-primary border border-primary/20">
              {customers.length} Clients
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Midday-inspired client management with real-time revenue analytics, 360° overview, and proposal history.
          </p>
        </div>
      </div>

      {hasError && (
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              refetchCustomers()
              refetchAnalytics()
            }}
            className="px-3 py-1 bg-destructive text-destructive-foreground font-medium text-xs rounded-md shadow-xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* Top Collapsible Insights Bar */}
      {analytics && (
        <CustomerSummaryBar analytics={analytics} isLoading={isAnalyticsLoading} />
      )}

      {/* Customers Data Table */}
      <CustomersTable
        customers={customers}
        isLoading={isCustomersLoading}
        onSelectCustomer={(id) => setSelectedCustomerId(id)}
        onNewClient={() => setIsCreateOpen(true)}
      />

      {/* Slide-over Drawers */}
      <CustomerDetailsSheet
        customerId={selectedCustomerId}
        onClose={() => setSelectedCustomerId(null)}
      />

      <CustomerCreateSheet
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </div>
  )
}
