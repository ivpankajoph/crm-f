import { useState, useEffect } from "react"
import { useNavigate, useParams } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, Building2, MapPin, Contact, Globe, Briefcase } from "lucide-react"
import api from "@/services/api"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

const COUNTRIES = [
  "India", "United States", "United Kingdom", "Canada", "Australia", 
  "Germany", "France", "United Arab Emirates", "Singapore", "Japan", 
  "China", "Brazil", "South Africa"
];

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", 
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", 
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", 
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", 
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const BUSINESS_TYPES = [
  "Manufacturing",
  "Information Technology (IT)",
  "Retail & E-commerce",
  "Healthcare & Pharmaceuticals",
  "Finance & Banking",
  "Education & EdTech",
  "Real Estate & Construction",
  "Transportation & Logistics",
  "Agriculture & Food",
  "Telecommunications",
  "Media & Entertainment",
  "Hospitality & Tourism",
  "Consulting & Professional Services",
  "Energy & Utilities",
  "Other"
];

const LEAD_STATUSES = [
  { value: "New", color: "bg-blue-500" },
  { value: "Demo Scheduled", color: "bg-cyan-500" },
  { value: "Interested", color: "bg-emerald-500" },
  { value: "Not Interested", color: "bg-red-500" },
  { value: "Follow Up", color: "bg-yellow-500" },
  { value: "Committed", color: "bg-orange-500" },
  { value: "Converted", label: "Converted / Paid", color: "bg-green-500" }
];

export default function EditCompany() {
  const { id, companyId } = useParams({ strict: false }) as any
  const leadId = id || companyId
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    companyName: '',
    customerName: '',
    customerDesignation: '',
    email1: '',
    email2: '',
    mobileNo: '',
    phoneNo: '',
    products: '',
    businessType: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    country: '',
    website1: '',
    website2: '',
    followTypeDate: '',
    followType: '',
    leadStatus: 'New'
  })

  useEffect(() => {
    if (leadId) {
      fetchCompanyDetails(leadId)
    }
  }, [leadId])

  const fetchCompanyDetails = async (id: string) => {
    try {
      setLoading(true)
      const res = await api.get(`/companies/${id}`)
      const data = res.data.data
      
      // Format date for input[type="date"]
      let formattedDate = ''
      if (data.followTypeDate) {
        formattedDate = new Date(data.followTypeDate).toISOString().split('T')[0]
      }

      setFormData({
        companyName: data.companyName || '',
        customerName: data.customerName || '',
        customerDesignation: data.customerDesignation || '',
        email1: data.email1 || '',
        email2: data.email2 || '',
        mobileNo: data.mobileNo || '',
        phoneNo: data.phoneNo || '',
        products: data.products || '',
        businessType: data.businessType || '',
        address1: data.address1 || '',
        address2: data.address2 || '',
        city: data.city || '',
        state: data.state || '',
        country: data.country || '',
        website1: data.website1 || '',
        website2: data.website2 || '',
        followTypeDate: formattedDate,
        followType: data.leadStatus || data.followType || '',
        leadStatus: data.leadStatus || 'New'
      })
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load company details")
      navigate({ to: '/leads' })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.companyName || !formData.mobileNo || !formData.address1 || !formData.website1) {
      toast.error("Please fill all required fields (*)")
      return
    }

    try {
      setSubmitting(true)
      await api.put(`/companies/${leadId}`, formData)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["paged", "/companies/paged"] }),
        queryClient.invalidateQueries({ queryKey: ["leads", "stats"] }),
      ])
      toast.success("Company lead updated successfully")
      navigate({ to: '/leads/$id', params: { id: leadId } })
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update company")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-10">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/leads/$id', params: { id: leadId } })} className="rounded-full hover:bg-muted/80">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader 
          title="Edit Company Lead"
          description="Update the company, primary contact and sales information."
        />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        
        {/* Basic Profile Section */}
        <Card className="shadow-sm border-muted/60 overflow-hidden">
          <div className="bg-primary/5 h-1 w-full" />
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Company Profile
            </CardTitle>
            <CardDescription>Primary identification details for the organization.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="companyName" className="font-semibold text-foreground/80">Company Name <span className="text-destructive">*</span></Label>
              <Input id="companyName" name="companyName" value={formData.companyName} onChange={handleInputChange} required className="max-w-2xl bg-background" placeholder="E.g., Antigravity Technologies" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerName">Primary Contact Name</Label>
              <Input id="customerName" name="customerName" value={formData.customerName} onChange={handleInputChange} placeholder="E.g., John Doe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerDesignation">Contact Designation</Label>
              <Input id="customerDesignation" name="customerDesignation" value={formData.customerDesignation} onChange={handleInputChange} placeholder="E.g., CEO / Director" />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information Section */}
        <Card className="shadow-sm border-muted/60 overflow-hidden">
          <div className="bg-blue-500/10 h-1 w-full" />
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Contact className="h-5 w-5 text-blue-500" />
              Contact Information
            </CardTitle>
            <CardDescription>Direct communication channels for the company.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="mobileNo" className="font-semibold text-foreground/80">Mobile Number <span className="text-destructive">*</span></Label>
              <Input id="mobileNo" name="mobileNo" value={formData.mobileNo} onChange={handleInputChange} required placeholder="+91 9876543210" />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="phoneNo">Alternate Phone</Label>
              <Input id="phoneNo" name="phoneNo" value={formData.phoneNo} onChange={handleInputChange} placeholder="Landline or alt mobile" />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="email1">Primary Email</Label>
              <Input id="email1" name="email1" type="email" value={formData.email1} onChange={handleInputChange} placeholder="contact@company.com" />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="email2">Secondary Email</Label>
              <Input id="email2" name="email2" type="email" value={formData.email2} onChange={handleInputChange} placeholder="billing@company.com" />
            </div>
          </CardContent>
        </Card>

        {/* Location Section */}
        <Card className="shadow-sm border-muted/60 overflow-hidden">
          <div className="bg-emerald-500/10 h-1 w-full" />
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-emerald-500" />
              Location Details
            </CardTitle>
            <CardDescription>Physical or registered addresses.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="address1" className="font-semibold text-foreground/80">Address Line 1 <span className="text-destructive">*</span></Label>
              <Input id="address1" name="address1" value={formData.address1} onChange={handleInputChange} required placeholder="Street, building name" />
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="address2">Address Line 2</Label>
              <Input id="address2" name="address2" value={formData.address2} onChange={handleInputChange} placeholder="Suite, floor, landmark" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" value={formData.city} onChange={handleInputChange} placeholder="e.g., Mumbai" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select value={formData.country} onValueChange={(val) => setFormData(p => ({...p, country: val, state: val !== 'India' && p.country === 'India' ? '' : p.state}))}>
                <SelectTrigger id="country" className="bg-background">
                  <SelectValue placeholder="Select Country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State / Province</Label>
              {formData.country === 'India' ? (
                <Select value={formData.state} onValueChange={(val) => setFormData(p => ({...p, state: val}))}>
                  <SelectTrigger id="state" className="bg-background">
                    <SelectValue placeholder="Select State" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input id="state" name="state" value={formData.state} onChange={handleInputChange} placeholder="Type state name..." />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Business & Online Section */}
        <Card className="shadow-sm border-muted/60 overflow-hidden">
          <div className="bg-purple-500/10 h-1 w-full" />
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-purple-500" />
              Business & Engagement
            </CardTitle>
            <CardDescription>Web presence and CRM tracking information.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-2">
              <Label htmlFor="website1" className="font-semibold text-foreground/80">Primary Website <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="website1" name="website1" value={formData.website1} onChange={handleInputChange} required className="pl-9" placeholder="https://www.example.com" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="website2">Alternate Website</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="website2" name="website2" value={formData.website2} onChange={handleInputChange} className="pl-9" placeholder="https://store.example.com" />
              </div>
            </div>

            <Separator className="col-span-1 md:col-span-2 my-2" />

            <div className="space-y-2">
              <Label htmlFor="businessType">Business Type</Label>
              <div className="flex flex-col gap-2">
                <Select 
                  value={BUSINESS_TYPES.includes(formData.businessType) ? formData.businessType : (formData.businessType ? 'Other' : '')} 
                  onValueChange={(val) => {
                    if (val === 'Other') {
                      setFormData(p => ({...p, businessType: 'Custom'})) // dummy value to trigger the input
                    } else {
                      setFormData(p => ({...p, businessType: val}))
                    }
                  }}
                >
                  <SelectTrigger id="businessType" className="bg-background">
                    <SelectValue placeholder="Select Business Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPES.map(bt => (
                      <SelectItem key={bt} value={bt}>{bt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(!BUSINESS_TYPES.includes(formData.businessType) && formData.businessType !== '') && (
                  <Input 
                    placeholder="Specify other business type..." 
                    value={formData.businessType === 'Custom' ? '' : formData.businessType} 
                    onChange={(e) => setFormData(p => ({...p, businessType: e.target.value}))}
                    className="mt-2"
                  />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="products">Core Products/Services</Label>
              <Input id="products" name="products" value={formData.products} onChange={handleInputChange} placeholder="e.g., Software, Hardware" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="followTypeDate">Next Follow-up Date</Label>
              <Input id="followTypeDate" name="followTypeDate" type="date" value={formData.followTypeDate} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="followType">Engagement / Follow Type</Label>
              <Select value={formData.leadStatus} onValueChange={(val) => setFormData(p => ({...p, followType: val, leadStatus: val}))}>
                <SelectTrigger id="followType" className="bg-background">
                  <SelectValue placeholder="Select lead status..." />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STATUSES.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${status.color}`} />
                      {status.label || status.value}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 mt-2">
          <Button type="button" variant="outline" size="lg" className="min-w-[120px]" onClick={() => navigate({ to: '/leads/$id', params: { id: leadId } })}>
            Cancel
          </Button>
          <Button type="submit" size="lg" className="min-w-[160px]" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            Save Changes
          </Button>
        </div>

      </form>
    </div>
  )
}
