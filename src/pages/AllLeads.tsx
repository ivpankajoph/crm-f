import { useState, useEffect } from "react"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Loader2, Building2, Users, Send, Mail, MessageSquare, UserPlus, Phone } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import api from "@/services/api"
import { toast } from "sonner"
import { DataPagination } from "@/components/shared/DataPagination"
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery"

interface UnifiedLead {
  _id: string;
  name: string;
  email: string;
  phone: string;
  type: 'Customer' | 'Company';
  leadStatus: string;
  followTypeDate?: string;
  createdBy: string;
  assignedTo: string;
  commentsCount: number;
  createdAt: string;
}

interface AssignableUser {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export default function AllLeads() {
  const navigate = useNavigate()
  const searchParams = useSearch({ strict: false }) as any
  
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState("All")
  const [dateFilter, setDateFilter] = useState("All")
  const [statusFilter, setStatusFilter] = useState(searchParams?.status || "All")

  const [modalOpen, setModalOpen] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)
  const [selectedLeadData, setSelectedLeadData] = useState<any>(null)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [selectedActionLead, setSelectedActionLead] = useState<UnifiedLead | null>(null)
  const [selectedLeadKeys, setSelectedLeadKeys] = useState<string[]>([])
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([])
  const [selectedAssignee, setSelectedAssignee] = useState("")
  const [assigning, setAssigning] = useState(false)
  const { data, isLoading: loading, refetch } = usePaginatedQuery<UnifiedLead>({
    endpoint: "/leads/all/paged",
    page,
    limit: 25,
    params: {
      type: typeFilter === "All" ? undefined : typeFilter,
      date: dateFilter === "All" ? undefined : dateFilter,
      status: statusFilter === "All" ? undefined : statusFilter,
      followUp: searchParams?.followUp,
    },
  })
  const filteredLeads = data?.items || []

  useEffect(() => {
    fetchAssignableUsers()
  }, [])

  useEffect(() => {
    setStatusFilter(searchParams?.status || "All")
    setPage(1)
  }, [searchParams?.status])

  const fetchAssignableUsers = async () => {
    try {
      const res = await api.get('/leads/assignable-users')
      setAssignableUsers(res.data.data || [])
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load assignable users")
    }
  }

  const openLeadDetails = async (lead: UnifiedLead) => {
    setModalOpen(true)
    setModalLoading(true)
    try {
      const res = await api.get(`/leads/unified/${lead.type}/${lead._id}`)
      setSelectedLeadData(res.data.data)
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to fetch details")
      setModalOpen(false)
    } finally {
      setModalLoading(false)
    }
  }

  const openActionDialog = (lead: UnifiedLead) => {
    setSelectedActionLead(lead)
    setActionDialogOpen(true)
  }

  const handleLeadAction = (type: "email" | "whatsapp" | "call" | "comments") => {
    setActionDialogOpen(false)
    if (type === "email") {
      navigate({ to: "/email-marketing" })
      return
    }
    if (type === "whatsapp") {
      navigate({ to: "/whatsapp-campaigns" })
      return
    }
    if (type === "call" || type === "comments") {
      if (selectedActionLead) {
        navigate({ to: `/leads/all/${selectedActionLead.type}/${selectedActionLead._id}` })
      }
      return
    }
  }

  const getLeadKey = (lead: UnifiedLead) => `${lead.type}:${lead._id}`

  const toggleLeadSelection = (lead: UnifiedLead, checked: boolean) => {
    const key = getLeadKey(lead)
    setSelectedLeadKeys((prev) => checked ? Array.from(new Set([...prev, key])) : prev.filter((item) => item !== key))
  }

  const toggleAllVisible = (checked: boolean) => {
    const visibleKeys = filteredLeads.map(getLeadKey)
    setSelectedLeadKeys((prev) => {
      if (!checked) return prev.filter((key) => !visibleKeys.includes(key))
      return Array.from(new Set([...prev, ...visibleKeys]))
    })
  }

  const handleBulkAssign = async () => {
    if (selectedLeadKeys.length === 0) {
      toast.error("Select at least one lead")
      return
    }
    if (!selectedAssignee) {
      toast.error("Select an employee to assign")
      return
    }

    try {
      setAssigning(true)
      const leadsToAssign = selectedLeadKeys.map((key) => {
        const [type, id] = key.split(":")
        return { type, id }
      })
      const res = await api.put('/leads/bulk-assign', {
        assignedTo: selectedAssignee,
        leads: leadsToAssign,
      })
      toast.success(res.data.message || "Leads assigned successfully")
      setSelectedLeadKeys([])
      setSelectedAssignee("")
      await refetch()
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to assign leads")
    } finally {
      setAssigning(false)
    }
  }

  const visibleSelectedCount = filteredLeads.filter((lead) => selectedLeadKeys.includes(getLeadKey(lead))).length
  const allVisibleSelected = filteredLeads.length > 0 && visibleSelectedCount === filteredLeads.length

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="All Unified Leads" description="View and filter all your Companies and Customers.">
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={(value) => {
            setStatusFilter(value)
            setPage(1)
          }}>
            <SelectTrigger className="w-[140px] bg-background">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Statuses</SelectItem>
              <SelectItem value="New">New</SelectItem>
              <SelectItem value="Demo Scheduled">Demo Scheduled</SelectItem>
              <SelectItem value="Interested">Interested</SelectItem>
              <SelectItem value="Not Interested">Not Interested</SelectItem>
              <SelectItem value="Follow Up">Follow Up</SelectItem>
              <SelectItem value="Committed">Committed</SelectItem>
              <SelectItem value="Converted">Converted / Paid</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={(value) => {
            setTypeFilter(value)
            setPage(1)
          }}>
            <SelectTrigger className="w-[140px] bg-background">
              <SelectValue placeholder="Lead Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Types</SelectItem>
              <SelectItem value="Company">Companies</SelectItem>
              <SelectItem value="Customer">Customers</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={(value) => {
            setDateFilter(value)
            setPage(1)
          }}>
            <SelectTrigger className="w-[140px] bg-background">
              <SelectValue placeholder="Date Added" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Time</SelectItem>
              <SelectItem value="Today">Today</SelectItem>
              <SelectItem value="This Week">This Week</SelectItem>
              <SelectItem value="This Month">This Month</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={() => navigate({ to: '/leads' })} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Leads
          </Button>
        </div>
      </PageHeader>

      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{selectedLeadKeys.length}</span> selected
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select value={selectedAssignee} onValueChange={setSelectedAssignee} disabled={assignableUsers.length === 0}>
            <SelectTrigger className="w-full bg-background sm:w-[280px]">
              <SelectValue placeholder={assignableUsers.length === 0 ? "No employees available" : "Assign selected to..."} />
            </SelectTrigger>
            <SelectContent>
              {assignableUsers.map((user) => (
                <SelectItem key={user._id} value={user._id}>
                  {user.name} ({user.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="gap-2" onClick={handleBulkAssign} disabled={assigning || selectedLeadKeys.length === 0 || !selectedAssignee}>
            {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Assign Leads
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[48px]">
                  <Checkbox
                    checked={allVisibleSelected ? true : visibleSelectedCount > 0 ? "indeterminate" : false}
                    onCheckedChange={(checked) => toggleAllVisible(checked === true)}
                    aria-label="Select all visible leads"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Contact Info</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : filteredLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No leads found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeads.map((lead) => (
                  <TableRow key={getLeadKey(lead)}>
                    <TableCell>
                      <Checkbox
                        checked={selectedLeadKeys.includes(getLeadKey(lead))}
                        onCheckedChange={(checked) => toggleLeadSelection(lead, checked === true)}
                        aria-label={`Select ${lead.name}`}
                      />
                    </TableCell>
                    <TableCell 
                      className="font-medium text-primary cursor-pointer hover:underline"
                      onClick={() => openLeadDetails(lead)}
                    >
                      {lead.name}
                    </TableCell>
                    <TableCell>
                      {lead.type === 'Company' ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          <Building2 className="mr-1 h-3 w-3" /> Company
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          <Users className="mr-1 h-3 w-3" /> Customer
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">{lead.email || '-'}</span>
                        <span className="text-xs text-muted-foreground">{lead.phone || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {lead.createdBy}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {lead.assignedTo}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => openActionDialog(lead)}
                      >
                        <Send className="h-4 w-4" />
                        Action
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {data?.pagination && (
          <DataPagination pagination={data.pagination} onPageChange={setPage} />
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {modalLoading ? "Loading..." : selectedLeadData?.companyName || selectedLeadData?.name}
            </DialogTitle>
            <DialogDescription>
              {modalLoading ? "" : selectedLeadData ? `${selectedLeadData.type || (selectedLeadData.companyName ? 'Company' : 'Customer')} Profile` : ""}
            </DialogDescription>
          </DialogHeader>
          
          {modalLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : selectedLeadData ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-sm mt-4">
              {selectedLeadData.companyName && (
                <>
                  <DetailItem label="Customer Name" value={selectedLeadData.customerName} />
                  <DetailItem label="Designation" value={selectedLeadData.customerDesignation} />
                  <DetailItem label="Mobile No" value={selectedLeadData.mobileNo} />
                  <DetailItem label="Phone No" value={selectedLeadData.phoneNo} />
                  <DetailItem label="Email 1" value={selectedLeadData.email1} />
                  <DetailItem label="Email 2" value={selectedLeadData.email2} />
                  <DetailItem label="Products" value={selectedLeadData.products} />
                  <DetailItem label="Business Type" value={selectedLeadData.businessType} />
                  <DetailItem label="Website 1" value={selectedLeadData.website1} />
                  <DetailItem label="Website 2" value={selectedLeadData.website2} />
                  <DetailItem label="Address 1" value={selectedLeadData.address1} />
                  <DetailItem label="Address 2" value={selectedLeadData.address2} />
                  <DetailItem label="City" value={selectedLeadData.city} />
                  <DetailItem label="State" value={selectedLeadData.state} />
                  <DetailItem label="Country" value={selectedLeadData.country} />
                </>
              )}
              {!selectedLeadData.companyName && (
                <>
                  <DetailItem label="Name" value={selectedLeadData.name} />
                  <DetailItem label="Email" value={selectedLeadData.email} />
                  <DetailItem label="Phone" value={selectedLeadData.phone} />
                  <DetailItem label="Company" value={selectedLeadData.company} />
                  <DetailItem label="Address" value={selectedLeadData.address} />
                  <DetailItem label="Total Spend" value={`$${selectedLeadData.totalSpend || 0}`} />
                </>
              )}
              <div className="col-span-full border-t pt-4 mt-2">
                <DetailItem label="Lead Source" value={selectedLeadData.leadSource} />
                <DetailItem label="Status" value={selectedLeadData.leadStatus === "Converted" ? "Converted / Paid" : selectedLeadData.leadStatus} />
                <DetailItem label="Created By" value={selectedLeadData.createdBy?.name || 'System'} />
                <DetailItem
                  label="Assigned To"
                  value={(Array.isArray(selectedLeadData.assignedTo)
                    ? selectedLeadData.assignedTo.map((user: any) => user?.name || "Unknown").join(", ")
                    : selectedLeadData.assignedTo?.name) || '-'}
                />
                <DetailItem label="Date Added" value={new Date(selectedLeadData.createdAt).toLocaleDateString()} />
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="sm:max-w-[520px] p-6 border-none shadow-xl bg-card/95 backdrop-blur-sm">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-bold text-center">Choose Action</DialogTitle>
            <DialogDescription className="text-center text-base mt-2">
              Select how you want to contact <span className="font-semibold text-primary">{selectedActionLead?.name || "this lead"}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <button
              className="group flex flex-col items-center justify-center gap-3 rounded-xl border border-border/50 bg-card p-6 text-sm font-medium transition-all hover:-translate-y-1 hover:border-blue-500/30 hover:bg-blue-50/50 hover:shadow-md dark:hover:bg-blue-950/20"
              onClick={() => handleLeadAction("email")}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 transition-transform group-hover:scale-110 dark:bg-blue-900/50 dark:text-blue-400">
                <Mail className="h-5 w-5" />
              </div>
              <span>Email</span>
            </button>
            <button
              className="group flex flex-col items-center justify-center gap-3 rounded-xl border border-border/50 bg-card p-6 text-sm font-medium transition-all hover:-translate-y-1 hover:border-emerald-500/30 hover:bg-emerald-50/50 hover:shadow-md dark:hover:bg-emerald-950/20"
              onClick={() => handleLeadAction("whatsapp")}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 transition-transform group-hover:scale-110 dark:bg-emerald-900/50 dark:text-emerald-400">
                <MessageSquare className="h-5 w-5" />
              </div>
              <span>WhatsApp</span>
            </button>
            <button
              className="group flex flex-col items-center justify-center gap-3 rounded-xl border border-border/50 bg-card p-6 text-sm font-medium transition-all hover:-translate-y-1 hover:border-primary/30 hover:bg-primary/5 hover:shadow-md"
              onClick={() => handleLeadAction("call")}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <Phone className="h-5 w-5" />
              </div>
              <span>Calls & Comments</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DetailItem({ label, value }: { label: string, value: any }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground uppercase font-semibold">{label}</span>
      <span className="font-medium text-foreground mt-0.5">{value || '-'}</span>
    </div>
  )
}
