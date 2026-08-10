import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import type { DealStage } from "@workspace/document/schema"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { toast } from "@workspace/ui/components/sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { DealKanbanBoard } from "../../../features/clients/deal-kanban-board"
import { DealKpiCards } from "../../../features/clients/deal-kpi-cards"
import { DealPipelineChart } from "../../../features/clients/deal-pipeline-chart"
import { DealStageBreakdown } from "../../../features/clients/deal-stage-breakdown"
import { DealsTable } from "../../../features/clients/deals-table"
import { getErrorMessage } from "../../../lib/error-formatter"
import {
  convertDealToProposalServerFn,
  createDealServerFn,
  getDealAnalyticsServerFn,
  listDealsServerFn,
  updateDealStageServerFn,
} from "../../../server/deals"

export const Route = createFileRoute("/_workspace/clients/deals")({
  component: DealsKanbanRoute,
})

export function DealsKanbanRoute() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<"pipeline" | "board" | "table">("pipeline")
  const [isCreating, setIsCreating] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newValue, setNewValue] = useState("5000")

  // Data queries
  const { data: deals = [], isLoading: isDealsLoading } = useQuery({
    queryKey: ["deals"],
    queryFn: async () => await listDealsServerFn(),
  })

  const { data: analytics, isLoading: isAnalyticsLoading } = useQuery({
    queryKey: ["deal-analytics"],
    queryFn: async () => await getDealAnalyticsServerFn(),
  })

  // Mutations
  const updateStageMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: DealStage }) => {
      return await updateDealStageServerFn({ data: { id, stage } })
    },
    onSuccess: () => {
      toast.success("Deal stage updated")
      queryClient.invalidateQueries({ queryKey: ["deals"] })
      queryClient.invalidateQueries({ queryKey: ["deal-analytics"] })
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
      queryClient.invalidateQueries({ queryKey: ["deal-analytics"] })
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
      queryClient.invalidateQueries({ queryKey: ["deal-analytics"] })
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
            <h1 className="text-2xl font-bold tracking-tight">Deal Pipeline & Analytics</h1>
            <Badge variant="secondary" className="px-2 py-0.5 text-xs font-semibold">
              {deals.length} Deals
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Midday-inspired pipeline overview, conversion analytics, and 1-click proposal handoff.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={() => setIsCreating(true)}
            size="sm"
            className="gap-1 font-semibold"
          >
            <span>+</span> New Deal
          </Button>
        </div>
      </div>

      {/* KPI Cards Row */}
      {analytics && (
        <DealKpiCards analytics={analytics} isLoading={isAnalyticsLoading} />
      )}

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as typeof activeTab)}>
        <div className="flex items-center justify-between border-b border-border pb-2">
          <TabsList variant="line">
            <TabsTrigger value="pipeline">Pipeline Overview</TabsTrigger>
            <TabsTrigger value="board">Kanban Board</TabsTrigger>
            <TabsTrigger value="table">All Deals Table</TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Pipeline Analytics (Bar Chart + Funnel Breakdown) */}
        <TabsContent value="pipeline" className="mt-4">
          {analytics ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <DealPipelineChart monthlyData={analytics.monthlyPipeline} />
              </div>
              <div className="lg:col-span-1">
                <DealStageBreakdown stageData={analytics.stageBreakdown} />
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-muted-foreground text-sm">
              Loading pipeline analytics...
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Kanban Board View */}
        <TabsContent value="board" className="mt-4">
          <DealKanbanBoard
            deals={deals}
            isLoading={isDealsLoading}
            onUpdateStage={(id, stage) => updateStageMutation.mutate({ id, stage })}
            onConvertProposal={(dealId) => convertMutation.mutate(dealId)}
            isConverting={convertMutation.isPending}
          />
        </TabsContent>

        {/* Tab 3: Sortable Deal Table View */}
        <TabsContent value="table" className="mt-4">
          <DealsTable
            deals={deals}
            isLoading={isDealsLoading}
            onConvertProposal={(dealId) => convertMutation.mutate(dealId)}
            isConverting={convertMutation.isPending}
          />
        </TabsContent>
      </Tabs>

      {/* Create New Deal Dialog Modal */}
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
    </div>
  )
}
