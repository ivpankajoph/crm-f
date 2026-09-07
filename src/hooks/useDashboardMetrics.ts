import { keepPreviousData, useQuery } from "@tanstack/react-query"
import api from "@/services/api"

export interface DashboardMetrics {
  totalCompanyLeads: number
  new: number
  demoScheduled: number
  interested: number
  notInterested: number
  committed: number
  converted: number
  followUp: number
}

interface DashboardFilters {
  period: string
  startDate: string
  endDate: string
  month: string
  year: string
}

const isValidDashboardFilter = ({ period, startDate, endDate, month, year }: DashboardFilters) => {
  if (period === "date") {
    return /^\d{4}-\d{2}-\d{2}$/.test(startDate)
      && /^\d{4}-\d{2}-\d{2}$/.test(endDate)
      && startDate <= endDate
  }
  if (period === "month") return /^\d{4}-\d{2}$/.test(month)
  if (period === "year") return /^\d{4}$/.test(year) && Number(year) >= 1900 && Number(year) <= 2100
  return true
}

export const useDashboardMetrics = (filters: DashboardFilters) => useQuery({
  queryKey: ["dashboard", "metrics", filters.period, filters.startDate, filters.endDate, filters.month, filters.year],
  enabled: isValidDashboardFilter(filters),
  placeholderData: keepPreviousData,
  staleTime: 2 * 60_000,
  gcTime: 30 * 60_000,
  queryFn: async ({ signal }) => {
    const params: Record<string, string> = { period: filters.period }
    if (filters.period === "date") {
      params.startDate = filters.startDate
      params.endDate = filters.endDate
    }
    if (filters.period === "month") params.month = filters.month
    if (filters.period === "year") params.year = filters.year
    const response = await api.get("/dashboard/metrics", { params, signal })
    return response.data.data.metrics as DashboardMetrics
  },
})
