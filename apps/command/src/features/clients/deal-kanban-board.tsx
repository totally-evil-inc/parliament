import { useMemo, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { formatMoneyMinor } from "@workspace/document/calculate"
import type { DealStage } from "@workspace/document/schema"
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

type DealRow = {
  id: string
  title: string
  stage: DealStage
  valueMinorUnits: number
  currency: string
  companyName: string | null
  contactEmail: string | null
  proposalId: string | null
}

type Props = {
  deals: DealRow[]
  isLoading?: boolean
  onUpdateStage: (id: string, stage: DealStage) => void
  onConvertProposal: (dealId: string) => void
  isConverting?: boolean
}

const STAGES: Array<{ id: DealStage; label: string; badgeBg: string; borderAccent: string }> = [
  { id: "lead", label: "Lead / Incoming", badgeBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20", borderAccent: "border-l-blue-500" },
  { id: "discovery", label: "Discovery", badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", borderAccent: "border-l-amber-500" },
  { id: "proposal_sent", label: "Proposal Sent", badgeBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20", borderAccent: "border-l-purple-500" },
  { id: "negotiation", label: "Negotiation", badgeBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20", borderAccent: "border-l-indigo-500" },
  { id: "closed_won", label: "Closed Won", badgeBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", borderAccent: "border-l-emerald-500" },
  { id: "closed_lost", label: "Closed Lost", badgeBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20", borderAccent: "border-l-rose-500" },
]

export function DealKanbanBoard({
  deals,
  isLoading,
  onUpdateStage,
  onConvertProposal,
  isConverting,
}: Props) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState("")

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

  return (
    <div className="flex flex-col gap-4">
      {/* Board toolbar */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <span className="text-xs text-muted-foreground font-medium">
          Drag/select stage dropdown to advance opportunities
        </span>
        <Input
          type="text"
          placeholder="Filter board deals..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-48 lg:w-64"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12 text-muted-foreground text-sm">
          Loading deals board...
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

                          <Select
                            value={dealItem.stage}
                            onValueChange={(val) => {
                              if (val) {
                                onUpdateStage(dealItem.id, val as DealStage)
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

                        {!dealItem.proposalId ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isConverting}
                            onClick={() => onConvertProposal(dealItem.id)}
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
