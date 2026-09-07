import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
import { useSelector } from "react-redux"
import { Building2, Eye, Loader2, Pencil, Trash2, UserPlus } from "lucide-react"
import Swal from "sweetalert2"
import { toast } from "sonner"

import type { RootState } from "@/store"
import api from "@/services/api"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery"
import { DataPagination } from "@/components/shared/DataPagination"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { can } from "@/lib/accessControl"

interface CompanyLead {
  _id: string
  companyName: string
  customerName?: string
  customerDesignation?: string
  email1?: string
  mobileNo?: string
  website1?: string
  city?: string
  country?: string
  leadStatus?: string
  followUpRequired?: boolean
  followUpDateTime?: string
  followTypeDate?: string
  scheduledDateTime?: string
  createdAt?: string
  createdBy?: { _id: string; name: string; role?: string }
  assignedTo?: Array<{ _id: string; name: string }>
}

interface AssignableUser {
  _id: string
  name: string
  role: string
}

interface CompanyLeadDateFilters {
  period: string
  startDate: string
  endDate: string
  month: string
  year: string
}

const STATUSES = [
  { value: "New", label: "New" },
  { value: "Demo Scheduled", label: "Demo Scheduled" },
  { value: "Interested", label: "Interested" },
  { value: "Not Interested", label: "Not Interested" },
  { value: "Follow Up", label: "Follow Up" },
  { value: "Committed", label: "Committed" },
  { value: "Converted", label: "Converted / Paid" },
]

const formatDateTime = (value?: string) => {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date).replace(/\b(am|pm)\b/gi, (period) => period.toUpperCase())
}

export function CompanyLeadsTable({
  status,
  onStatusChange,
  dateFilters,
}: {
  status: string
  onStatusChange: (status: string) => void
  dateFilters: CompanyLeadDateFilters
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useSelector((state: RootState) => state.auth)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [city, setCity] = useState("all")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([])
  const [assignableUsersLoaded, setAssignableUsersLoaded] = useState(false)
  const [assignee, setAssignee] = useState("")
  const [assigning, setAssigning] = useState(false)
  const debouncedSearch = useDebouncedValue(search)

  const { data, isLoading, isFetching, refetch } = usePaginatedQuery<CompanyLead>({
    endpoint: "/companies/paged",
    page,
    limit: 25,
    params: {
      search: debouncedSearch,
      status,
      city,
      period: status === "all" ? undefined : dateFilters.period,
      startDate: status !== "all" && dateFilters.period === "date" ? dateFilters.startDate : undefined,
      endDate: status !== "all" && dateFilters.period === "date" ? dateFilters.endDate : undefined,
      month: status !== "all" && dateFilters.period === "month" ? dateFilters.month : undefined,
      year: status !== "all" && dateFilters.period === "year" ? dateFilters.year : undefined,
    },
    staleTime: 30_000,
  })

  const companies = useMemo(() => data?.items || [], [data?.items])
  const cities = (data?.facets?.cities as string[] | undefined) || []
  const visibleIds = useMemo(() => companies.map((company) => company._id), [companies])
  const selectedVisibleCount = visibleIds.filter((id) => selectedIds.includes(id)).length
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length

  useEffect(() => {
    if (selectedIds.length === 0 || assignableUsersLoaded) return
    let active = true
    api.get("/leads/assignable-users")
      .then((response) => {
        if (active) {
          setAssignableUsers(response.data.data || [])
          setAssignableUsersLoaded(true)
        }
      })
      .catch(() => {
        if (active) {
          setAssignableUsers([])
          setAssignableUsersLoaded(true)
        }
      })
    return () => { active = false }
  }, [assignableUsersLoaded, selectedIds.length])

  useEffect(() => {
    setSelectedIds([])
    setPage(1)
  }, [
    status,
    city,
    debouncedSearch,
    dateFilters.period,
    dateFilters.startDate,
    dateFilters.endDate,
    dateFilters.month,
    dateFilters.year,
  ])

  const canEditLeads = can(user, "leads.edit")
  const canDeleteLeads = can(user, "leads.delete")
  const canAssignLeads = can(user, "leads.assign")

  const toggleAll = (checked: boolean) => {
    setSelectedIds((current) => checked
      ? Array.from(new Set([...current, ...visibleIds]))
      : current.filter((id) => !visibleIds.includes(id)))
  }

  const assignSelected = async () => {
    if (!assignee || selectedIds.length === 0) return
    try {
      setAssigning(true)
      const response = await api.put("/leads/bulk-assign", {
        assignedTo: assignee,
        leads: selectedIds.map((id) => ({ type: "Company", id })),
      })
      toast.success(response.data.message || "Company leads assigned successfully")
      setSelectedIds([])
      setAssignee("")
      await refetch()
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to assign company leads")
    } finally {
      setAssigning(false)
    }
  }

  const deleteCompany = async (company: CompanyLead) => {
    const result = await Swal.fire({
      title: `Delete ${company.companyName}?`,
      text: "This company lead and its activity will be permanently removed.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Delete",
    })
    if (!result.isConfirmed) return
    try {
      await api.delete(`/companies/${company._id}`)
      await queryClient.invalidateQueries({ queryKey: ["leads", "stats"] })
      toast.success("Company lead deleted")
      setSelectedIds((current) => current.filter((id) => id !== company._id))
      await refetch()
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete company lead")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm xl:flex-row xl:items-center">
        <div className="relative min-w-0 flex-1">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search company, contact, email or phone..."
            className="pr-9"
          />
          {isFetching && !isLoading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="w-full bg-background xl:w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger className="w-full bg-background xl:w-[170px]">
            <SelectValue placeholder="All cities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All cities</SelectItem>
            {cities.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {canAssignLeads && selectedIds.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-medium">{selectedIds.length} company lead{selectedIds.length === 1 ? "" : "s"} selected</span>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger className="w-full bg-background sm:w-[250px]">
                <SelectValue placeholder={assignableUsers.length ? "Assign selected to..." : "No users available"} />
              </SelectTrigger>
              <SelectContent>
                {assignableUsers.map((item) => (
                  <SelectItem key={item._id} value={item._id}>{item.name} ({item.role})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={assignSelected} disabled={!assignee || assigning}>
              {assigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Assign
            </Button>
          </div>
        </div>
      )}

      <Card className="overflow-hidden shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-12">
                    {canAssignLeads && (
                      <Checkbox
                        checked={allVisibleSelected ? true : selectedVisibleCount > 0 ? "indeterminate" : false}
                        onCheckedChange={(checked) => toggleAll(checked === true)}
                        aria-label="Select visible company leads"
                      />
                    )}
                  </TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Primary Person Contact</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Next Follow-up</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-40 text-center">
                      <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" />
                    </TableCell>
                  </TableRow>
                ) : companies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-40 text-center text-muted-foreground">
                      <Building2 className="mx-auto mb-3 h-8 w-8 opacity-50" />
                      No company leads match these filters.
                    </TableCell>
                  </TableRow>
                ) : companies.map((company) => (
                  <TableRow key={company._id} className="hover:bg-muted/30">
                    <TableCell>
                      {canAssignLeads && (
                        <Checkbox
                          checked={selectedIds.includes(company._id)}
                          onCheckedChange={(checked) => setSelectedIds((current) => checked
                            ? Array.from(new Set([...current, company._id]))
                            : current.filter((id) => id !== company._id))}
                          aria-label={`Select ${company.companyName}`}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        className="text-left font-semibold text-primary hover:underline"
                        onClick={() => navigate({ to: "/leads/$id", params: { id: company._id } })}
                      >
                        {company.companyName}
                      </button>
                      {company.website1 && <div className="mt-0.5 max-w-[220px] truncate text-xs text-muted-foreground">{company.website1}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{company.customerName || "—"}</div>
                      <div className="text-xs text-muted-foreground">{company.customerDesignation || ""}</div>
                    </TableCell>
                    <TableCell>
                      <div>{company.mobileNo || "—"}</div>
                      <div className="text-xs text-muted-foreground">{company.email1 || ""}</div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                        {company.leadStatus === "Converted" ? "Converted / Paid" : company.leadStatus || "New"}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[180px] text-sm text-muted-foreground">
                      {company.assignedTo?.map((item) => item.name).join(", ") || "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatDateTime(company.createdAt)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(company.followUpDateTime || company.scheduledDateTime || company.followTypeDate)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" title="View lead" onClick={() => navigate({ to: "/leads/$id", params: { id: company._id } })}>
                          <Eye className="h-4 w-4 text-blue-500" />
                        </Button>
                        {canEditLeads && (
                            <Button variant="ghost" size="icon" title="Edit lead" onClick={() => navigate({ to: "/leads/$id/edit", params: { id: company._id } })}>
                              <Pencil className="h-4 w-4 text-orange-500" />
                            </Button>
                        )}
                        {canDeleteLeads && (
                            <Button variant="ghost" size="icon" title="Delete lead" onClick={() => deleteCompany(company)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DataPagination pagination={data?.pagination} onPageChange={setPage} />
        </CardContent>
      </Card>
    </div>
  )
}
