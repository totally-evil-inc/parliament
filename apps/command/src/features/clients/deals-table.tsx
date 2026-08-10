import { useMemo, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { formatDateOnly, formatMoneyMinor } from "@workspace/document/calculate"
import type { DealStage } from "@workspace/document/schema"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

type DealRow = {
  id: string
  title: string
  stage: DealStage
  valueMinorUnits: number
  currency: string
  expectedCloseDate: string | null
  createdAt: Date | string
  companyName: string | null
  contactEmail: string | null
  proposalId: string | null
}

type Props = {
  deals: DealRow[]
  isLoading?: boolean
  onConvertProposal: (dealId: string) => void
  isConverting?: boolean
}

const STAGE_CONFIG: Record<string, { label: string; badgeBg: string }> = {
  lead: { label: "Lead", badgeBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  discovery: { label: "Discovery", badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  proposal_sent: { label: "Proposal Sent", badgeBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  negotiation: { label: "Negotiation", badgeBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" },
  closed_won: { label: "Closed Won", badgeBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  closed_lost: { label: "Closed Lost", badgeBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
}

export function DealsTable({ deals, isLoading, onConvertProposal, isConverting }: Props) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState("")
  const [stageFilter, setStageFilter] = useState<"all" | DealStage>("all")
  const [sortBy, setSortBy] = useState<"value" | "age" | "title">("value")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const filteredDeals = useMemo(() => {
    let result = deals.filter((d) => {
      const matchesSearch =
        !searchQuery.trim() ||
        d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.companyName && d.companyName.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesStage = stageFilter === "all" || d.stage === stageFilter
      return matchesSearch && matchesStage
    })

    result = [...result].sort((a, b) => {
      if (sortBy === "value") {
        const valA = a.valueMinorUnits || 0
        const valB = b.valueMinorUnits || 0
        return sortOrder === "desc" ? valB - valA : valA - valB
      }
      if (sortBy === "age") {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        return sortOrder === "desc" ? dateA - dateB : dateB - dateA
      }
      return sortOrder === "desc" ? b.title.localeCompare(a.title) : a.title.localeCompare(b.title)
    })

    return result
  }, [deals, searchQuery, stageFilter, sortBy, sortOrder])

  const calculateAgeDays = (createdAt: Date | string) => {
    const created = new Date(createdAt).getTime()
    const now = Date.now()
    return Math.max(0, Math.floor((now - created) / (1000 * 60 * 60 * 24)))
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-3">
        {/* Stage Filter Pills */}
        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border overflow-x-auto">
          <Button
            type="button"
            variant={stageFilter === "all" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setStageFilter("all")}
            className="h-7 text-xs px-2.5 font-semibold shrink-0"
          >
            All Deals ({deals.length})
          </Button>
          {(["lead", "discovery", "proposal_sent", "negotiation", "closed_won", "closed_lost"] as const).map(
            (stg) => (
              <Button
                key={stg}
                type="button"
                variant={stageFilter === stg ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setStageFilter(stg)}
                className="h-7 text-xs px-2.5 font-semibold capitalize shrink-0"
              >
                {STAGE_CONFIG[stg]?.label || stg}
              </Button>
            )
          )}
        </div>

        {/* Search */}
        <div className="flex items-center gap-3">
          <Input
            type="text"
            placeholder="Search deals or accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-48 lg:w-64"
          />
        </div>
      </div>

      {/* Table Render */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12 text-muted-foreground text-sm">
          Loading deals list...
        </div>
      ) : filteredDeals.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-xl text-xs text-muted-foreground">
          No deals match the filter criteria.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <TableHead
                  className="cursor-pointer select-none hover:text-foreground"
                  onClick={() => {
                    if (sortBy === "title") setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                    else {
                      setSortBy("title")
                      setSortOrder("asc")
                    }
                  }}
                >
                  Deal Opportunity {sortBy === "title" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
                </TableHead>

                <TableHead>Stage</TableHead>

                <TableHead
                  className="text-right cursor-pointer select-none hover:text-foreground"
                  onClick={() => {
                    if (sortBy === "value") setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                    else {
                      setSortBy("value")
                      setSortOrder("desc")
                    }
                  }}
                >
                  Value {sortBy === "value" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
                </TableHead>

                <TableHead
                  className="text-right cursor-pointer select-none hover:text-foreground"
                  onClick={() => {
                    if (sortBy === "age") setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                    else {
                      setSortBy("age")
                      setSortOrder("desc")
                    }
                  }}
                >
                  Age {sortBy === "age" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
                </TableHead>

                <TableHead className="text-right">Expected Close</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredDeals.map((deal) => {
                const config = STAGE_CONFIG[deal.stage] || {
                  label: deal.stage,
                  badgeBg: "bg-muted text-muted-foreground",
                }
                const ageDays = calculateAgeDays(deal.createdAt)

                return (
                  <TableRow key={deal.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground text-sm">{deal.title}</span>
                        {deal.companyName && (
                          <span className="text-xs text-muted-foreground">🏢 {deal.companyName}</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className={`px-2 py-0.5 text-[10px] font-bold uppercase ${config.badgeBg}`}>
                        {config.label}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right font-mono font-semibold text-foreground">
                      {formatMoneyMinor(deal.valueMinorUnits, deal.currency || "USD", "en-US")}
                    </TableCell>

                    <TableCell className="text-right text-xs text-muted-foreground font-mono">
                      {ageDays}d open
                    </TableCell>

                    <TableCell className="text-right text-xs text-muted-foreground">
                      {deal.expectedCloseDate ? formatDateOnly(deal.expectedCloseDate, "en-US") : "—"}
                    </TableCell>

                    <TableCell className="text-right">
                      {!deal.proposalId ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isConverting}
                          onClick={() => onConvertProposal(deal.id)}
                          className="text-xs font-semibold bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                        >
                          ⚡ Convert
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            navigate({
                              to: "/proposals/$proposalId",
                              params: { proposalId: deal.proposalId as string },
                            })
                          }
                          className="text-xs font-semibold"
                        >
                          📄 Proposal
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
