import { useEffect, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { BarChart3, BriefcaseBusiness, CheckCircle2, Download, IndianRupee, Loader2, Search, Target, TrendingUp, Users } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DataPagination } from "@/components/shared/DataPagination"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { downloadReportCsv } from "@/lib/reportExport"
import type { PaginationMeta } from "@/types/pagination"
import api from "@/services/api"
import { toast } from "sonner"
import { useSelector } from "react-redux"
import type { RootState } from "@/store"
import { can } from "@/lib/accessControl"

interface SalesRow {
  id: string
  company: string
  contact: string
  owner: string
  status: string
  source: string
  dealValue: number
  expectedClosingDate?: string
  convertedAt?: string
  lastActivityAt?: string
  createdAt: string
}

interface SalesData {
  items: SalesRow[]
  pagination: PaginationMeta
  metrics: {
    newLeads: number
    activeDeals: number
    pipelineValue: number
    convertedCustomers: number
    wonRevenue: number
    conversionRate: number
    averageDealValue: number
  }
  charts: {
    pipeline: Array<{ status: string; count: number }>
    trend: Array<{ period: string; newLeads: number; converted: number; revenue: number }>
  }
  facets: { owners: Array<{ id: string; name: string }>; sources: string[] }
}

interface PerformanceRow {
  ownerId?: string
  owner: string
  assigned: number
  activeDeals: number
  converted: number
  revenue: number
  conversionRate: number
}

interface PerformanceData {
  chart: PerformanceRow[]
  items: PerformanceRow[]
  pagination: PaginationMeta
}

const STATUSES = ["New", "Follow Up", "Interested", "Demo Scheduled", "Committed", "Converted", "Not Interested"]
const STATUS_COLORS: Record<string, string> = {
  New: "#3b82f6", "Follow Up": "#6366f1", Interested: "#10b981", "Demo Scheduled": "#06b6d4",
  Committed: "#f97316", Converted: "#22c55e", "Not Interested": "#ef4444",
}
const todayInput = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
const money = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0)
const displayDate = (value?: string) => value ? format(new Date(value), "PP") : "—"

export default function SalesReports() {
  const currentUser = useSelector((state: RootState) => state.auth.user)
  const navigate = useNavigate()
  const today = todayInput()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [dateFilter, setDateFilter] = useState("All")
  const [statusFilter, setStatusFilter] = useState("All")
  const [ownerFilter, setOwnerFilter] = useState("All")
  const [sourceFilter, setSourceFilter] = useState("All")
  const [performanceLimit, setPerformanceLimit] = useState("10")
  const [performancePage, setPerformancePage] = useState(1)
  const [performanceSearch, setPerformanceSearch] = useState("")
  const [dateRange, setDateRange] = useState({ startDate: today, endDate: today })
  const debouncedSearch = useDebouncedValue(search)
  const debouncedPerformanceSearch = useDebouncedValue(performanceSearch)
  const validRange = dateFilter !== "Date Range" || (dateRange.startDate !== "" && dateRange.endDate !== "" && dateRange.startDate <= dateRange.endDate)
  const filterParams = {
    period: dateFilter, status: statusFilter, owner: ownerFilter, source: sourceFilter,
    search: debouncedSearch || undefined,
    startDate: dateFilter === "Date Range" ? dateRange.startDate : undefined,
    endDate: dateFilter === "Date Range" ? dateRange.endDate : undefined,
  }

  const reportQuery = useQuery<SalesData>({
    queryKey: ["reports", "sales", page, filterParams],
    enabled: validRange,
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }) => (await api.get("/reports/sales", { params: { page, limit: 25, ...filterParams }, signal })).data.data,
  })
  const data = reportQuery.data
  const loading = reportQuery.isLoading || reportQuery.isFetching

  const performanceQuery = useQuery<PerformanceData>({
    queryKey: ["reports", "sales", "performance", performancePage, performanceLimit, debouncedPerformanceSearch, filterParams],
    enabled: validRange,
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }) => (await api.get("/reports/sales/performance", {
      params: {
        page: performancePage,
        limit: 25,
        topLimit: performanceLimit,
        performanceSearch: debouncedPerformanceSearch || undefined,
        ...filterParams,
      },
      signal,
    })).data.data,
  })
  const performanceData = performanceQuery.data
  const performanceLoading = performanceQuery.isLoading || performanceQuery.isFetching

  useEffect(() => {
    if (reportQuery.error) {
      const error = reportQuery.error as { response?: { data?: { message?: string } } }
      toast.error(error.response?.data?.message || "Failed to load sales report")
    }
  }, [reportQuery.error])

  useEffect(() => {
    if (performanceQuery.error) {
      const error = performanceQuery.error as { response?: { data?: { message?: string } } }
      toast.error(error.response?.data?.message || "Failed to load employee performance")
    }
  }, [performanceQuery.error])

  const updateFilter = (setter: (value: string) => void) => (value: string) => { setter(value); setPage(1); setPerformancePage(1) }
  const exportParams = Object.fromEntries(Object.entries(filterParams).filter(([, value]) => value !== undefined)) as Record<string, string>
  const metrics = [
    ["New Leads", data?.metrics.newLeads || 0, Target, "text-blue-500 bg-blue-500/10"],
    ["Active Deals", data?.metrics.activeDeals || 0, BriefcaseBusiness, "text-indigo-500 bg-indigo-500/10"],
    ["Pipeline Value", money(data?.metrics.pipelineValue || 0), IndianRupee, "text-amber-600 bg-amber-500/10"],
    ["Converted / Paid Customers", data?.metrics.convertedCustomers || 0, CheckCircle2, "text-green-600 bg-green-500/10"],
    ["Won Revenue", money(data?.metrics.wonRevenue || 0), IndianRupee, "text-emerald-600 bg-emerald-500/10"],
    ["Conversion Rate", `${data?.metrics.conversionRate || 0}%`, TrendingUp, "text-purple-500 bg-purple-500/10"],
    ["Average Deal Value", money(data?.metrics.averageDealValue || 0), BarChart3, "text-orange-500 bg-orange-500/10"],
  ] as const

  return (
    <div className="flex flex-col gap-6 pb-8">
      <PageHeader title="Sales Reports" description="Analyze company pipeline, conversions, revenue and owner performance.">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {can(currentUser, "reports.export") && <Button variant="outline" onClick={() => void downloadReportCsv("sales", exportParams).catch(() => toast.error("Failed to export sales report"))}><Download className="mr-2 h-4 w-4" /> Export CSV</Button>}
          {dateFilter === "Date Range" && <>
            <Input aria-label="Start date" type="date" value={dateRange.startDate} onChange={(e) => { setDateRange((v) => ({ ...v, startDate: e.target.value })); setPage(1); setPerformancePage(1) }} className="w-[145px] bg-background" />
            <Input aria-label="End date" type="date" value={dateRange.endDate} onChange={(e) => { setDateRange((v) => ({ ...v, endDate: e.target.value })); setPage(1); setPerformancePage(1) }} className="w-[145px] bg-background" />
          </>}
          <Select value={dateFilter} onValueChange={updateFilter(setDateFilter)}><SelectTrigger className="w-[150px] bg-background"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="All">All Time</SelectItem><SelectItem value="Today">Today</SelectItem><SelectItem value="This Week">This Week</SelectItem><SelectItem value="This Month">This Month</SelectItem><SelectItem value="Date Range">Date Range</SelectItem></SelectContent></Select>
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([title, value, Icon, tone]) => { const [text, background] = tone.split(" "); return <Card key={title} className="shadow-sm"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle><div className={`rounded-full p-2 ${background}`}><Icon className={`h-4 w-4 ${text}`} /></div></CardHeader><CardContent>{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <div className="text-2xl font-bold">{value}</div>}</CardContent></Card> })}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ReportChart title="Sales Pipeline" loading={loading} empty={!data?.charts.pipeline.some((row) => row.count)}>
          <ResponsiveContainer width="100%" height="100%"><BarChart data={data?.charts.pipeline || []} layout="vertical" margin={{ left: -12, right: 25 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="status" width={100} tick={{ fontSize: 11 }} /><Tooltip cursor={{ fill: "transparent" }} /><Bar dataKey="count" name="Companies" radius={[0, 5, 5, 0]}>{(data?.charts.pipeline || []).map((row) => <Cell key={row.status} fill={STATUS_COLORS[row.status]} />)}</Bar></BarChart></ResponsiveContainer>
        </ReportChart>
        <ReportChart title="Conversion & Revenue Trend" loading={loading} empty={!data?.charts.trend.length}>
          <ResponsiveContainer width="100%" height="100%"><ComposedChart data={data?.charts.trend || []} margin={{ left: -12, right: 10 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="period" tick={{ fontSize: 11 }} /><YAxis yAxisId="count" allowDecimals={false} /><YAxis yAxisId="revenue" orientation="right" /><Tooltip /><Legend /><Bar yAxisId="revenue" dataKey="revenue" name="Revenue" fill="#f59e0b" opacity={0.7} /><Line yAxisId="count" dataKey="newLeads" name="New Leads" stroke="#3b82f6" strokeWidth={2} /><Line yAxisId="count" dataKey="converted" name="Converted / Paid" stroke="#10b981" strokeWidth={2} /></ComposedChart></ResponsiveContainer>
        </ReportChart>
      </div>

      <ReportChart
        title="Employee Performance"
        loading={performanceLoading}
        empty={!performanceData?.chart.length}
        actions={<Select value={performanceLimit} onValueChange={setPerformanceLimit}><SelectTrigger className="w-[115px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="10">Top 10</SelectItem><SelectItem value="20">Top 20</SelectItem></SelectContent></Select>}
        contentClassName={performanceLimit === "20" ? "h-[620px]" : "h-[400px]"}
      >
        <ResponsiveContainer width="100%" height="100%"><BarChart data={performanceData?.chart || []} layout="vertical" margin={{ right: 20 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="owner" width={140} tick={{ fontSize: 11 }} /><Tooltip /><Legend /><Bar dataKey="assigned" name="Assigned" fill="#3b82f6" /><Bar dataKey="activeDeals" name="Active Deals" fill="#8b5cf6" /><Bar dataKey="converted" name="Converted / Paid" fill="#10b981" /></BarChart></ResponsiveContainer>
      </ReportChart>

      <Card className="overflow-hidden shadow-sm">
        <CardHeader className="border-b bg-muted/20"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="text-base">Employee Leaderboard</CardTitle><p className="mt-1 text-sm text-muted-foreground">All employees and administrators, ranked by conversions and revenue.</p></div><div className="relative w-full sm:w-[280px]"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={performanceSearch} onChange={(e) => { setPerformanceSearch(e.target.value); setPerformancePage(1) }} placeholder="Search employee" className="pl-9" /></div></div></CardHeader>
        <CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead className="w-16">Rank</TableHead><TableHead>Employee</TableHead><TableHead>Assigned</TableHead><TableHead>Active Deals</TableHead><TableHead>Converted / Paid</TableHead><TableHead>Conversion Rate</TableHead><TableHead>Revenue</TableHead></TableRow></TableHeader><TableBody>
          {performanceLoading && !performanceData ? <TableRow><TableCell colSpan={7} className="py-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow> : !performanceData?.items.length ? <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No employee performance found for the selected filters.</TableCell></TableRow> : performanceData.items.map((row, index) => <TableRow key={row.ownerId || row.owner}><TableCell>{(performanceData.pagination.page - 1) * performanceData.pagination.limit + index + 1}</TableCell><TableCell className="font-medium">{row.owner}</TableCell><TableCell>{row.assigned}</TableCell><TableCell>{row.activeDeals}</TableCell><TableCell>{row.converted}</TableCell><TableCell>{row.conversionRate}%</TableCell><TableCell>{money(row.revenue)}</TableCell></TableRow>)}
        </TableBody></Table></div><DataPagination pagination={performanceData?.pagination} onPageChange={setPerformancePage} /></CardContent>
      </Card>

      <Card className="overflow-hidden shadow-sm">
        <CardHeader className="border-b bg-muted/20"><div className="flex flex-wrap items-center gap-2"><div className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); setPerformancePage(1) }} placeholder="Search company, contact, email or phone" className="pl-9" /></div>
          <Select value={statusFilter} onValueChange={updateFilter(setStatusFilter)}><SelectTrigger className="w-[165px] bg-background"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="All">All Statuses</SelectItem>{STATUSES.map((status) => <SelectItem key={status} value={status}>{status === "Converted" ? "Converted / Paid" : status}</SelectItem>)}</SelectContent></Select>
          <Select value={ownerFilter} onValueChange={updateFilter(setOwnerFilter)}><SelectTrigger className="w-[175px] bg-background"><Users className="mr-2 h-4 w-4" /><SelectValue placeholder="Owner" /></SelectTrigger><SelectContent><SelectItem value="All">All Owners</SelectItem>{(data?.facets.owners || []).map((owner) => <SelectItem key={owner.id} value={owner.id}>{owner.name}</SelectItem>)}</SelectContent></Select>
          <Select value={sourceFilter} onValueChange={updateFilter(setSourceFilter)}><SelectTrigger className="w-[165px] bg-background"><SelectValue placeholder="Source" /></SelectTrigger><SelectContent><SelectItem value="All">All Sources</SelectItem>{(data?.facets.sources || []).map((source) => <SelectItem key={source} value={source}>{source}</SelectItem>)}</SelectContent></Select>
        </div></CardHeader>
        <CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Company</TableHead><TableHead>Primary Contact</TableHead><TableHead>Sales Owner</TableHead><TableHead>Status</TableHead><TableHead>Source</TableHead><TableHead>Deal Value</TableHead><TableHead>Expected Close</TableHead><TableHead>Converted</TableHead><TableHead>Last Activity</TableHead><TableHead>Created</TableHead></TableRow></TableHeader><TableBody>
          {loading && !data ? <TableRow><TableCell colSpan={10} className="py-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow> : !data?.items.length ? <TableRow><TableCell colSpan={10} className="py-10 text-center text-muted-foreground">No sales data found for the selected filters.</TableCell></TableRow> : data.items.map((row) => <TableRow key={row.id} className="cursor-pointer" onClick={() => navigate({ to: "/leads/$id", params: { id: row.id } })}><TableCell className="font-medium">{row.company}</TableCell><TableCell>{row.contact}</TableCell><TableCell>{row.owner}</TableCell><TableCell><StatusBadge status={row.status} /></TableCell><TableCell>{row.source}</TableCell><TableCell>{money(row.dealValue)}</TableCell><TableCell className="whitespace-nowrap">{displayDate(row.expectedClosingDate)}</TableCell><TableCell className="whitespace-nowrap">{displayDate(row.convertedAt)}</TableCell><TableCell className="whitespace-nowrap">{displayDate(row.lastActivityAt)}</TableCell><TableCell className="whitespace-nowrap">{displayDate(row.createdAt)}</TableCell></TableRow>)}
        </TableBody></Table></div><DataPagination pagination={data?.pagination} onPageChange={setPage} /></CardContent>
      </Card>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = { Converted: "bg-green-100 text-green-800", Committed: "bg-orange-100 text-orange-800", Interested: "bg-emerald-100 text-emerald-800", "Not Interested": "bg-red-100 text-red-800", "Demo Scheduled": "bg-cyan-100 text-cyan-800", "Follow Up": "bg-indigo-100 text-indigo-800" }
  return <Badge className={classes[status]} variant={classes[status] ? "default" : "secondary"}>{status === "Converted" ? "Converted / Paid" : status}</Badge>
}

function ReportChart({ title, loading, empty, actions, contentClassName = "h-[320px]", children }: { title: string; loading: boolean; empty: boolean; actions?: React.ReactNode; contentClassName?: string; children: React.ReactNode }) {
  return <Card className="shadow-sm"><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">{title}</CardTitle>{actions}</CardHeader><CardContent className={contentClassName}>{loading ? <div className="flex h-full items-center justify-center"><Loader2 className="h-7 w-7 animate-spin" /></div> : empty ? <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data available for selected filters.</div> : children}</CardContent></Card>
}
