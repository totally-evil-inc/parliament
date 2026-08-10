import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { formatMoneyMinor } from "@workspace/document/calculate"
import type { DealStage } from "@workspace/document/schema"
import {
  convertDealToProposalServerFn,
  createDealServerFn,
  listDealsServerFn,
  updateDealStageServerFn,
} from "../../../server/deals"

export const Route = createFileRoute("/_workspace/clients/deals")({
  component: DealsKanbanRoute,
})

const STAGES: Array<{ id: DealStage; label: string; color: string }> = [
  { id: "lead", label: "Lead / Incoming", color: "border-l-blue-500" },
  { id: "discovery", label: "Discovery", color: "border-l-amber-500" },
  { id: "proposal_sent", label: "Proposal Sent", color: "border-l-purple-500" },
  { id: "negotiation", label: "Negotiation", color: "border-l-indigo-500" },
  { id: "closed_won", label: "Closed Won", color: "border-l-emerald-500" },
  { id: "closed_lost", label: "Closed Lost", color: "border-l-rose-500" },
]

export function DealsKanbanRoute() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [newTitle, setNewTitle] = useState("")
  const [newValue, setNewValue] = useState("5000")
  const [isCreating, setIsCreating] = useState(false)

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["deals"],
    queryFn: async () => await listDealsServerFn(),
  })

  const updateStageMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: DealStage }) => {
      return await updateDealStageServerFn({ data: { id, stage } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] })
    },
  })

  const convertMutation = useMutation({
    mutationFn: async (dealId: string) => {
      return await convertDealToProposalServerFn({ data: { id: dealId } })
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["deals"] })
      queryClient.invalidateQueries({ queryKey: ["proposals"] })
      navigate({ to: "/proposals/$proposalId", params: { proposalId: res.proposalId } })
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
      setNewTitle("")
      setNewValue("5000")
      setIsCreating(false)
      queryClient.invalidateQueries({ queryKey: ["deals"] })
    },
  })

  return (
    <div className="flex flex-col h-full min-h-screen bg-background text-foreground p-6 gap-6">
      {/* Header section */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Deal Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage lead progress and convert deals into active persisted proposals.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreating(!isCreating)}
          className="px-4 py-2 bg-primary text-primary-foreground font-medium text-sm rounded-md shadow hover:bg-primary/90 transition-colors"
        >
          {isCreating ? "Cancel" : "+ New Deal"}
        </button>
      </div>

      {/* New Deal Creation Box */}
      {isCreating && (
        <div className="p-4 rounded-lg border border-border bg-card shadow-sm flex flex-wrap items-center gap-4">
          <input
            type="text"
            placeholder="Deal Title (e.g. Acme Website Redesign)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1 min-w-[240px] px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <input
            type="number"
            placeholder="Estimated Amount (USD)"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="w-40 px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            type="button"
            disabled={createDealMutation.isPending || !newTitle.trim()}
            onClick={() => createDealMutation.mutate()}
            className="px-4 py-2 bg-primary text-primary-foreground font-medium text-sm rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {createDealMutation.isPending ? "Creating..." : "Save Deal"}
          </button>
        </div>
      )}

      {/* Kanban Board Columns */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12 text-muted-foreground text-sm">
          Loading deals pipeline...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 flex-1">
          {STAGES.map((col) => {
            const colDeals = deals.filter((d) => d.stage === col.id)
            const colTotal = colDeals.reduce((sum, d) => sum + (d.valueMinorUnits || 0), 0)

            return (
              <div
                key={col.id}
                className="flex flex-col bg-muted/40 rounded-lg border border-border p-3 gap-3"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {col.label} ({colDeals.length})
                  </span>
                  <span className="text-xs font-medium text-foreground">
                    {formatMoneyMinor(colTotal, "USD", "en-US")}
                  </span>
                </div>

                {/* Column Deals List */}
                <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
                  {colDeals.map((dealItem) => (
                    <div
                      key={dealItem.id}
                      className={`p-3 rounded-md bg-card border border-border ${col.color} border-l-4 shadow-sm flex flex-col gap-2 transition-all hover:shadow-md`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-sm leading-tight text-foreground">
                          {dealItem.title}
                        </span>
                      </div>

                      {dealItem.companyName && (
                        <span className="text-xs text-muted-foreground">
                          🏢 {dealItem.companyName}
                        </span>
                      )}

                      <div className="flex items-center justify-between mt-1 pt-2 border-t border-border/50">
                        <span className="font-mono text-xs font-medium text-foreground">
                          {formatMoneyMinor(dealItem.valueMinorUnits, dealItem.currency || "USD", "en-US")}
                        </span>
                        
                        {/* Stage Selector */}
                        <select
                          value={dealItem.stage}
                          onChange={(e) =>
                            updateStageMutation.mutate({
                              id: dealItem.id,
                              stage: e.target.value as DealStage,
                            })
                          }
                          className="text-[10px] px-1.5 py-0.5 rounded border border-input bg-background font-medium focus:outline-none"
                        >
                          {STAGES.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Convert to Proposal Button */}
                      {!dealItem.proposalId ? (
                        <button
                          type="button"
                          disabled={convertMutation.isPending}
                          onClick={() => convertMutation.mutate(dealItem.id)}
                          className="mt-1 w-full py-1 text-[11px] font-medium bg-primary/10 text-primary hover:bg-primary/20 rounded border border-primary/20 transition-colors flex items-center justify-center gap-1"
                        >
                          ⚡ Convert to Proposal
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            navigate({
                              to: "/proposals/$proposalId",
                              params: { proposalId: dealItem.proposalId as string },
                            })
                          }
                          className="mt-1 w-full py-1 text-[11px] font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded transition-colors flex items-center justify-center gap-1"
                        >
                          📄 View Proposal
                        </button>
                      )}
                    </div>
                  ))}

                  {colDeals.length === 0 && (
                    <div className="p-4 text-center text-xs text-muted-foreground/60 border border-dashed border-border/60 rounded-md">
                      No deals
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
