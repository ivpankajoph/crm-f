import { keepPreviousData, useQuery } from "@tanstack/react-query"
import api from "@/services/api"

export interface LeadStats {
  totalLeads: number
  demoScheduled: number
  interested: number
  notInterested: number
  committed: number
  converted: number
  followUp: number
}

interface LeadStatsFilters {
  period: string
  startDate: string
  endDate: string
  month: string
  year: string
  type?: "Company"
}

const isValidLeadStatsFilter = (filters: LeadStatsFilters) => {
  if (filters.period === "date") {
    return /^\d{4}-\d{2}-\d{2}$/.test(filters.startDate)
      && /^\d{4}-\d{2}-\d{2}$/.test(filters.endDate)
      && filters.startDate <= filters.endDate
  }
  if (filters.period === "month") return /^\d{4}-\d{2}$/.test(filters.month)
  if (filters.period === "year") {
    return /^\d{4}$/.test(filters.year) && Number(filters.year) >= 1900 && Number(filters.year) <= 2100
  }
  return true
}

export const useLeadStats = (filters: LeadStatsFilters) => useQuery({
  queryKey: [
    "leads",
    "stats",
    filters.period,
    filters.startDate,
    filters.endDate,
    filters.month,
    filters.year,
    filters.type,
  ],
  enabled: isValidLeadStatsFilter(filters),
  placeholderData: keepPreviousData,
  staleTime: 30_000,
  queryFn: async ({ signal }) => {
    const params: Record<string, string> = { period: filters.period }
    if (filters.type) params.type = filters.type
    if (filters.period === "date") {
      params.startDate = filters.startDate
      params.endDate = filters.endDate
    } else if (filters.period === "month") {
      params.month = filters.month
    } else if (filters.period === "year") {
      params.year = filters.year
    }
    const response = await api.get("/leads/stats", { params, signal })
    return response.data.data as LeadStats
  },
})
