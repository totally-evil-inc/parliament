import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { IconTriangleWarning } from "nucleo-glass"
import { useState } from "react"
import { CustomerCreateSheet } from "../../../features/clients/customer-create-sheet"
import { CustomerDetailsSheet } from "../../../features/clients/customer-details-sheet"
import { CustomerSummaryBar } from "../../../features/clients/customer-summary-bar"
import { CustomersTable } from "../../../features/clients/customers-table"
import {
  getCustomerAnalyticsServerFn,
  listCustomersServerFn,
} from "../../../server/customers"

export const Route = createFileRoute("/_workspace/clients/")({
  component: ClientsHubRoute,
})

function ClientsHubRoute() {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null
  )
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
    (customersError as Error)?.message ||
    (analyticsError as Error)?.message ||
    "Failed to load clients"

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="flex flex-col gap-6 bg-background p-6 text-foreground">
        {/* Page Title & Intro */}
        <div className="flex flex-col justify-between gap-4 border-border border-b pb-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-2xl tracking-tight">
                Client Directory & CRM
              </h1>
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 font-semibold text-primary text-xs">
                {customers.length} Clients
              </span>
            </div>
            <p className="mt-1 text-muted-foreground text-sm">
              Midday-inspired client management with real-time revenue
              analytics, 360° overview, and proposal history.
            </p>
          </div>
        </div>

        {hasError && (
          <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
            <div className="flex items-center gap-2">
              <IconTriangleWarning className="size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                refetchCustomers()
                refetchAnalytics()
              }}
              className="rounded-md bg-destructive px-3 py-1 font-medium text-destructive-foreground text-xs shadow-xs"
            >
              Retry
            </button>
          </div>
        )}

        {/* Top Collapsible Insights Bar */}
        {analytics && (
          <CustomerSummaryBar
            analytics={analytics}
            isLoading={isAnalyticsLoading}
          />
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
    </ScrollArea>
  )
}
