import { useState, useEffect, useRef } from "react"
import { Loader2, ArrowRight, CalendarDays } from "lucide-react"
import { useNavigate } from "@tanstack/react-router"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics"

export default function Dashboard() {
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
  const [statsPeriod, setStatsPeriod] = useState("today")
  const [dateRange, setDateRange] = useState({ startDate: todayStr, endDate: todayStr })
  const [selectedMonth, setSelectedMonth] = useState(todayStr.slice(0, 7))
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [yearInput, setYearInput] = useState(selectedYear)
  const startDateRef = useRef<HTMLInputElement>(null)
  const endDateRef = useRef<HTMLInputElement>(null)
  const monthRef = useRef<HTMLInputElement>(null)

  const navigate = useNavigate()
  const {
    data: metrics,
    isLoading,
    error,
  } = useDashboardMetrics({
    period: statsPeriod,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    month: selectedMonth,
    year: selectedYear,
  })

  useEffect(() => {
    if (error) console.error("Failed to fetch dashboard data:", error)
  }, [error])

  const commitYear = () => {
    if (/^\d{4}$/.test(yearInput) && Number(yearInput) >= 1900 && Number(yearInput) <= 2100) {
      setSelectedYear(yearInput)
    } else {
      setYearInput(selectedYear)
    }
  }

  if (isLoading || !metrics) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      title: "Total Company Leads",
      value: metrics.totalCompanyLeads || 0,
      status: "all",
      color: "bg-card text-card-foreground border-border dark:bg-card dark:text-card-foreground dark:border-border",
      dot: "bg-slate-500"
    },
    { 
      title: "New Leads", 
      value: metrics.new, 
      status: "New",
      color: "bg-card text-card-foreground border-border dark:bg-card dark:text-card-foreground dark:border-border",
      dot: "bg-blue-500"
    },
    {
      title: "Follow Up",
      value: metrics.followUp || 0,
      status: "Follow Up",
      color: "bg-card text-card-foreground border-border dark:bg-card dark:text-card-foreground dark:border-border",
      dot: "bg-indigo-500"
    },
    { 
      title: "Demo Scheduled", 
      value: metrics.demoScheduled || 0, 
      status: "Demo Scheduled",
      color: "bg-card text-card-foreground border-border dark:bg-card dark:text-card-foreground dark:border-border",
      dot: "bg-cyan-500"
    },
    {
      title: "Interested", 
      value: metrics.interested, 
      status: "Interested",
      color: "bg-card text-card-foreground border-border dark:bg-card dark:text-card-foreground dark:border-border",
      dot: "bg-emerald-500"
    },
    {
      title: "Committed",
      value: metrics.committed,
      status: "Committed",
      color: "bg-card text-card-foreground border-border dark:bg-card dark:text-card-foreground dark:border-border",
      dot: "bg-orange-500"
    },
    { 
      title: "Converted / Paid",
      value: metrics.converted, 
      status: "Converted",
      color: "bg-card text-card-foreground border-border dark:bg-card dark:text-card-foreground dark:border-border",
      dot: "bg-green-500"
    },
    {
      title: "Not Interested",
      value: metrics.notInterested,
      status: "Not Interested",
      color: "bg-card text-card-foreground border-border dark:bg-card dark:text-card-foreground dark:border-border",
      dot: "bg-red-500"
    }
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          title="Pipeline Overview"
          description="Monitor the real-time status of all your Customers and Companies."
        />
        
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Select value={statsPeriod} onValueChange={setStatsPeriod}>
            <SelectTrigger className="w-[150px] bg-background">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="date">Date Range</SelectItem>
              <SelectItem value="month">Month Wise</SelectItem>
              <SelectItem value="year">Year Wise</SelectItem>
            </SelectContent>
          </Select>
          {statsPeriod === "date" && (
            <div className="flex items-center gap-2">
              <PickerInput
                inputRef={startDateRef}
                type="date"
                value={dateRange.startDate}
                onChange={(value) => setDateRange((current) => ({
                  startDate: value,
                  endDate: current.endDate < value ? value : current.endDate,
                }))}
                className="w-[145px]"
              />
              <PickerInput
                inputRef={endDateRef}
                type="date"
                value={dateRange.endDate}
                onChange={(value) => setDateRange((current) => ({
                  startDate: current.startDate > value ? value : current.startDate,
                  endDate: value,
                }))}
                className="w-[145px]"
              />
            </div>
          )}
          {statsPeriod === "month" && (
            <PickerInput
              inputRef={monthRef}
              type="month"
              value={selectedMonth}
              onChange={setSelectedMonth}
              className="w-[155px]"
            />
          )}
          {statsPeriod === "year" && (
            <Input
              type="number"
              min="1900"
              max="2100"
              value={yearInput}
              onChange={(e) => setYearInput(e.target.value)}
              onBlur={commitYear}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur()
              }}
              className="w-[110px]"
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((metric, idx) => (
          <Card 
            key={idx} 
            className={`shadow-sm border-2 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg ${metric.color}`}
            onClick={() => navigate({ to: '/leads', search: { status: metric.status } })}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${metric.dot}`} />
                {metric.title}
              </CardTitle>
              <ArrowRight className="h-4 w-4 opacity-50" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold mt-2">{metric.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function PickerInput({
  type,
  value,
  onChange,
  className,
  inputRef,
}: {
  type: "date" | "month";
  value: string;
  onChange: (value: string) => void;
  className?: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const openPicker = () => {
    const input = inputRef.current as (HTMLInputElement & { showPicker?: () => void }) | null
    input?.focus()
    input?.showPicker?.()
  }

  return (
    <div className={`relative ${className || ""}`} onClick={openPicker}>
      <Input
        ref={inputRef}
        type={type}
        value={value}
        onChange={(e) => {
          if (e.target.value) onChange(e.target.value)
        }}
        className="w-full cursor-pointer pr-10 [&::-webkit-calendar-picker-indicator]:opacity-0"
      />
      <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}
