import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { formatMoneyMinor } from "@workspace/document/calculate"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { toast } from "@workspace/ui/components/sonner"
import { GlobeAltIcon, PlusIcon } from "@heroicons/react/24/outline"
import { useState } from "react"
import { getErrorMessage } from "../../lib/error-formatter"
import {
  getCustomerDetailsServerFn,
  updateCustomerServerFn,
} from "../../server/customers"
import { createDealServerFn } from "../../server/deals"

type Props = {
  customerId: string | null
  onClose: () => void
}

export function CustomerDetailsSheet({ customerId, onClose }: Props) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<
    "overview" | "deals" | "proposals"
  >("overview")

  const isOpen = Boolean(customerId)

  const { data, isLoading, error } = useQuery({
    queryKey: ["customer-details", customerId],
    queryFn: async () => {
      if (!customerId) return null
      return await getCustomerDetailsServerFn({ data: { id: customerId } })
    },
    enabled: isOpen,
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
      toast.success("New deal created successfully!")
      queryClient.invalidateQueries({
        queryKey: ["customer-details", customerId],
      })
      queryClient.invalidateQueries({ queryKey: ["deals"] })
      navigate({ to: "/clients/deals" })
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Failed to create deal"))
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
    onSuccess: (res) => {
      const isArchived = res?.isArchived
      toast.success(
        isArchived
          ? "Client archived successfully"
          : "Client unarchived successfully"
      )
      queryClient.invalidateQueries({
        queryKey: ["customer-details", customerId],
      })
      queryClient.invalidateQueries({ queryKey: ["customers"] })
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Failed to update client status"))
    },
  })

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full max-w-2xl gap-6 overflow-y-auto border-border border-l bg-card p-6 shadow-2xl sm:max-w-2xl"
      >
        {isLoading || !data ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground text-sm">
            {error ? (
              <span className="font-medium text-destructive">
                {getErrorMessage(error, "Unable to load client profile")}
              </span>
            ) : (
              "Loading client profile..."
            )}
          </div>
        ) : (
          <>
            {/* Header section */}
            <SheetHeader className="border-border border-b p-0 pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 font-bold text-lg text-primary">
                    {data.customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <SheetTitle className="font-bold text-foreground text-xl leading-tight">
                        {data.customer.name}
                      </SheetTitle>
                      <Badge
                        variant="outline"
                        className="border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-bold text-[10px] text-emerald-600 uppercase dark:text-emerald-400"
                      >
                        {data.customer.status}
                      </Badge>
                    </div>
                    {data.customer.website && (
                      <a
                        href={data.customer.website}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-0.5 flex items-center gap-1 text-muted-foreground text-xs transition-colors hover:text-primary"
                      >
                        <GlobeAltIcon className="size-3.5 shrink-0" />
                        <span>
                          {data.customer.website.replace(/^https?:\/\//, "")}
                        </span>
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="flex items-center gap-2 pt-3">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => createDealMutation.mutate()}
                  disabled={createDealMutation.isPending}
                  className="gap-1.5"
                >
                  <PlusIcon className="size-3.5" />
                  <span>New Deal</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toggleArchiveMutation.mutate()}
                >
                  {data.customer.isArchived
                    ? "Unarchive Client"
                    : "Archive Client"}
                </Button>
              </div>
            </SheetHeader>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-4 border-border border-b font-medium text-sm">
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className={`border-b-2 pb-2 transition-all ${
                  activeTab === "overview"
                    ? "border-primary font-semibold text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Overview & Contact
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("deals")}
                className={`flex items-center gap-1.5 border-b-2 pb-2 transition-all ${
                  activeTab === "deals"
                    ? "border-primary font-semibold text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Deals ({data.deals.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("proposals")}
                className={`flex items-center gap-1.5 border-b-2 pb-2 transition-all ${
                  activeTab === "proposals"
                    ? "border-primary font-semibold text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Proposals ({data.proposals.length})
              </button>
            </div>

            {/* Tab 1: Overview */}
            {activeTab === "overview" && (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-muted/30 p-4">
                  <div>
                    <span className="block font-bold text-[10px] text-muted-foreground uppercase">
                      Billing Email
                    </span>
                    <span className="font-medium text-foreground text-sm">
                      {data.customer.billingEmail || "Not specified"}
                    </span>
                  </div>

                  <div>
                    <span className="block font-bold text-[10px] text-muted-foreground uppercase">
                      Phone Number
                    </span>
                    <span className="font-medium text-foreground text-sm">
                      {data.customer.phone || "Not specified"}
                    </span>
                  </div>

                  <div>
                    <span className="block font-bold text-[10px] text-muted-foreground uppercase">
                      VAT / Tax ID
                    </span>
                    <span className="font-medium font-mono text-foreground text-sm">
                      {data.customer.vatNumber || "None"}
                    </span>
                  </div>

                  <div>
                    <span className="block font-bold text-[10px] text-muted-foreground uppercase">
                      Preferred Currency
                    </span>
                    <span className="font-semibold text-foreground text-sm">
                      {data.customer.preferredCurrency || "USD"}
                    </span>
                  </div>
                </div>

                {/* Key Contacts */}
                <div className="flex flex-col gap-3">
                  <h4 className="font-bold text-muted-foreground text-xs uppercase tracking-wider">
                    Key Contacts ({data.contacts.length})
                  </h4>
                  {data.contacts.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {data.contacts.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                        >
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground text-sm">
                              {c.firstName} {c.lastName}{" "}
                              {c.title && `(${c.title})`}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {c.email}
                            </span>
                          </div>
                          {c.isPrimary && (
                            <Badge
                              variant="secondary"
                              className="px-2 py-0.5 font-bold text-[9px] uppercase"
                            >
                              Primary
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border border-dashed p-4 text-center text-muted-foreground text-xs">
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
                      className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-xs"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-foreground text-sm">
                          {deal.title}
                        </span>
                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                          <span className="font-medium text-primary capitalize">
                            {deal.stage.replace("_", " ")}
                          </span>
                          <span>•</span>
                          <span className="font-mono">
                            {formatMoneyMinor(
                              deal.valueMinorUnits,
                              deal.currency || "USD",
                              "en-US"
                            )}
                          </span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate({ to: "/clients/deals" })}
                      >
                        View in Pipeline
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-border border-dashed p-8 text-center text-muted-foreground text-xs">
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
                      className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-xs"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-foreground text-sm">
                          {prop.title}
                        </span>
                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                          <span className="font-medium capitalize">
                            {prop.status}
                          </span>
                          <span>•</span>
                          <span className="font-mono">
                            {formatMoneyMinor(
                              prop.totalMinorUnits,
                              prop.currency || "USD",
                              "en-US"
                            )}
                          </span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          navigate({
                            to: "/proposals/$proposalId",
                            params: { proposalId: prop.id },
                          })
                        }
                      >
                        Open Editor
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-border border-dashed p-8 text-center text-muted-foreground text-xs">
                    No proposals created for this client yet.
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
