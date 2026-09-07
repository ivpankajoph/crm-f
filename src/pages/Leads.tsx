import { useState, useEffect, useRef } from "react"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Plus, Users, ThumbsUp, ThumbsDown, CalendarDays, Handshake, CheckCircle2, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { useLeadStats } from "@/hooks/useLeadStats"
import { CompanyLeadsTable } from "@/components/leads/CompanyLeadsTable"
import { useSelector } from "react-redux"
import type { RootState } from "@/store"
import { can } from "@/lib/accessControl"

const indiaDateInputValue = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

export default function Leads() {
  const navigate = useNavigate()
  const searchParams = useSearch({ strict: false }) as { status?: string }
  const currentUser = useSelector((state: RootState) => state.auth.user)
  const [statsPeriod, setStatsPeriod] = useState("today")
  const [listStatus, setListStatus] = useState(searchParams.status || "all")
  const today = indiaDateInputValue()
  const currentMonth = today.slice(0, 7)
  const currentYear = new Date().getFullYear().toString()
  const [dateRange, setDateRange] = useState({ startDate: today, endDate: today })
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [yearInput, setYearInput] = useState(currentYear)
  const startDateRef = useRef<HTMLInputElement>(null)
  const endDateRef = useRef<HTMLInputElement>(null)
  const monthRef = useRef<HTMLInputElement>(null)
  const leadsTableRef = useRef<HTMLDivElement>(null)

  const defaultStats = {
    totalLeads: 0,
    demoScheduled: 0,
    interested: 0,
    notInterested: 0,
    committed: 0,
    converted: 0,
    followUp: 0
  }

  const {
    data,
    isLoading: loading,
    error,
  } = useLeadStats({
    period: statsPeriod,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    month: selectedMonth,
    year: selectedYear,
    type: "Company",
  })
  const apiStats = { ...defaultStats, ...(data || {}) }

  useEffect(() => {
    if (error) {
      const requestError = error as { response?: { data?: { message?: string } } }
      toast.error(requestError.response?.data?.message || "Failed to fetch lead stats")
    }
  }, [error])

  useEffect(() => {
    setListStatus(searchParams.status || "all")
    if (searchParams.status) {
      requestAnimationFrame(() => {
        leadsTableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      })
    }
  }, [searchParams.status])

  const commitYear = () => {
    if (/^\d{4}$/.test(yearInput) && Number(yearInput) >= 1900 && Number(yearInput) <= 2100) {
      setSelectedYear(yearInput)
    } else {
      setYearInput(selectedYear)
    }
  }

  const stats = [
    { title: "Total Company Leads", value: apiStats.totalLeads, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Follow Up", value: apiStats.followUp, icon: CalendarDays, color: "text-indigo-500", bg: "bg-indigo-500/10", status: "Follow Up" },
    { title: "Demo Scheduled", value: apiStats.demoScheduled, icon: CalendarDays, color: "text-cyan-500", bg: "bg-cyan-500/10", status: "Demo Scheduled" },
    { title: "Interested", value: apiStats.interested, icon: ThumbsUp, color: "text-emerald-500", bg: "bg-emerald-500/10", status: "Interested" },
    { title: "Committed", value: apiStats.committed, icon: Handshake, color: "text-orange-500", bg: "bg-orange-500/10", status: "Committed" },
    { title: "Converted / Paid", value: apiStats.converted, icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10", status: "Converted" },
    { title: "Not Interested", value: apiStats.notInterested, icon: ThumbsDown, color: "text-red-500", bg: "bg-red-500/10", status: "Not Interested" },
  ];

  const showLeadsForStatus = (status: string) => {
    setListStatus(status)
    requestAnimationFrame(() => {
      leadsTableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Company Leads" description="Manage company leads, primary contacts and follow-ups.">
        <div className="flex items-center gap-3">
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
                onChange={(value) => setDateRange((prev) => ({ ...prev, startDate: value }))}
                className="w-[145px]"
              />
              <PickerInput
                inputRef={endDateRef}
                type="date"
                value={dateRange.endDate}
                onChange={(value) => setDateRange((prev) => ({ ...prev, endDate: value }))}
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
          {can(currentUser, "leads.create") && (
            <Button onClick={() => navigate({ to: '/leads/new' })}>
              <Plus className="mr-2 h-4 w-4" /> Add Company Lead
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Card 
            key={i} 
            className="shadow-sm border-muted/60 transition-all hover:shadow-md cursor-pointer hover:border-primary/50"
            role="button"
            tabIndex={0}
            aria-label={`Show ${stat.title}`}
            onClick={() => showLeadsForStatus("status" in stat && stat.status ? stat.status : "all")}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                showLeadsForStatus("status" in stat && stat.status ? stat.status : "all")
              }
            }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <div className="text-2xl font-bold">{stat.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div ref={leadsTableRef}>
        <CompanyLeadsTable
          status={listStatus}
          onStatusChange={setListStatus}
          dateFilters={{
            period: statsPeriod,
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            month: selectedMonth,
            year: selectedYear,
          }}
        />
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
        onChange={(e) => onChange(e.target.value)}
        className="w-full cursor-pointer pr-10 [&::-webkit-calendar-picker-indicator]:opacity-0"
      />
      <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}
