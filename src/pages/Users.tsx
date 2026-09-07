import { useState, useEffect } from "react"
import { useSelector } from "react-redux"
import { useNavigate } from "@tanstack/react-router"
import type { RootState } from "@/store"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Plus, Pencil, Trash2, Loader2, Eye, EyeOff, KeyRound, ChevronLeft, ShieldCheck, Info } from "lucide-react"
import api from "../services/api"
import Swal from "sweetalert2"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { DataPagination } from "@/components/shared/DataPagination"
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { can } from "@/lib/accessControl"
import { useRoleCatalogQuery, useRolesQuery, useTeamsQuery, useUsersQuery } from "@/hooks/useCrmReferenceData"

interface UserData {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  parent?: { _id: string; name: string; role: string } | string | null;
  status?: string;
  password?: string;
  isActive: boolean;
  createdAt: string;
  teams?: Array<{ _id: string; name: string; status?: string }>;
  permissionOverrides?: { allow?: string[]; deny?: string[] };
  scopeOverrides?: Record<string, string>;
}

interface RoleData {
  _id: string;
  name: string;
  level: string;
}

interface TeamData {
  _id: string;
  name: string;
  status: string;
}

interface PermissionDefinition {
  key: string;
  label: string;
}

interface PermissionGroup {
  id: string;
  label: string;
  supportsScope?: boolean;
  permissions: PermissionDefinition[];
}

const permissionGroupHelp: Record<string, string> = {
  dashboard: "Decide whether this user can open the CRM dashboard and view its summary.",
  leads: "Choose what this user can do with leads, such as view, create, edit, assign, change status, delete or add notes.",
  employees: "Choose whether this user can view or manage employee information.",
  attendance: "Choose whether this user can view or manage attendance and whose records are available.",
  calling: "Choose whether this user can view or manage calling features.",
  reports: "Choose which reports and business performance information this user can view or export.",
  email: "Choose whether this user can open Email Marketing, use shared templates and send emails to leads.",
  whatsapp: "Choose whether this user can open WhatsApp Marketing, use shared templates and send WhatsApp messages to leads.",
  administration: "Choose whether this user can manage users, roles, teams, access settings and shared templates. Give this access only to trusted people.",
}

const scopeQuestion = (groupId: string, userName: string) => {
  if (groupId === "leads") return `Which leads can ${userName} view?`
  if (groupId === "employees") return `Which employee records can ${userName} view?`
  if (groupId === "attendance") return `Whose attendance can ${userName} access?`
  if (groupId === "reports") return `Whose report data can ${userName} view?`
  return `Which records can ${userName} view?`
}

const scopeOptionLabel = (groupId: string, scope: string, userName: string) => {
  if (scope === "inherit") return "Keep standard role access (Recommended)"

  const labels: Record<string, Record<string, string>> = {
    leads: {
      own: `Leads assigned to ${userName}`,
      team: `Leads assigned to ${userName}'s team`,
      hierarchy: `Leads assigned to ${userName} or employees reporting to ${userName}`,
      all: "All company leads",
      none: "Hide all leads",
    },
    employees: {
      own: `Only ${userName}'s employee profile`,
      team: `Employees in ${userName}'s team`,
      hierarchy: `${userName} and employees reporting to ${userName}`,
      all: "All company employees",
      none: "Hide all employee records",
    },
    attendance: {
      own: `Only ${userName}'s attendance`,
      team: `${userName}'s team attendance`,
      hierarchy: `${userName} and reporting employees' attendance`,
      all: "All company attendance",
      none: "Hide all attendance records",
    },
    reports: {
      own: `Only ${userName}'s report data`,
      team: `${userName}'s team report data`,
      hierarchy: `${userName} and reporting employees' data`,
      all: "All company report data",
      none: "Hide all report data",
    },
  }

  return labels[groupId]?.[scope]
    || ({
      own: `Only ${userName}'s records`,
      team: `${userName}'s team records`,
      hierarchy: `${userName} and reporting employees' records`,
      all: "All company records",
      none: "Hide all records",
    }[scope] || scope)
}

export default function Users() {
  const navigate = useNavigate()
  const rolesQuery = useRolesQuery<RoleData[]>()
  const teamsQuery = useTeamsQuery<TeamData[]>("active")
  const managersQuery = useUsersQuery<UserData[]>("manager")
  const catalogQuery = useRoleCatalogQuery<{ groups: PermissionGroup[]; dataScopes: string[] }>()
  const roles = rolesQuery.data || []
  const teams = teamsQuery.data || []
  const managerOptions = managersQuery.data || []
  const permissionGroups = catalogQuery.data?.groups || []
  const scopeOptions = catalogQuery.data?.dataScopes || []
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [createStep, setCreateStep] = useState<"details" | "access" | "confirm">("details")
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const [validationTitle, setValidationTitle] = useState("Missing Fields")
  const [openHelpGroup, setOpenHelpGroup] = useState<string | null>(null)
  
  const { user: currentUser } = useSelector((state: RootState) => state.auth)
  
  // Form State
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("")
  const [phone, setPhone] = useState("")
  const [parent, setParent] = useState("")
  const [status, setStatus] = useState("active")
  const [showPassword, setShowPassword] = useState(false)
  const [teamIds, setTeamIds] = useState<string[]>([])
  const [accessUser, setAccessUser] = useState<UserData | null>(null)
  const [allowOverrides, setAllowOverrides] = useState<string[]>([])
  const [denyOverrides, setDenyOverrides] = useState<string[]>([])
  const [scopeOverrides, setScopeOverrides] = useState<Record<string, string>>({})
  const { data, isLoading, refetch } = usePaginatedQuery<UserData>({
    endpoint: "/users/paged",
    page,
    limit: 25,
    params: { search: debouncedSearch || undefined },
  })
  const users = data?.items || []
  const canManageUsers = can(currentUser, "admin.users.manage")

  useEffect(() => {
    if (!currentUser) return; // Wait for hydration
    if (!can(currentUser, "admin.users.view")) {
      navigate({ to: '/' })
      return
    }
  }, [currentUser, navigate])

  const fetchReferenceData = async () => {
    try {
      await Promise.all([
        rolesQuery.refetch(),
        managersQuery.refetch(),
        teamsQuery.refetch(),
        catalogQuery.refetch(),
      ])
    } catch (error: any) {
      console.error("Failed to fetch data:", error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load roles and manager options from the server.'
      })
    }
  }

  const openEditDialog = (u: UserData) => {
    setEditingUserId(u._id)
    setName(u.name)
    setEmail(u.email)
    setPassword("")
    setRole(u.role)
    setPhone(u.phone || "")
    setParent(typeof u.parent === "string" ? u.parent : u.parent?._id || "")
    setStatus(u.status || (u.isActive ? "active" : "inactive"))
    setTeamIds(u.teams?.map((team) => team._id) || [])
    setShowPassword(false)
    setCreateStep("details")
    setValidationMessage(null)
    setValidationTitle("Missing Fields")
    setOpenHelpGroup(null)
    setIsDialogOpen(true)
  }

  const openCreateDialog = () => {
    setEditingUserId(null)
    setName("")
    setEmail("")
    setPassword("")
    setRole("")
    setPhone("")
    setParent("")
    setStatus("active")
    setTeamIds([])
    setShowPassword(false)
    setAllowOverrides([])
    setDenyOverrides([])
    setScopeOverrides({})
    setCreateStep("details")
    setValidationMessage(null)
    setValidationTitle("Missing Fields")
    setOpenHelpGroup(null)
    setIsDialogOpen(true)
  }

  const openAccessDialog = (u: UserData) => {
    setAccessUser(u)
    setAllowOverrides(u.permissionOverrides?.allow || [])
    setDenyOverrides(u.permissionOverrides?.deny || [])
    setScopeOverrides(u.scopeOverrides || {})
    setOpenHelpGroup(null)
  }

  const validateUserDetails = () => {
    if (!name.trim() || !email.trim() || !role) {
      setValidationTitle("Missing Fields")
      setValidationMessage("Please fill in all required fields (Name, Email, Role).")
      return false
    }

    if (!editingUserId && !password.trim()) {
      setValidationTitle("Missing Fields")
      setValidationMessage("Password is required when creating a new user.")
      return false
    }

    return true
  }

  const handleContinueToAccess = () => {
    if (!validateUserDetails()) return
    setCreateStep("access")
  }

  const handleSaveUser = async () => {
    if (!validateUserDetails()) return

    try {
      setIsSaving(true)
      
      const payload: any = { name, email, role, phone, parent: parent || null, status, teamIds }
      if (password.trim()) {
        payload.password = password
      }

      if (editingUserId) {
        // Update existing user
        await api.put(`/users/${editingUserId}`, payload)
      } else {
        // Create new user
        payload.permissionOverrides = {
          allow: allowOverrides,
          deny: denyOverrides,
        }
        payload.scopeOverrides = scopeOverrides
        await api.post('/users', payload)
      }
      
      await Promise.all([refetch(), fetchReferenceData()])
      setIsDialogOpen(false)
      setCreateStep("details")
      setValidationMessage(null)
      toast.success(editingUserId ? "User updated successfully" : "User created successfully")
    } catch (error: any) {
      console.error("Failed to save user:", error)
      setValidationTitle("Unable to save user")
      setValidationMessage(error.response?.data?.message || "Server error occurred")
    } finally {
      setIsSaving(false)
    }
  }

  const setPermissionOverride = (permission: string, mode: "inherit" | "allow" | "deny") => {
    setAllowOverrides((current) => current.filter((value) => value !== permission))
    setDenyOverrides((current) => current.filter((value) => value !== permission))
    if (mode === "allow") setAllowOverrides((current) => [...current, permission])
    if (mode === "deny") setDenyOverrides((current) => [...current, permission])
  }

  const renderAccessEditor = (userName: string) => (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-5">
        {permissionGroups.map((group) => (
        <section key={group.id} className="rounded-xl border">
          <div className="flex flex-col gap-3 border-b bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{group.label}</h3>
                <Tooltip
                  open={openHelpGroup === group.id}
                  onOpenChange={(open) => setOpenHelpGroup(open ? group.id : null)}
                >
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      aria-label={`About ${group.label}`}
                      onClick={() => setOpenHelpGroup((current) => current === group.id ? null : group.id)}
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipPortal>
                    <TooltipContent side="top" className="max-w-xs leading-relaxed">
                      {permissionGroupHelp[group.id] || `Choose what this user can access in ${group.label}.`}
                    </TooltipContent>
                  </TooltipPortal>
                </Tooltip>
              </div>
              <p className="text-xs text-muted-foreground">Changes apply only to {userName}</p>
            </div>
            {group.supportsScope && (
              <div className="grid w-full gap-1.5 sm:w-96">
                <Label className="text-xs text-muted-foreground">
                  {scopeQuestion(group.id, userName)}
                </Label>
                <Select
                  value={scopeOverrides[group.id] || "inherit"}
                  onValueChange={(value) => setScopeOverrides((current) => {
                    const next = { ...current }
                    if (value === "inherit") delete next[group.id]
                    else next[group.id] = value
                    return next
                  })}
                >
                  <SelectTrigger className="min-h-9 h-auto w-full bg-background text-left">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
                    <SelectItem value="inherit">Keep standard role access (Recommended)</SelectItem>
                    {scopeOptions.map((scope) => (
                      <SelectItem key={scope} value={scope} className="whitespace-normal">
                        {scopeOptionLabel(group.id, scope, userName)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="grid gap-3 p-3 md:grid-cols-2">
            {group.permissions.map((permission) => {
              const mode = allowOverrides.includes(permission.key)
                ? "allow"
                : denyOverrides.includes(permission.key)
                  ? "deny"
                  : "inherit"
              return (
                <div key={permission.key} className="grid gap-2 rounded-lg border p-3">
                  <Label>{permission.label}</Label>
                  <Select
                    value={mode}
                    onValueChange={(value: "inherit" | "allow" | "deny") => (
                      setPermissionOverride(permission.key, value)
                    )}
                  >
                    <SelectTrigger className={
                      mode === "allow"
                        ? "border-emerald-300 bg-emerald-50"
                        : mode === "deny"
                          ? "border-red-300 bg-red-50"
                          : ""
                    }>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inherit">Keep standard role access (Recommended)</SelectItem>
                      <SelectItem value="allow">Give this access to {userName}</SelectItem>
                      <SelectItem value="deny">Do not give this access to {userName}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )
            })}
          </div>
        </section>
        ))}
      </div>
    </TooltipProvider>
  )

  const saveUserAccess = async () => {
    if (!accessUser) return
    try {
      setIsSaving(true)
      await api.put(`/users/${accessUser._id}`, {
        permissionOverrides: {
          allow: allowOverrides,
          deny: denyOverrides,
        },
        scopeOverrides,
      })
      await refetch()
      setAccessUser(null)
      await Swal.fire({
        icon: "success",
        title: "User access updated",
        timer: 1500,
        showConfirmButton: false,
      })
    } catch (error: any) {
      Swal.fire("Unable to save access", error.response?.data?.message || "Server error occurred", "error")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteUser = async (id: string) => {
    try {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete user!'
      })

      if (result.isConfirmed) {
        await api.delete(`/users/${id}`)
        await Promise.all([refetch(), fetchReferenceData()])
        Swal.fire(
          'Deleted!',
          'User has been deleted.',
          'success'
        )
      }
    } catch (error: any) {
      console.error("Failed to delete user:", error)
      Swal.fire({
        icon: 'error',
        title: 'Delete Failed',
        text: error.response?.data?.message || 'Server error occurred'
      })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader 
          title="Users Management" 
          description="Manage your team members and assign roles." 
        />
        {canManageUsers && (
          <>
            <Button className="shrink-0 gap-2" onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              Add New User
            </Button>
            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                setIsDialogOpen(open)
                if (!open) {
                  setCreateStep("details")
                  setValidationMessage(null)
                  setValidationTitle("Missing Fields")
                }
              }}
            >
            <DialogContent
              className={
                validationMessage || (!editingUserId && createStep === "confirm")
                  ? "max-h-[88vh] overflow-y-auto sm:max-w-md"
                  : !editingUserId && createStep === "access"
                  ? "max-h-[92vh] overflow-y-auto sm:max-w-3xl"
                  : "max-h-[88vh] overflow-y-auto sm:max-h-none sm:max-w-2xl sm:overflow-visible"
              }
            >
              <DialogHeader>
              <DialogTitle>
                {validationMessage
                  ? validationTitle
                  : editingUserId
                  ? 'Edit User'
                  : createStep === "access"
                    ? `Choose Access for ${name.trim() || "New User"}`
                    : createStep === "confirm"
                      ? "Create this user?"
                    : 'Create New User'}
              </DialogTitle>
              <DialogDescription>
                {validationMessage
                  ? validationMessage
                  : editingUserId 
                  ? 'Update the user details below.' 
                  : createStep === "access"
                    ? `${name.trim() || "This user"} will get the same access as other ${role} users. Use the options below only if you want to give or remove any access specifically for ${name.trim() || "this user"}.`
                    : createStep === "confirm"
                      ? `${name.trim() || "This user"} will be created with the ${role} role and the selected individual access settings.`
                    : 'Fill in the details below. You will choose access in the next step.'}
              </DialogDescription>
            </DialogHeader>
            {validationMessage ? (
              <DialogFooter>
                <Button onClick={() => setValidationMessage(null)}>OK</Button>
              </DialogFooter>
            ) : editingUserId || createStep === "details" ? (
              <div className="animate-in fade-in slide-in-from-left-4 duration-200">
            <div className="grid gap-4 py-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  placeholder="e.g. John Doe" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email"
                  placeholder="john@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input 
                  id="phone" 
                  placeholder="Agent phone number" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">
                  Password 
                </Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Assign Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.length === 0 ? (
                      <SelectItem value="none" disabled>No roles available. Create one first.</SelectItem>
                    ) : (
                      roles.map(r => (
                        <SelectItem key={r._id} value={r.name}>{r.name} ({r.level})</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="parent">Reports To</Label>
                <Select value={parent || "none"} onValueChange={(value) => setParent(value === "none" ? "" : value)}>
                  <SelectTrigger id="parent">
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No parent</SelectItem>
                    {managerOptions
                      .filter(u => u._id !== editingUserId)
                      .map(u => (
                        <SelectItem key={u._id} value={u._id}>{u.name} ({u.role})</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="team">Primary Team</Label>
                <Select
                  value={teamIds[0] || "none"}
                  onValueChange={(value) => setTeamIds(value === "none" ? [] : [value])}
                >
                  <SelectTrigger id="team">
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No team</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team._id} value={team._id}>{team.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Additional team memberships can be managed from the Teams page.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>Cancel</Button>
              <Button
                onClick={editingUserId ? handleSaveUser : handleContinueToAccess}
                disabled={isSaving}
              >
                {isSaving
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : editingUserId
                    ? 'Save Changes'
                    : 'Give Access'}
              </Button>
            </DialogFooter>
              </div>
            ) : createStep === "access" ? (
              <div className="animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="mb-4 flex items-start gap-3 rounded-xl border bg-muted/30 p-4">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium">Standard access is already selected</p>
                    <p className="text-sm text-muted-foreground">
                      If no special changes are needed, leave all options unchanged. Any changes you make here
                      will apply only to {name.trim() || "this user"} and will not affect other {role} users.
                    </p>
                  </div>
                </div>
                <div className="py-2">
                  {renderAccessEditor(name.trim() || "this user")}
                </div>
                <DialogFooter className="mt-5">
                  <Button
                    variant="outline"
                    onClick={() => setCreateStep("details")}
                    disabled={isSaving}
                    className="gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <Button onClick={() => setCreateStep("confirm")} disabled={isSaving}>
                    Create User
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <div className="animate-in fade-in zoom-in-95 duration-200">
                <div className="rounded-xl border bg-muted/30 p-4 text-sm">
                  <div className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2">
                    <span className="text-muted-foreground">User</span>
                    <span className="font-medium">{name.trim()}</span>
                    <span className="text-muted-foreground">Email</span>
                    <span className="break-all font-medium">{email.trim()}</span>
                    <span className="text-muted-foreground">Role</span>
                    <span className="font-medium">{role}</span>
                    <span className="text-muted-foreground">Custom access</span>
                    <span className="font-medium">
                      {allowOverrides.length + denyOverrides.length + Object.keys(scopeOverrides).length
                        ? `${allowOverrides.length + denyOverrides.length + Object.keys(scopeOverrides).length} change(s)`
                        : "No changes - role settings will be used"}
                    </span>
                  </div>
                </div>
                <DialogFooter className="mt-5">
                  <Button
                    variant="outline"
                    onClick={() => setCreateStep("access")}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveUser} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirm &amp; Create User
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
          </>
        )}
      </div>

      <Input
        value={search}
        onChange={(event) => {
          setSearch(event.target.value)
          setPage(1)
        }}
        placeholder="Search users by name, email or role..."
        className="max-w-sm"
      />

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Reports To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p>Loading users...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <User className="h-8 w-8 opacity-20" />
                    <p>No users found. Create one to get started.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u._id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {u.name.substring(0, 2).toUpperCase()}
                      </div>
                      {u.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === 'admin' ? 'destructive' : 'secondary'} className="capitalize">
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex max-w-48 flex-wrap gap-1">
                      {u.teams?.length ? u.teams.map((team) => (
                        <Badge key={team._id} variant="outline">{team.name}</Badge>
                      )) : <span className="text-muted-foreground">-</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {typeof u.parent === "object" && u.parent ? u.parent.name : "-"}
                  </TableCell>
                  <TableCell>
                    {u.isActive ? (
                      <Badge variant="default" className="bg-green-500 hover:bg-green-600">Active</Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {canManageUsers ? (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="User access overrides"
                          onClick={() => openAccessDialog(u)}
                          disabled={u.role === "admin"}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => openEditDialog(u)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteUser(u._id)}
                          disabled={u.role === 'admin'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs italic">No access</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {data?.pagination && (
          <DataPagination pagination={data.pagination} onPageChange={setPage} />
        )}
      </div>

      <Dialog open={Boolean(accessUser)} onOpenChange={(open) => !open && setAccessUser(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Custom Access for {accessUser?.name}</DialogTitle>
            <DialogDescription>
              {accessUser?.name} currently follows the {accessUser?.role} role. Change a setting only when {accessUser?.name} needs different access.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3">
            {renderAccessEditor(accessUser?.name || "this user")}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAccessUser(null)}>Cancel</Button>
            <Button onClick={saveUserAccess} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save access settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
