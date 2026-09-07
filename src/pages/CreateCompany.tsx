import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, Building2, MapPin, Contact, Globe, Briefcase, FileSpreadsheet } from "lucide-react"
import api from "@/services/api"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ExcelImportModal } from "@/components/shared/ExcelImportModal"
import {
  WebsiteEnrichmentPreviewModal,
  type WebsiteEnrichmentData,
  type WebsitePreviewField,
} from "@/components/leads/WebsiteEnrichmentPreviewModal"

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

export default function CreateCompany() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [submitting, setSubmitting] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [fetchingWebsite, setFetchingWebsite] = useState(false)
  const [websiteProgress, setWebsiteProgress] = useState("")
  const [websitePreviewOpen, setWebsitePreviewOpen] = useState(false)
  const [websiteResult, setWebsiteResult] = useState<{
    data: WebsiteEnrichmentData
    websiteUrl: string
    source: "cache" | "website"
  } | null>(null)

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
  const [demoDetails, setDemoDetails] = useState({
    demoDateTime: '',
    demoMode: 'Online',
    meetingLink: '',
    location: '',
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleFetchWebsite = async () => {
    if (!websiteUrl.trim()) {
      toast.error("Enter a website URL first")
      return
    }

    const progressTimers: ReturnType<typeof setTimeout>[] = []
    try {
      setFetchingWebsite(true)
      setWebsiteProgress("Checking cache...")
      progressTimers.push(setTimeout(() => setWebsiteProgress("Scanning website..."), 700))
      progressTimers.push(setTimeout(() => setWebsiteProgress("Analyzing with AI..."), 2_800))

      const response = await api.post('/leads/enrich-url', { url: websiteUrl.trim() })
      const result = response.data.data as {
        source: "cache" | "website"
        websiteUrl: string
        data: WebsiteEnrichmentData
      }
      setWebsiteResult(result)
      setWebsiteUrl(result.websiteUrl)
      setWebsitePreviewOpen(true)
      toast.success(result.source === "cache" ? "Website details Fetched Successfully" : "Website details extracted")
    } catch (err: any) {
      const status = Number(err.response?.status || 0)
      const message = status === 400
        ? "Please enter a valid website URL, for example: https://example.com"
        : status === 422
          ? "We couldn't access this website. Check the URL and make sure the website is publicly available."
          : status === 429
            ? "Website import is currently busy. Please wait a moment and try again."
            : status === 503
              ? "Website import service is temporarily unavailable. Please enter the details manually or contact your administrator."
              : "Something went wrong while importing website details. Please try again."
      toast.error(message)
    } finally {
      progressTimers.forEach(clearTimeout)
      setFetchingWebsite(false)
      setWebsiteProgress("")
    }
  }

  const applyWebsiteFields = (selectedFields: WebsitePreviewField[]) => {
    if (!websiteResult) return
    const selected = new Set(selectedFields)
    const extracted = websiteResult.data
    setFormData((current) => ({
      ...current,
      ...(selected.has("websiteUrl") ? { website1: websiteResult.websiteUrl } : {}),
      ...(selected.has("companyName") ? { companyName: extracted.companyName } : {}),
      ...(selected.has("primaryPerson") ? { customerName: extracted.primaryPerson } : {}),
      ...(selected.has("primaryEmail") ? { email1: extracted.primaryEmail } : {}),
      ...(selected.has("secondaryEmail") ? { email2: extracted.secondaryEmail } : {}),
      ...(selected.has("primaryPhone") ? { mobileNo: extracted.primaryPhone } : {}),
      ...(selected.has("alternatePhone") ? { phoneNo: extracted.alternatePhone } : {}),
      ...(selected.has("address") ? { address1: extracted.address } : {}),
      ...(selected.has("city") ? { city: extracted.city } : {}),
      ...(selected.has("businessType") ? { businessType: extracted.businessType } : {}),
      ...(selected.has("description") ? { products: extracted.description } : {}),
    }))
    setWebsitePreviewOpen(false)
    toast.success("Selected fields applied to the form.")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.companyName || !formData.mobileNo || !formData.address1 || !formData.website1) {
      toast.error("Please fill all required fields (*)")
      return
    }
    if (formData.leadStatus === "Demo Scheduled") {
      if (!demoDetails.demoDateTime) {
        toast.error("Please select the demo date and time")
        return
      }
      if (demoDetails.demoMode === "Online" && !demoDetails.meetingLink.trim()) {
        toast.error("Please enter the meeting link")
        return
      }
      if (demoDetails.demoMode === "On-site" && !demoDetails.location.trim()) {
        toast.error("Please enter the demo location")
        return
      }
    }

    try {
      setSubmitting(true)
      await api.post('/companies', formData.leadStatus === "Demo Scheduled"
        ? {
            ...formData,
            scheduledDateTime: demoDetails.demoDateTime,
            statusDetails: demoDetails,
          }
        : formData)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["paged", "/companies/paged"] }),
        queryClient.invalidateQueries({ queryKey: ["leads", "stats"] }),
      ])
      toast.success("Company lead created successfully")
      navigate({ to: '/leads' })
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create company")
    } finally {
      setSubmitting(false)
    }
  }

  const handleImport = async (data: any[]) => {
    try {
      const res = await api.post('/companies/bulk', { data })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["paged", "/companies/paged"] }),
        queryClient.invalidateQueries({ queryKey: ["leads", "stats"] }),
      ])
      toast.success(res.data.message || "Companies imported successfully")
      navigate({ to: '/leads' })
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to import companies")
      throw err;
    }
  }

  const fillTestData = () => {
    setFormData({
      companyName: 'Acme Corporation',
      customerName: 'Alice Smith',
      customerDesignation: 'Director of Procurement',
      email1: 'alice@acmecorp.com',
      email2: 'info@acmecorp.com',
      mobileNo: '+1 (555) 123-4567',
      phoneNo: '800-555-0199',
      products: 'Cloud Services, SaaS',
      businessType: 'Information Technology (IT)',
      address1: '100 Innovation Drive',
      address2: 'Suite 300',
      city: 'San Francisco',
      state: 'California',
      country: 'United States',
      website1: 'https://www.acmecorp.com',
      website2: 'https://support.acmecorp.com',
      followTypeDate: new Date().toISOString().split('T')[0],
      followType: 'Interested',
      leadStatus: 'Interested'
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/leads' })} className="rounded-full hover:bg-muted/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <PageHeader 
            title="Add Company Lead"
            description="Add the company, its primary contact and sales information."
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" type="button" onClick={fillTestData} className="border-primary text-primary">
            Fill Test Data
          </Button>
          <Button variant="outline" className="border-emerald-500 text-emerald-600 hover:bg-emerald-50" onClick={() => setIsImportModalOpen(true)}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Import Excel
          </Button>
        </div>
      </div>

      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Companies"
        templateName="Companies"
        templateHeaders={["Company Name", "Mobile Number", "Address 1", "Website 1"]}
        onImport={handleImport}
      />

      <WebsiteEnrichmentPreviewModal
        open={websitePreviewOpen}
        onOpenChange={setWebsitePreviewOpen}
        data={websiteResult?.data || null}
        websiteUrl={websiteResult?.websiteUrl || websiteUrl}
        source={websiteResult?.source || null}
        onApply={applyWebsiteFields}
      />

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
            <div className="space-y-2">
              <Label htmlFor="websiteUrl" className="font-semibold text-foreground/80">Import From Website URL</Label>
              <div className="flex gap-2">
                <Input
                  id="websiteUrl"
                  value={websiteUrl}
                  onChange={(event) => setWebsiteUrl(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      void handleFetchWebsite()
                    }
                  }}
                  inputMode="url"
                  autoCapitalize="none"
                  className="bg-background"
                  placeholder="https://www.example.com"
                  disabled={fetchingWebsite}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 border-primary text-primary"
                  disabled={fetchingWebsite}
                  onClick={() => void handleFetchWebsite()}
                >
                  {fetchingWebsite && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {fetchingWebsite ? websiteProgress : "Fetch Details"}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName" className="font-semibold text-foreground/80">Company Name <span className="text-destructive">*</span></Label>
              <Input id="companyName" name="companyName" value={formData.companyName} onChange={handleInputChange} required className="bg-background" placeholder="E.g., Antigravity Technologies" />
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
            {formData.leadStatus === "Demo Scheduled" && (
              <div className="col-span-full grid grid-cols-1 gap-6 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="demoDateTime">Demo Date &amp; Time *</Label>
                  <Input
                    id="demoDateTime"
                    type="datetime-local"
                    value={demoDetails.demoDateTime}
                    onChange={(event) => setDemoDetails((current) => ({ ...current, demoDateTime: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="demoMode">Demo Mode *</Label>
                  <Select
                    value={demoDetails.demoMode}
                    onValueChange={(demoMode) => setDemoDetails((current) => ({ ...current, demoMode }))}
                  >
                    <SelectTrigger id="demoMode" className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Online">Online</SelectItem>
                      <SelectItem value="On-site">On-site</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {demoDetails.demoMode === "Online" ? (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="meetingLink">Meeting Link *</Label>
                    <Input
                      id="meetingLink"
                      type="url"
                      value={demoDetails.meetingLink}
                      onChange={(event) => setDemoDetails((current) => ({ ...current, meetingLink: event.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                ) : (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="demoLocation">Location *</Label>
                    <Input
                      id="demoLocation"
                      value={demoDetails.location}
                      onChange={(event) => setDemoDetails((current) => ({ ...current, location: event.target.value }))}
                      placeholder="Meeting location"
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 mt-2">
          <Button type="button" variant="outline" size="lg" className="min-w-[120px]" onClick={() => navigate({ to: '/leads' })}>
            Cancel
          </Button>
          <Button type="submit" size="lg" className="min-w-[160px]" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            Create Company Lead
          </Button>
        </div>

      </form>
    </div>
  )
}
