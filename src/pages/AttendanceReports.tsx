import { useState, useEffect } from "react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Loader2, CalendarRange } from "lucide-react"
import api from "@/services/api"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useUsersQuery } from "@/hooks/useCrmReferenceData"
import {
  attendanceDateInput,
  attendanceWorkedMinutes,
  formatAttendanceDate,
  formatAttendanceDuration,
  formatAttendanceTime,
  formatMinutes,
} from "@/lib/attendance"

export default function AttendanceReports() {
  // Filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(1) // First day of current month
    return attendanceDateInput(d)
  })
  const [endDate, setEndDate] = useState(attendanceDateInput())
  const [userId, setUserId] = useState<string>("all")
  
  const employeesQuery = useUsersQuery<any[]>("attendance")
  const employees = employeesQuery.data || []
  const reportQuery = useQuery<any[]>({
    queryKey: ["reports", "attendance", startDate, endDate, userId],
    enabled: Boolean(startDate && endDate),
    queryFn: async () => {
      const endpoint = `/attendance/report?startDate=${startDate}&endDate=${endDate}${userId !== 'all' ? `&userId=${userId}` : ''}`
      return (await api.get(endpoint)).data.data || []
    },
    staleTime: 2 * 60_000,
    gcTime: 30 * 60_000,
    placeholderData: keepPreviousData,
  })
  const data = reportQuery.data || []
  const loading = reportQuery.isLoading
  useEffect(() => {
    if (reportQuery.error) {
      const error = reportQuery.error as any
      toast.error(error.response?.data?.message || "Failed to fetch attendance report")
    }
  }, [reportQuery.error])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Present': return <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">Present</Badge>
      case 'Absent': return <Badge variant="destructive">Absent</Badge>
      case 'Half Day': return <Badge variant="secondary" className="bg-amber-500 text-white hover:bg-amber-600">Half Day</Badge>
      case 'On Leave': return <Badge variant="outline" className="border-blue-500 text-blue-500">On Leave</Badge>
      default: return <Badge variant="outline" className="text-muted-foreground border-dashed">Not Marked</Badge>
    }
  }

  // Summary logic
  const totalDays = data.length
  const totalPresent = data.filter(d => d.status === 'Present').length
  const totalHalf = data.filter(d => d.status === 'Half Day').length
  const totalAbsent = data.filter(d => d.status === 'Absent').length
  const totalLeave = data.filter(d => d.status === 'On Leave').length
  const totalWorkedMinutes = data.reduce(
    (total, record) => total + (attendanceWorkedMinutes(record) ?? 0),
    0,
  )

  return (
    <div className="flex flex-col gap-3 [&>div:first-child]:mb-0">
      <PageHeader title="Attendance Reports" description="Analyze employee attendance over a custom date range." />

      <Card className="shadow-sm">
        <CardHeader className="flex flex-col items-center justify-between gap-3 border-b bg-muted/20 p-4 md:flex-row">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-primary" />
            Report Filters
          </CardTitle>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">From:</span>
              <Input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="w-auto h-9 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">To:</span>
              <Input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="w-auto h-9 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Employee:</span>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger className="w-[180px] h-9 text-sm">
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp._id} value={emp._id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3 border-b bg-muted/10 p-3 lg:grid-cols-3 xl:grid-cols-6">
             <div className="flex h-20 flex-col items-center justify-center rounded-lg border bg-card px-2 py-2">
               <span className="mb-1 whitespace-nowrap text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Records</span>
               <span className="text-xl font-bold">{totalDays}</span>
             </div>
             <div className="flex h-20 flex-col items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-2 text-emerald-700 dark:text-emerald-400">
               <span className="mb-1 whitespace-nowrap text-[11px] font-bold uppercase tracking-wider">Present</span>
               <span className="text-xl font-bold">{totalPresent}</span>
             </div>
             <div className="flex h-20 flex-col items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-2 text-amber-700 dark:text-amber-400">
               <span className="mb-1 whitespace-nowrap text-[11px] font-bold uppercase tracking-wider">Half Day</span>
               <span className="text-xl font-bold">{totalHalf}</span>
             </div>
             <div className="flex h-20 flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/10 px-2 py-2 text-destructive">
               <span className="mb-1 whitespace-nowrap text-[11px] font-bold uppercase tracking-wider">Absent</span>
               <span className="text-xl font-bold">{totalAbsent}</span>
             </div>
             <div className="flex h-20 flex-col items-center justify-center rounded-lg border border-blue-500/20 bg-blue-500/10 px-2 py-2 text-blue-700 dark:text-blue-400">
               <span className="mb-1 whitespace-nowrap text-[11px] font-bold uppercase tracking-wider">On Leave</span>
               <span className="text-xl font-bold">{totalLeave}</span>
             </div>
             <div className="flex h-20 flex-col items-center justify-center rounded-lg border border-violet-500/20 bg-violet-500/10 px-2 py-2 text-violet-700 dark:text-violet-400">
               <span className="mb-1 whitespace-nowrap text-[11px] font-bold uppercase tracking-wider">Total Worked</span>
               <span className="text-xl font-bold">{formatMinutes(totalWorkedMinutes)}</span>
             </div>
          </div>

          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Employee Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Total Login Hours</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                        No attendance records found for the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map((record) => (
                      <TableRow key={record._id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">
                           {formatAttendanceDate(record.date)}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold">{record.user?.name || 'Unknown'}</div>
                          <div className="text-xs text-muted-foreground">{record.user?.email}</div>
                        </TableCell>
                        <TableCell>
                          <span className="capitalize text-sm">{record.user?.role || '-'}</span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm tabular-nums">
                          {formatAttendanceTime(record.checkIn)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm tabular-nums">
                          {formatAttendanceTime(record.checkOut)}
                        </TableCell>
                        <TableCell className="text-sm font-medium tabular-nums">
                          {formatAttendanceDuration(record)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(record.status)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
