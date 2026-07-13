import { useState } from "react"
import type { DateRange } from "react-day-picker"
import type { ProposalDraftListItem } from "@/server/proposals"

const subDays = (date: Date, days: number) => {
  const result = new Date(date)
  result.setDate(result.getDate() - days)
  return result
}

export function useProposalsFilter(proposals: ProposalDraftListItem[]) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  const [searchQuery, setSearchQuery] = useState("")

  let prevRange: { from: Date; to: Date } | null = null
  const showTrend = !!(dateRange?.from && dateRange?.to)

  if (dateRange?.from && dateRange?.to) {
    const durationMs = dateRange.to.getTime() - dateRange.from.getTime()
    const prevTo = new Date(dateRange.from.getTime() - 1)
    const prevFrom = new Date(prevTo.getTime() - durationMs)
    prevRange = { from: prevFrom, to: prevTo }
  }

  const isProposalInPeriod = (pDate: Date, start: Date, end: Date) => {
    const d = new Date(pDate)
    d.setHours(0, 0, 0, 0)
    const s = new Date(start)
    s.setHours(0, 0, 0, 0)
    const e = new Date(end)
    e.setHours(23, 59, 59, 999)
    return d >= s && d <= e
  }

  const filteredList = proposals.filter((p) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        p.title.toLowerCase().includes(q) ||
        p.customerName.toLowerCase().includes(q) ||
        (p.status && p.status.toLowerCase().includes(q))
      if (!matchesSearch) return false
    }

    if (dateRange?.from) {
      const pDate = new Date(p.issueDate)
      const start = dateRange.from
      const end = dateRange.to || dateRange.from
      return isProposalInPeriod(pDate, start, end)
    }

    return true
  })

  const currentPeriodProposals = proposals.filter((p) => {
    if (!dateRange?.from) return true
    const pDate = new Date(p.issueDate)
    const start = dateRange.from
    const end = dateRange.to || dateRange.from
    return isProposalInPeriod(pDate, start, end)
  })

  const prevPeriodProposals = proposals.filter((p) => {
    if (!showTrend || !prevRange) return false
    const pDate = new Date(p.issueDate)
    return isProposalInPeriod(pDate, prevRange.from, prevRange.to)
  })

  const getStats = (list: ProposalDraftListItem[]) => {
    const totalProposedList = list.filter((p) => p.status !== "draft")
    const totalProposedSum = totalProposedList.reduce((sum, p) => sum + p.valueMinor, 0)

    const acceptedList = list.filter((p) => p.status === "accepted")
    const acceptedSum = acceptedList.reduce((sum, p) => sum + p.valueMinor, 0)

    const pendingList = list.filter((p) => p.status === "sent")
    const pendingSum = pendingList.reduce((sum, p) => sum + p.valueMinor, 0)

    const rejectedList = list.filter((p) => p.status === "rejected")
    const rejectedSum = rejectedList.reduce((sum, p) => sum + p.valueMinor, 0)

    return {
      proposedSum: totalProposedSum,
      proposedCount: totalProposedList.length,
      acceptedSum,
      acceptedCount: acceptedList.length,
      pendingSum,
      pendingCount: pendingList.length,
      rejectedSum,
      rejectedCount: rejectedList.length,
    }
  }

  const currentStats = getStats(currentPeriodProposals)
  const prevStats = getStats(prevPeriodProposals)

  const getTrendPercentage = (curr: number, prev: number) => {
    if (prev === 0) {
      if (curr === 0) return 0
      return 100
    }
    return Math.round(((curr - prev) / prev) * 100)
  }

  const trends = {
    proposed: getTrendPercentage(currentStats.proposedSum, prevStats.proposedSum),
    accepted: getTrendPercentage(currentStats.acceptedSum, prevStats.acceptedSum),
    pending: getTrendPercentage(currentStats.pendingSum, prevStats.pendingSum),
    rejected: getTrendPercentage(currentStats.rejectedSum, prevStats.rejectedSum),
  }

  return {
    dateRange,
    setDateRange,
    searchQuery,
    setSearchQuery,
    filteredList,
    currentStats,
    trends,
    showTrend,
  }
}
