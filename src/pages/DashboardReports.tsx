import { useEffect, useState, type ReactNode } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import {
  Building2,
  CalendarCheck2,
  CheckCircle2,
  IndianRupee,
  Clock3,
  Loader2,
  Target,
  TrendingUp,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import api from "@/services/api"
import { toast } from "sonner"

interface OverviewData {
  metrics: {
    totalCompanies: number
    newLeads: number
    convertedCustomers: number
    conversionRate: number
    activePipelineValue: number
    wonRevenue: number
    followUpsDue: number
    meetingsCompleted: number
  }
  charts: {
    trend: Array<{ period: string; newLeads: number; converted: number }>
    pipeline: Array<{ status: string; count: number }>
    sources: Array<{ source: string; count: number }>
  }
  recentActivities: Array<{
    id: string
    action: string
    actionType?: string
    date: string
    user: string
  }>
}

const SOURCE_COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f97316", "#ec4899", "#06b6d4"]
const PIPELINE_COLORS: Record<string, string> = {
  New: "#3b82f6",
  "Demo Scheduled": "#06b6d4",
  Interested: "#10b981",
  Committed: "#f97316",
  Converted: "#22c55e",
  "Not Interested": "#ef4444",
  "Follow Up": "#6366f1",
}
const todayInput = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
const currency = (value: number) => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
}).format(value || 0)

export default function DashboardReports() {
  const navigate = useNavigate()
  const today = todayInput()
  const [dateFilter, setDateFilter] = useState("All")
  const [dateRange, setDateRange] = useState({ startDate: today, endDate: today })
  const validDateRange = dateFilter !== "Date Range"
    || (/^\d{4}-\d{2}-\d{2}$/.test(dateRange.startDate)
      && /^\d{4}-\d{2}-\d{2}$/.test(dateRange.endDate)
      && dateRange.startDate <= dateRange.endDate)

  const reportQuery = useQuery<OverviewData>({
    queryKey: ["reports", "dashboard", dateFilter, dateRange.startDate, dateRange.endDate],
    enabled: validDateRange,
    queryFn: async () => {
      const params: Record<string, string> = { period: dateFilter }
      if (dateFilter === "Date Range") Object.assign(params, dateRange)
      return (await api.get("/reports/dashboard", { params })).data.data
    },
    staleTime: 2 * 60_000,
    gcTime: 30 * 60_000,
  })

  useEffect(() => {
    if (reportQuery.error) {
      const error = reportQuery.error as { response?: { data?: { message?: string } } }
      toast.error(error.response?.data?.message || "Failed to load business overview")
    }
  }, [reportQuery.error])

  const data = reportQuery.data
  const loading = reportQuery.isLoading || reportQuery.isFetching
  const metrics = [
    { title: "Total Companies", value: data?.metrics.totalCompanies || 0, helper: "All Time", icon: Building2, tone: "text-blue-500 bg-blue-500/10", target: "/leads" as const },
    { title: "New Leads", value: data?.metrics.newLeads || 0, helper: "Selected period", icon: Target, tone: "text-indigo-500 bg-indigo-500/10", target: "/leads" as const },
    { title: "Converted / Paid Customers", value: data?.metrics.convertedCustomers || 0, helper: "Selected period", icon: CheckCircle2, tone: "text-emerald-500 bg-emerald-500/10", target: "/leads" as const },
    { title: "Conversion Rate", value: `${data?.metrics.conversionRate || 0}%`, helper: "Converted / Paid ÷ new leads", icon: TrendingUp, tone: "text-purple-500 bg-purple-500/10", target: "/reports/sales" as const },
    { title: "Active Pipeline Value", value: currency(data?.metrics.activePipelineValue || 0), helper: "Interested + committed", icon: IndianRupee, tone: "text-amber-600 bg-amber-500/10", target: "/reports/sales" as const },
    { title: "Won Revenue", value: currency(data?.metrics.wonRevenue || 0), helper: "Selected period", icon: IndianRupee, tone: "text-green-600 bg-green-500/10", target: "/reports/sales" as const },
    { title: "Follow-ups Due", value: data?.metrics.followUpsDue || 0, helper: "Selected period", icon: Clock3, tone: "text-rose-500 bg-rose-500/10", target: "/leads" as const },
    { title: "Meetings Completed", value: data?.metrics.meetingsCompleted || 0, helper: "Selected period", icon: CalendarCheck2, tone: "text-orange-500 bg-orange-500/10", target: "/meetings" as const },
  ]

  return (
    <div className="flex flex-col gap-6 pb-8">
      <PageHeader title="Business Overview" description="Track leads, conversions, pipeline value and team activity.">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {dateFilter === "Date Range" && (
            <>
              <Input aria-label="Start date" type="date" value={dateRange.startDate} onChange={(event) => setDateRange((current) => ({ ...current, startDate: event.target.value }))} className="w-[145px] bg-background" />
              <Input aria-label="End date" type="date" value={dateRange.endDate} onChange={(event) => setDateRange((current) => ({ ...current, endDate: event.target.value }))} className="w-[145px] bg-background" />
            </>
          )}
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[150px] bg-background"><SelectValue placeholder="Date Filter" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Time</SelectItem>
              <SelectItem value="Today">Today</SelectItem>
              <SelectItem value="This Week">This Week</SelectItem>
              <SelectItem value="This Month">This Month</SelectItem>
              <SelectItem value="Date Range">Date Range</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((stat) => {
          const [textColor, backgroundColor] = stat.tone.split(" ")
          return (
            <Card key={stat.title} role="button" tabIndex={0} className="cursor-pointer shadow-sm transition hover:border-primary/40 hover:shadow-md" onClick={() => navigate({ to: stat.target })} onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") navigate({ to: stat.target })
            }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <div className={`rounded-full p-2 ${backgroundColor}`}><stat.icon className={`h-4 w-4 ${textColor}`} /></div>
              </CardHeader>
              <CardContent>
                {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <div className="text-2xl font-bold">{stat.value}</div>}
                <p className="mt-1 text-xs text-muted-foreground">{stat.helper}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Lead & Conversion Trend" empty={!data?.charts.trend.length} loading={loading}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data?.charts.trend || []} margin={{ top: 10, right: 18, left: -12, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip /><Legend />
              <Line type="monotone" dataKey="newLeads" name="New Leads" stroke="#3b82f6" strokeWidth={2} />
              <Line type="monotone" dataKey="converted" name="Converted / Paid" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Sales Pipeline" empty={!data?.charts.pipeline.some((item) => item.count > 0)} loading={loading}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.charts.pipeline || []} layout="vertical" margin={{ top: 0, right: 28, left: -18, bottom: 0 }} barCategoryGap="24%">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="status" width={94} tick={{ fontSize: 11 }} />
              <Tooltip cursor={{ fill: "transparent" }} />
              <Bar dataKey="count" name="Companies" radius={[0, 5, 5, 0]} maxBarSize={26}>
                {(data?.charts.pipeline || []).map((item) => (
                  <Cell key={item.status} fill={PIPELINE_COLORS[item.status] || "#64748b"} />
                ))}
                <LabelList dataKey="count" position="right" className="fill-foreground" fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <ChartCard title="Lead Source Breakdown" empty={!data?.charts.sources.length} loading={loading}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data?.charts.sources || []} dataKey="count" nameKey="source" innerRadius={62} outerRadius={105} paddingAngle={2}>
                {(data?.charts.sources || []).map((item, index) => <Cell key={item.source} fill={SOURCE_COLORS[index % SOURCE_COLORS.length]} />)}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card className="overflow-hidden shadow-sm">
          <CardHeader className="border-b bg-muted/20 py-4"><CardTitle className="text-base">Recent CRM Activity</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[340px] overflow-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>User</TableHead><TableHead>Activity</TableHead></TableRow></TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={3} className="py-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></TableCell></TableRow>
                  ) : !data?.recentActivities.length ? (
                    <TableRow><TableCell colSpan={3} className="py-10 text-center text-muted-foreground">No CRM activity found for the selected period.</TableCell></TableRow>
                  ) : data.recentActivities.map((activity) => (
                    <TableRow key={`${activity.actionType || "activity"}-${activity.id}`}>
                      <TableCell className="whitespace-nowrap">{format(new Date(activity.date), "PP p")}</TableCell>
                      <TableCell className="whitespace-nowrap">{activity.user}</TableCell>
                      <TableCell>{activity.action}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ChartCard({ title, loading, empty, children }: { title: string; loading: boolean; empty: boolean; children: ReactNode }) {
  return (
    <Card className="shadow-sm">
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="h-[330px]">
        {loading ? (
          <div className="flex h-full items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
        ) : empty ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data available for the selected period.</div>
        ) : children}
      </CardContent>
    </Card>
  )
}
