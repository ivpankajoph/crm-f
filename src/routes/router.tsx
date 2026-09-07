import { createRootRouteWithContext, createRoute, createRouter, Outlet, redirect } from '@tanstack/react-router';
import { AppShell } from '../components/layout/AppShell';
import { lazyPage } from '../components/layout/lazyPage';
import type { User } from '../store/slices/authSlice';
import { can } from '../lib/accessControl';

const Login = lazyPage(() => import('../pages/Login'));
const Dashboard = lazyPage(() => import('../pages/Dashboard'));
const Leads = lazyPage(() => import('../pages/Leads'));
const AllLeads = lazyPage(() => import('../pages/AllLeads'));
const UnifiedLeadDetails = lazyPage(() => import('../pages/UnifiedLeadDetails'));
const Employees = lazyPage(() => import('../pages/Employees'));
const CreateEmployee = lazyPage(() => import('../pages/CreateEmployee'));
const EditEmployee = lazyPage(() => import('../pages/EditEmployee'));
const CreateCompany = lazyPage(() => import('../pages/CreateCompany'));
const EditCompany = lazyPage(() => import('../pages/EditCompany'));
const Campaigns = lazyPage(() => import('../pages/Campaigns'));
const EmailMarketing = lazyPage(() => import('../pages/EmailMarketing'));
const WhatsAppMarketingModule = lazyPage(() => import('../pages/WhatsAppMarketingModule'));
const Messages = lazyPage(() => import('../pages/Messages'));
const EmailInbox = lazyPage(() => import('../pages/EmailInbox'));
const Meetings = lazyPage(() => import('../pages/Meetings'));
const Settings = lazyPage(() => import('../pages/Settings'));
const Attendance = lazyPage(() => import('../pages/Attendance'));
const Tasks = lazyPage(() => import('../pages/Tasks'));
const Calendar = lazyPage(() => import('../pages/Calendar'));
const Notes = lazyPage(() => import('../pages/Notes'));
const DashboardReports = lazyPage(() => import('../pages/DashboardReports'));
const SalesReports = lazyPage(() => import('../pages/SalesReports'));
const UserReports = lazyPage(() => import('../pages/UserReports'));
const MeetingReports = lazyPage(() => import('../pages/MeetingReports'));
const AttendanceReports = lazyPage(() => import('../pages/AttendanceReports'));
const Users = lazyPage(() => import('../pages/Users'));
const Roles = lazyPage(() => import('../pages/Roles'));
const PageAccess = lazyPage(() => import('../pages/PageAccess'));
const Teams = lazyPage(() => import('../pages/Teams'));
const TemplateAccess = lazyPage(() => import('../pages/TemplateAccess'));
const AuditLogs = lazyPage(() => import('../pages/AuditLogs'));
const Profile = lazyPage(() => import('../pages/Profile'));
const Notifications = lazyPage(() => import('../pages/Notifications'));
const Calling = lazyPage(() => import('../pages/Calling'));
const CallHistory = lazyPage(() => import('../pages/CallHistory'));
const CallDetails = lazyPage(() => import('../pages/CallDetails'));

// Define context to pass to router
export interface MyRouterContext {
  auth: {
    isAuthenticated: boolean;
    user: User | null;
  };
}

// Root route
export const rootRoute = createRootRouteWithContext<MyRouterContext>()({
  component: () => <Outlet />,
});

// Login route
export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: Login,
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({
        to: '/',
      });
    }
  },
});

// Protected root layout route using AppShell
export const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'protected',
  component: () => <AppShell />,
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: '/login',
      });
    }
  },
});

// Dashboard route (index)
export const indexRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/',
  component: Dashboard,
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) throw redirect({ to: '/login' });
    if (!can(context.auth.user, 'dashboard.view')) throw redirect({ to: '/profile' });
  },
});

const requireAuthentication = ({ context }: { context: MyRouterContext }) => {
  if (!context.auth.isAuthenticated) throw redirect({ to: '/login' });
};
const requireGrant = (permission: string) => ({ context }: { context: MyRouterContext }) => {
  requireAuthentication({ context });
  if (!can(context.auth.user, permission)) throw redirect({ to: '/profile' });
};
const requireAnyGrant = (...permissions: string[]) => ({ context }: { context: MyRouterContext }) => {
  requireAuthentication({ context });
  if (!permissions.some((permission) => can(context.auth.user, permission))) {
    throw redirect({ to: '/profile' });
  }
};

// CRM Routes
const leadsRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/leads', component: Leads, beforeLoad: requireGrant('leads.view') });
const createCompanyLeadRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/leads/new', component: CreateCompany, beforeLoad: requireGrant('leads.create') });
const companyLeadDetailsRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/leads/$id', component: UnifiedLeadDetails, beforeLoad: requireGrant('leads.view') });
const editCompanyLeadRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/leads/$id/edit', component: EditCompany, beforeLoad: requireGrant('leads.edit') });
const allLeadsRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/leads/all', component: AllLeads, beforeLoad: requireGrant('leads.view') });
const unifiedLeadDetailsRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/leads/all/$type/$id', component: UnifiedLeadDetails, beforeLoad: requireGrant('leads.view') });
const employeesRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/employees', component: Employees, beforeLoad: requireGrant('employees.view') });
const createEmployeeRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/employees/new', component: CreateEmployee, beforeLoad: requireGrant('employees.manage') });
const editEmployeeRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/employees/edit/$employeeId', component: EditEmployee, beforeLoad: requireGrant('employees.manage') });
const companiesRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/companies',
  beforeLoad: () => { throw redirect({ to: '/leads' }); },
});
const createCompanyRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/companies/new',
  beforeLoad: () => { throw redirect({ to: '/leads/new' }); },
});
const editCompanyRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/companies/edit/$companyId',
  beforeLoad: ({ params }) => { throw redirect({ to: '/leads/$id/edit', params: { id: params.companyId } }); },
});



// Marketing Routes
const campaignsRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/campaigns', component: Campaigns });
const emailMarketingRoute = createRoute({ getParentRoute: () => rootRoute, path: '/email-marketing', component: EmailMarketing, beforeLoad: requireGrant('email.module.view') });
const emailMarketingWildcardRoute = createRoute({ getParentRoute: () => rootRoute, path: '/email-marketing/$', component: EmailMarketing, beforeLoad: requireGrant('email.module.view') });
const whatsappRoute = createRoute({ getParentRoute: () => rootRoute, path: '/whatsapp-marketing', component: WhatsAppMarketingModule, beforeLoad: requireGrant('whatsapp.module.view') });
const whatsappWildcardRoute = createRoute({ getParentRoute: () => rootRoute, path: '/whatsapp-marketing/$', component: WhatsAppMarketingModule, beforeLoad: requireGrant('whatsapp.module.view') });
const legacyWhatsappRoute = createRoute({ getParentRoute: () => rootRoute, path: '/whatsapp-campaigns', beforeLoad: () => { throw redirect({ to: '/whatsapp-marketing' }); } });

// Communication Routes
const messagesRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/messages', component: Messages });
const emailInboxRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/email-inbox', component: EmailInbox });
const meetingsRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/meetings', component: Meetings });
const callingRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/calling', component: Calling, beforeLoad: requireGrant('calls.manage') });
const callHistoryRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/calls', component: CallHistory, beforeLoad: requireGrant('calls.view') });
const callDetailsRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/calls/$id', component: CallDetails, beforeLoad: requireGrant('calls.view') });
const settingsRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/settings', component: Settings, beforeLoad: requireGrant('admin.settings.manage') });
const attendanceRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/attendance', component: Attendance, beforeLoad: requireGrant('attendance.view') });

// Tasks Routes
const tasksRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/tasks', component: Tasks });
const calendarRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/calendar', component: Calendar });
const notesRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/notes', component: Notes });

// Reports Routes
const reportsDashboardRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/reports/dashboard', component: DashboardReports, beforeLoad: requireGrant('reports.view') });
const reportsSalesRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/reports/sales', component: SalesReports, beforeLoad: requireGrant('reports.view') });
const reportsUsersRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/reports/users', component: UserReports, beforeLoad: requireGrant('reports.view') });
const meetingReportsRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/meeting-reports', component: MeetingReports, beforeLoad: requireGrant('reports.view') });
const attendanceReportsRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/reports/attendance', component: AttendanceReports, beforeLoad: requireGrant('attendance.view') });

// Administration Routes
const usersRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/users', component: Users, beforeLoad: requireGrant('admin.users.view') });
const rolesRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/roles', component: Roles, beforeLoad: requireGrant('admin.roles.view') });
const pageAccessRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/page-access', component: PageAccess, beforeLoad: requireGrant('admin.roles.view') });
const teamsRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/teams', component: Teams, beforeLoad: requireGrant('admin.teams.view') });
const templateAccessRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/template-access',
  component: TemplateAccess,
  beforeLoad: requireAnyGrant(
    'admin.template_access.view',
    'email.templates.share',
    'whatsapp.templates.share',
  ),
});
const auditLogsRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/audit-logs', component: AuditLogs, beforeLoad: requireGrant('admin.audit.view') });

// System Routes
const profileRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/profile', component: Profile });
const notificationsRoute = createRoute({ getParentRoute: () => protectedRoute, path: '/notifications', component: Notifications });

const routeTree = rootRoute.addChildren([
  loginRoute,
  emailMarketingRoute,
  emailMarketingWildcardRoute,
  whatsappRoute,
  whatsappWildcardRoute,
  legacyWhatsappRoute,
  protectedRoute.addChildren([
    indexRoute,
    leadsRoute,
    createCompanyLeadRoute,
    companyLeadDetailsRoute,
    editCompanyLeadRoute,
    allLeadsRoute,
    unifiedLeadDetailsRoute,
    employeesRoute,
    createEmployeeRoute,
    editEmployeeRoute,
    companiesRoute,
    createCompanyRoute,
    editCompanyRoute,

    campaignsRoute,
    messagesRoute,
    emailInboxRoute,
    meetingsRoute,
    callingRoute,
    callHistoryRoute,
    callDetailsRoute,
    tasksRoute,
    calendarRoute,
    notesRoute,
    attendanceRoute,
    reportsDashboardRoute,
    reportsSalesRoute,
    reportsUsersRoute,
    meetingReportsRoute,
    attendanceReportsRoute,
    usersRoute,
    rolesRoute,
    pageAccessRoute,
    teamsRoute,
    templateAccessRoute,
    auditLogsRoute,
    settingsRoute,
    profileRoute,
    notificationsRoute,
  ]),
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 2 * 60_000,
  context: {
    auth: undefined!, // We'll pass this in via a wrapper
  },
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
