import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useSelector } from "react-redux"
import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/layout/EmptyState"
import { Button } from "@/components/ui/button"
import { Plus, Loader2, Building2, Eye, Pencil, Building, MapPin, Contact, Globe, Briefcase, Trash2 } from "lucide-react"
import api from "@/services/api"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { RootState } from "@/store"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import Swal from "sweetalert2"
import { Input } from "@/components/ui/input"
import { DataPagination } from "@/components/shared/DataPagination"
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"

export default function Companies() {
  const navigate = useNavigate()
  const { user } = useSelector((state: RootState) => state.auth)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search)
  
  // View Company State
  const [selectedCompany, setSelectedCompany] = useState<any | null>(null)
  const [isViewOpen, setIsViewOpen] = useState(false)

  // Filters state
  const [statusFilter, setStatusFilter] = useState("all")
  const [cityFilter, setCityFilter] = useState("all")
  const {
    data,
    isLoading: loading,
    refetch: fetchCompanies,
  } = usePaginatedQuery<any>({
    endpoint: "/companies/paged",
    page,
    params: { search: debouncedSearch, status: statusFilter, city: cityFilter },
  })
  const companies = data?.items || []
  const uniqueCities = (data?.facets?.cities as string[] | undefined) || []

  const handleView = async (company: any) => {
    try {
      const response = await api.get(`/companies/${company._id}`)
      setSelectedCompany(response.data.data)
      setIsViewOpen(true)
    } catch {
      toast.error("Failed to load company details")
    }
  }

  const canEdit = (company: any) => {
    if (!user) return false;
    return user.role === 'admin' || user._id === company.createdBy?._id;
  }

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    })

    if (result.isConfirmed) {
      try {
        await api.delete(`/companies/${id}`)
        Swal.fire(
          'Deleted!',
          'The company has been deleted.',
          'success'
        )
        void fetchCompanies()
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to delete company")
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Companies" description="Manage company profiles.">
        <div className="flex items-center gap-3">
          <Input
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1) }}
            placeholder="Search companies..."
            className="w-[210px]"
          />
          <Select value={cityFilter} onValueChange={(value) => { setCityFilter(value); setPage(1) }}>
            <SelectTrigger className="w-[150px] bg-background">
              <SelectValue placeholder="All Cities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {uniqueCities.map(city => (
                <SelectItem key={city as string} value={city as string}>{city as string}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1) }}>
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="New">New</SelectItem>
              <SelectItem value="Interested">Interested</SelectItem>
              <SelectItem value="Not Interested">Not Interested</SelectItem>
              <SelectItem value="Committed">Committed</SelectItem>
              <SelectItem value="Converted">Converted / Paid</SelectItem>
              <SelectItem value="Follow Up">Follow Up</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => navigate({ to: '/companies/new' })}>
            <Plus className="mr-2 h-4 w-4" /> Add New
          </Button>
        </div>
      </PageHeader>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : companies.length === 0 ? (
        <EmptyState
          title="No companies found"
          description="Get started by creating a new one."
          actionLabel="Create Company"
          onAction={() => navigate({ to: '/companies/new' })}
          icon={<Building2 className="h-10 w-10 text-muted-foreground" />}
        />
      ) : (
        <Card className="shadow-sm">
          <CardContent className="p-0">

            {companies.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No companies match your filters.
              </div>
            ) : (
            <div className="rounded-b-md overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-medium text-foreground">Company Name</TableHead>
                    <TableHead className="font-medium text-foreground">Customer</TableHead>
                    <TableHead className="font-medium text-foreground">Contact</TableHead>
                    <TableHead className="font-medium text-foreground">Location</TableHead>
                    <TableHead className="font-medium text-foreground">Created By</TableHead>
                    <TableHead className="font-medium text-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => (
                    <TableRow key={company._id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        {company.companyName}
                        {company.website1 && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            <a href={company.website1.startsWith('http') ? company.website1 : `https://${company.website1}`} target="_blank" rel="noreferrer" className="hover:underline text-primary">
                              {company.website1}
                            </a>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{company.customerName || "-"}</div>
                        <div className="text-xs text-muted-foreground">{company.customerDesignation || ""}</div>
                      </TableCell>
                      <TableCell>
                        <div>{company.mobileNo}</div>
                        <div className="text-xs text-muted-foreground">{company.email1 || ""}</div>
                      </TableCell>
                      <TableCell>
                        <div>{company.city || "-"}</div>
                        <div className="text-xs text-muted-foreground">{company.country || ""}</div>
                      </TableCell>
                      <TableCell>
                        {company.createdBy ? (
                          <>
                            <div className="font-medium">{company.createdBy.name}</div>
                            <div className="text-xs text-muted-foreground">
                              ({company.createdBy.role})
                            </div>
                          </>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleView(company)} title="View Details">
                            <Eye className="h-4 w-4 text-blue-500" />
                          </Button>
                          {canEdit(company) && (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => navigate({ to: `/companies/edit/${company._id}` })} title="Edit Company">
                                <Pencil className="h-4 w-4 text-orange-500" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(company._id)} title="Delete Company">
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            )}
            <DataPagination pagination={data?.pagination} onPageChange={setPage} />
          </CardContent>
        </Card>
      )}

      {/* View Company Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Building className="h-5 w-5 text-primary" />
              Company Details
            </DialogTitle>
            <DialogDescription>
              Complete information for {selectedCompany?.companyName}
            </DialogDescription>
          </DialogHeader>

          {selectedCompany && (
            <div className="mt-4 space-y-6">
              
              {/* Profile */}
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-3 text-foreground/80">
                  <Building2 className="h-4 w-4 text-primary" />
                  Company Profile
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-md border">
                  <div>
                    <span className="text-xs text-muted-foreground block">Company Name</span>
                    <span className="font-medium">{selectedCompany.companyName}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Customer Name</span>
                    <span className="font-medium">{selectedCompany.customerName || "-"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Designation</span>
                    <span className="font-medium">{selectedCompany.customerDesignation || "-"}</span>
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-3 text-foreground/80">
                  <Contact className="h-4 w-4 text-blue-500" />
                  Contact Information
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-md border">
                  <div>
                    <span className="text-xs text-muted-foreground block">Mobile Number</span>
                    <span className="font-medium">{selectedCompany.mobileNo}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Alternate Phone</span>
                    <span className="font-medium">{selectedCompany.phoneNo || "-"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Primary Email</span>
                    <span className="font-medium">{selectedCompany.email1 || "-"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Secondary Email</span>
                    <span className="font-medium">{selectedCompany.email2 || "-"}</span>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-3 text-foreground/80">
                  <MapPin className="h-4 w-4 text-emerald-500" />
                  Location Details
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-md border">
                  <div className="col-span-2">
                    <span className="text-xs text-muted-foreground block">Address Line 1</span>
                    <span className="font-medium">{selectedCompany.address1}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-muted-foreground block">Address Line 2</span>
                    <span className="font-medium">{selectedCompany.address2 || "-"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">City</span>
                    <span className="font-medium">{selectedCompany.city || "-"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">State / Province</span>
                    <span className="font-medium">{selectedCompany.state || "-"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Country</span>
                    <span className="font-medium">{selectedCompany.country || "-"}</span>
                  </div>
                </div>
              </div>

              {/* Business & Engagement */}
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-3 text-foreground/80">
                  <Briefcase className="h-4 w-4 text-purple-500" />
                  Business & Engagement
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-md border">
                  <div>
                    <span className="text-xs text-muted-foreground block">Business Type</span>
                    <span className="font-medium">{selectedCompany.businessType || "-"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Products/Services</span>
                    <span className="font-medium">{selectedCompany.products || "-"}</span>
                  </div>
                  <div className="col-span-2">
                    <Separator className="my-2" />
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block flex items-center gap-1"><Globe className="h-3 w-3"/> Primary Website</span>
                    {selectedCompany.website1 ? (
                      <a href={selectedCompany.website1.startsWith('http') ? selectedCompany.website1 : `https://${selectedCompany.website1}`} target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium break-all">
                        {selectedCompany.website1}
                      </a>
                    ) : "-"}
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block flex items-center gap-1"><Globe className="h-3 w-3"/> Alternate Website</span>
                    {selectedCompany.website2 ? (
                      <a href={selectedCompany.website2.startsWith('http') ? selectedCompany.website2 : `https://${selectedCompany.website2}`} target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium break-all">
                        {selectedCompany.website2}
                      </a>
                    ) : "-"}
                  </div>
                  <div className="col-span-2">
                    <Separator className="my-2" />
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Next Follow-up Date</span>
                    <span className="font-medium">
                      {selectedCompany.followTypeDate ? new Date(selectedCompany.followTypeDate).toLocaleDateString() : "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Engagement Type</span>
                    <span className="font-medium">
                      {selectedCompany.followType === 'Hot' ? '🔥 Hot' : 
                       selectedCompany.followType === 'Warm' ? '☀️ Warm' : 
                       selectedCompany.followType === 'Cold' ? '❄️ Cold' : "-"}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          )}
          <div className="flex justify-end mt-6">
            <Button onClick={() => setIsViewOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
