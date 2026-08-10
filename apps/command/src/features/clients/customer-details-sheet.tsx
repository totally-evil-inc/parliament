import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { formatMoneyMinor } from "@workspace/document/calculate"
import { createDealServerFn } from "../../server/deals"
import { getCustomerDetailsServerFn, updateCustomerServerFn } from "../../server/customers"

type Props = {
  customerId: string | null
  onClose: () => void
}

export function CustomerDetailsSheet({ customerId, onClose }: Props) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<"overview" | "deals" | "proposals">("overview")

  const { data, isLoading } = useQuery({
    queryKey: ["customer-details", customerId],
    queryFn: async () => {
      if (!customerId) return null
      return await getCustomerDetailsServerFn({ data: { id: customerId } })
    },
    enabled: Boolean(customerId),
  })

  const createDealMutation = useMutation({
    mutationFn: async () => {
      if (!data?.customer) return
      return await createDealServerFn({
        data: {
          title: `Deal with ${data.customer.name}`,
          companyId: data.customer.id,
          stage: "lead",
          valueMinorUnits: 1000000,
          currency: data.customer.preferredCurrency || "USD",
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-details", customerId] })
      queryClient.invalidateQueries({ queryKey: ["deals"] })
      navigate({ to: "/clients/deals" })
    },
  })

  const toggleArchiveMutation = useMutation({
    mutationFn: async () => {
      if (!data?.customer) return
      return await updateCustomerServerFn({
        data: {
          id: data.customer.id,
          isArchived: !data.customer.isArchived,
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-details", customerId] })
      queryClient.invalidateQueries({ queryKey: ["customers"] })
    },
  })

  if (!customerId) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl h-full bg-card border-l border-border shadow-2xl flex flex-col p-6 overflow-y-auto gap-6 animate-in slide-in-from-right">
        {isLoading || !data ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground text-sm">
            Loading client profile...
          </div>
        ) : (
          <>
            {/* Header section */}
            <div className="flex flex-col gap-4 border-b border-border pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary font-bold text-lg flex items-center justify-center border border-primary/20">
                    {data.customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-foreground leading-tight">
                        {data.customer.name}
                      </h2>
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                        {data.customer.status}
                      </span>
                    </div>
                    {data.customer.website && (
                      <a
                        href={data.customer.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 mt-0.5"
                      >
                        🌐 {data.customer.website.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Quick Actions Bar */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => createDealMutation.mutate()}
                  disabled={createDealMutation.isPending}
                  className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-md hover:bg-primary/90 transition-all flex items-center gap-1"
                >
                  ➕ New Deal
                </button>
                <button
                  type="button"
                  onClick={() => toggleArchiveMutation.mutate()}
                  className="px-3 py-1.5 border border-border text-xs font-medium rounded-md hover:bg-muted transition-colors"
                >
                  {data.customer.isArchived ? "Unarchive Client" : "Archive Client"}
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-4 border-b border-border text-sm font-medium">
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className={`pb-2 border-b-2 transition-all ${
                  activeTab === "overview"
                    ? "border-primary text-primary font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Overview & Contact
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("deals")}
                className={`pb-2 border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === "deals"
                    ? "border-primary text-primary font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Deals ({data.deals.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("proposals")}
                className={`pb-2 border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === "proposals"
                    ? "border-primary text-primary font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Proposals ({data.proposals.length})
              </button>
            </div>

            {/* Tab 1: Overview */}
            {activeTab === "overview" && (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-muted/30 border border-border">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Billing Email
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {data.customer.billingEmail || "Not specified"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Phone Number
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {data.customer.phone || "Not specified"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      VAT / Tax ID
                    </span>
                    <span className="text-sm font-mono font-medium text-foreground">
                      {data.customer.vatNumber || "None"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Preferred Currency
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {data.customer.preferredCurrency || "USD"}
                    </span>
                  </div>
                </div>

                {/* Key Contacts */}
                <div className="flex flex-col gap-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Key Contacts ({data.contacts.length})
                  </h4>
                  {data.contacts.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {data.contacts.map((c) => (
                        <div
                          key={c.id}
                          className="p-3 rounded-lg border border-border bg-card flex items-center justify-between"
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-foreground">
                              {c.firstName} {c.lastName} {c.title && `(${c.title})`}
                            </span>
                            <span className="text-xs text-muted-foreground">{c.email}</span>
                          </div>
                          {c.isPrimary && (
                            <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-primary/10 text-primary">
                              Primary
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                      No contacts registered for this client.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: Deals */}
            {activeTab === "deals" && (
              <div className="flex flex-col gap-3">
                {data.deals.length > 0 ? (
                  data.deals.map((deal) => (
                    <div
                      key={deal.id}
                      className="p-4 rounded-xl border border-border bg-card shadow-xs flex items-center justify-between"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-sm text-foreground">{deal.title}</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="capitalize font-medium text-primary">{deal.stage.replace("_", " ")}</span>
                          <span>•</span>
                          <span className="font-mono">
                            {formatMoneyMinor(deal.valueMinorUnits, deal.currency || "USD", "en-US")}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate({ to: "/clients/deals" })}
                        className="px-3 py-1.5 text-xs font-semibold bg-muted hover:bg-muted/80 rounded-md transition-colors"
                      >
                        View in Pipeline
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                    No active deals in pipeline for this client.
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Proposals */}
            {activeTab === "proposals" && (
              <div className="flex flex-col gap-3">
                {data.proposals.length > 0 ? (
                  data.proposals.map((prop) => (
                    <div
                      key={prop.id}
                      className="p-4 rounded-xl border border-border bg-card shadow-xs flex items-center justify-between"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-sm text-foreground">{prop.title}</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="capitalize font-medium">{prop.status}</span>
                          <span>•</span>
                          <span className="font-mono">
                            {formatMoneyMinor(prop.totalMinorUnits, prop.currency || "USD", "en-US")}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          navigate({
                            to: "/proposals/$proposalId",
                            params: { proposalId: prop.id },
                          })
                        }
                        className="px-3 py-1.5 text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors"
                      >
                        Open Editor
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                    No proposals created for this client yet.
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
