import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { formatMoneyMinor } from "@workspace/document/calculate"
import type { DealStage } from "@workspace/document/schema"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { toast } from "@workspace/ui/components/sonner"
import { getErrorMessage } from "../../../lib/error-formatter"
import {
  convertDealToProposalServerFn,
  createDealServerFn,
  listDealsServerFn,
  updateDealStageServerFn,
} from "../../../server/deals"

export const Route = createFileRoute("/_workspace/clients/deals")({
  component: DealsKanbanRoute,
})

const STAGES: Array<{ id: DealStage; label: string; badgeBg: string; borderAccent: string }> = [
  { id: "lead", label: "Lead / Incoming", badgeBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20", borderAccent: "border-l-blue-500" },
  { id: "discovery", label: "Discovery", badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", borderAccent: "border-l-amber-500" },
  { id: "proposal_sent", label: "Proposal Sent", badgeBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20", borderAccent: "border-l-purple-500" },
  { id: "negotiation", label: "Negotiation", badgeBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20", borderAccent: "border-l-indigo-500" },
  { id: "closed_won", label: "Closed Won", badgeBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", borderAccent: "border-l-emerald-500" },
  { id: "closed_lost", label: "Closed Lost", badgeBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20", borderAccent: "border-l-rose-500" },
]

export function DealsKanbanRoute() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [searchQuery, setSearchQuery] = useState("")
  const [newTitle, setNewTitle] = useState("")
  const [newValue, setNewValue] = useState("5000")
  const [isCreating, setIsCreating] = useState(false)

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["deals"],
    queryFn: async () => await listDealsServerFn(),
  })

  const filteredDeals = useMemo(() => {
    if (!searchQuery.trim()) return deals
    const query = searchQuery.toLowerCase()
    return deals.filter(
      (d) =>
        d.title.toLowerCase().includes(query) ||
        (d.companyName && d.companyName.toLowerCase().includes(query)) ||
        (d.contactEmail && d.contactEmail.toLowerCase().includes(query))
    )
  }, [deals, searchQuery])

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalPipeline = deals
      .filter((d) => d.stage !== "closed_lost")
      .reduce((sum, d) => sum + (d.valueMinorUnits || 0), 0)
    const wonTotal = deals
      .filter((d) => d.stage === "closed_won")
      .reduce((sum, d) => sum + (d.valueMinorUnits || 0), 0)
    const totalCount = deals.length
    const wonCount = deals.filter((d) => d.stage === "closed_won").length
    const winRate = totalCount > 0 ? Math.round((wonCount / totalCount) * 100) : 0

    return { totalPipeline, wonTotal, winRate, activeCount: totalCount }
  }, [deals])

  const updateStageMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: DealStage }) => {
      return await updateDealStageServerFn({ data: { id, stage } })
    },
    onSuccess: () => {
      toast.success("Deal stage updated")
      queryClient.invalidateQueries({ queryKey: ["deals"] })
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Failed to update deal stage"))
    },
  })

  const convertMutation = useMutation({
    mutationFn: async (dealId: string) => {
      return await convertDealToProposalServerFn({ data: { id: dealId } })
    },
    onSuccess: (res) => {
      toast.success("1-Click Proposal Created! Redirecting...")
      queryClient.invalidateQueries({ queryKey: ["deals"] })
      queryClient.invalidateQueries({ queryKey: ["proposals"] })
      navigate({ to: "/proposals/$proposalId", params: { proposalId: res.proposalId } })
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Failed to convert deal to proposal"))
    },
  })

  const createDealMutation = useMutation({
    mutationFn: async () => {
      if (!newTitle.trim()) return
      const valueMinorUnits = Math.round(Number.parseFloat(newValue || "0") * 100)
      return await createDealServerFn({
        data: {
          title: newTitle.trim(),
          stage: "lead",
          valueMinorUnits,
          currency: "USD",
        },
      })
    },
    onSuccess: () => {
      toast.success("Deal created successfully!")
      setNewTitle("")
      setNewValue("5000")
      setIsCreating(false)
      queryClient.invalidateQueries({ queryKey: ["deals"] })
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Failed to create deal"))
    },
  })

  return (
    <div className="flex flex-col h-full min-h-screen bg-background text-foreground p-6 gap-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Deal Pipeline</h1>
            <Badge variant="secondary" className="px-2 py-0.5 text-xs font-semibold">
              {metrics.activeCount} Deals
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Track opportunities, stage transitions, and 1-click convert deals into durable proposals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search deals..."
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
            onClick={() => setIsCreating(true)}
            size="sm"
            className="gap-1"
          >
            <span>+</span> New Deal
          </Button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Total Pipeline Value
          </span>
          <span className="text-xl font-bold font-mono text-foreground">
            {formatMoneyMinor(metrics.totalPipeline, "USD", "en-US")}
          </span>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Closed Won Value
          </span>
          <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {formatMoneyMinor(metrics.wonTotal, "USD", "en-US")}
          </span>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Win Rate
          </span>
          <span className="text-xl font-bold text-foreground">
            {metrics.winRate}%
          </span>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Active Pipeline Count
          </span>
          <span className="text-xl font-bold text-foreground">
            {metrics.activeCount}
          </span>
        </div>
      </div>

      {/* New Deal Modal Dialog */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md p-6 rounded-xl border border-border bg-card shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground">Create New Deal</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsCreating(false)}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              >
                ✕
              </Button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Deal Title *
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Enterprise Web Application"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Estimated Value (USD)
                </label>
                <Input
                  type="number"
                  placeholder="5000"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreating(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={createDealMutation.isPending || !newTitle.trim()}
                onClick={() => createDealMutation.mutate()}
              >
                {createDealMutation.isPending ? "Creating..." : "Save Deal"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board ScrollArea */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12 text-muted-foreground text-sm">
          Loading deals pipeline...
        </div>
      ) : (
        <ScrollArea orientation="horizontal" className="w-full flex-1">
          <div className="flex gap-4 pb-4 pt-1 min-w-max">
            {STAGES.map((col) => {
              const colDeals = filteredDeals.filter((d) => d.stage === col.id)
              const colTotal = colDeals.reduce((sum, d) => sum + (d.valueMinorUnits || 0), 0)

              return (
                <div
                  key={col.id}
                  className="w-80 shrink-0 flex flex-col bg-muted/30 rounded-xl border border-border/80 p-3.5 gap-3"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border ${col.badgeBg}`}>
                        {col.label}
                      </span>
                      <span className="text-xs text-muted-foreground font-semibold">
                        ({colDeals.length})
                      </span>
                    </div>
                    <span className="text-xs font-mono font-medium text-foreground">
                      {formatMoneyMinor(colTotal, "USD", "en-US")}
                    </span>
                  </div>

                  {/* Column Deals List */}
                  <div className="flex flex-col gap-3 flex-1 overflow-y-auto min-h-[220px]">
                    {colDeals.map((dealItem) => (
                      <div
                        key={dealItem.id}
                        className={`p-3.5 rounded-lg bg-card border border-border ${col.borderAccent} border-l-4 shadow-sm flex flex-col gap-2.5 transition-all hover:shadow-md hover:border-primary/40`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-sm leading-snug text-foreground whitespace-normal">
                            {dealItem.title}
                          </span>
                        </div>

                        {dealItem.companyName && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            🏢 {dealItem.companyName}
                          </span>
                        )}

                        <div className="flex items-center justify-between mt-1 pt-2 border-t border-border/40">
                          <span className="font-mono text-xs font-semibold text-foreground">
                            {formatMoneyMinor(dealItem.valueMinorUnits, dealItem.currency || "USD", "en-US")}
                          </span>

                          {/* Refactored Stage Select Dropdown using @workspace/ui Select */}
                          <Select
                            value={dealItem.stage}
                            onValueChange={(val) => {
                              if (val) {
                                updateStageMutation.mutate({
                                  id: dealItem.id,
                                  stage: val as DealStage,
                                })
                              }
                            }}
                          >
                            <SelectTrigger size="sm" className="h-6 text-[10px] px-2 py-0">
                              <SelectValue placeholder="Stage" />
                            </SelectTrigger>
                            <SelectContent align="end">
                              {STAGES.map((s) => (
                                <SelectItem key={s.id} value={s.id} className="text-xs">
                                  {s.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Convert to Proposal Button */}
                        {!dealItem.proposalId ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={convertMutation.isPending}
                            onClick={() => convertMutation.mutate(dealItem.id)}
                            className="mt-1 w-full text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 border-primary/20"
                          >
                            ⚡ 1-Click Convert to Proposal
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              navigate({
                                to: "/proposals/$proposalId",
                                params: { proposalId: dealItem.proposalId as string },
                              })
                            }
                            className="mt-1 w-full text-xs font-semibold"
                          >
                            📄 View Linked Proposal
                          </Button>
                        )}
                      </div>
                    ))}

                    {colDeals.length === 0 && (
                      <div className="p-4 text-center text-xs text-muted-foreground/60 border border-dashed border-border/50 rounded-lg my-auto">
                        No deals in stage
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
