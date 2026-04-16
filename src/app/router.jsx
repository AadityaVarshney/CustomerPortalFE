import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { RoleGuard, AuthGuard } from '@/features/auth/RoleGuard'
import CustomerLayout from '@/features/auth/CustomerLayout'
import InternalLayout from '@/features/auth/InternalLayout'
import { Loader2 } from 'lucide-react'
import LoginPage from '@/features/auth/LoginPage'

const CustomerDashboard = lazy(() => import('@/features/tickets/CustomerDashboard'))
const CreateTicketPage = lazy(() => import('@/features/tickets/CreateTicketPage'))
const TicketListPage = lazy(() => import('@/features/tickets/TicketListPage'))
const TicketDetailPage = lazy(() => import('@/features/tickets/TicketDetailPage'))
const ProjectsList = lazy(() => import('@/features/projects/ProjectsPage').then(m => ({ default: m.ProjectsListPage })))
const ProjectDetail = lazy(() => import('@/features/projects/ProjectsPage').then(m => ({ default: m.ProjectDetailPage })))
const KBPage = lazy(() => import('@/features/knowledge-base/KnowledgeBasePage').then(m => ({ default: m.KnowledgeBasePage })))
const ArticlePage = lazy(() => import('@/features/knowledge-base/KnowledgeBasePage').then(m => ({ default: m.ArticlePage })))
const NotificationsPage = lazy(() => import('@/features/notifications/NotificationsPage'))
const WorkspaceSettings = lazy(() => import('@/features/workspace/WorkspaceSettingsPage'))
const AnalyticsDashboard = lazy(() => import('@/features/analytics/AnalyticsDashboard'))

const StubPage = ({ title }) => (
  <div className="flex items-center justify-center h-64">
    <div className="text-center glass-card rounded-2xl p-10">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <span className="text-primary font-display font-bold text-lg">✦</span>
      </div>
      <h2 className="text-lg font-display font-bold text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1">Module in development</p>
    </div>
  </div>
)

function PageFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  )
}

export default function AppRouter() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<AuthGuard><LoginPage /></AuthGuard>} />
        <Route path="/forgot-password" element={<StubPage title="Forgot Password" />} />
        <Route path="/reset-password/:token" element={<StubPage title="Reset Password" />} />
        <Route path="/invite/:token" element={<StubPage title="Accept Invitation" />} />

        {/* Customer routes */}
        <Route
          path="/customer"
          element={
            <RoleGuard allow={['customer_admin', 'customer_user']} redirect="/internal/dashboard">
              <CustomerLayout />
            </RoleGuard>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<CustomerDashboard />} />
          <Route path="tickets">
            <Route index element={<TicketListPage />} />
            <Route path="new" element={<CreateTicketPage />} />
            <Route path=":ticketId" element={<TicketDetailPage />} />
          </Route>
          <Route path="projects">
            <Route index element={<ProjectsList />} />
            <Route path=":projectId" element={<ProjectDetail />} />
          </Route>
          <Route path="knowledge-base">
            <Route index element={<KBPage />} />
            <Route path="articles/:articleId" element={<ArticlePage />} />
          </Route>
          <Route path="notifications" element={<NotificationsPage />} />
          <Route
            path="settings"
            element={
              <RoleGuard allow={['customer_admin']} redirect="/customer/dashboard">
                <WorkspaceSettings />
              </RoleGuard>
            }
          />
        </Route>

        {/* Internal routes */}
        <Route
          path="/internal"
          element={
            <RoleGuard allow={['3sc_agent', '3sc_lead', '3sc_admin']} redirect="/customer/dashboard">
              <InternalLayout />
            </RoleGuard>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<CustomerDashboard />} />
          <Route path="tickets">
            <Route index element={<TicketListPage />} />
            <Route path=":ticketId" element={<TicketDetailPage />} />
          </Route>
          <Route path="customers">
            <Route index element={<StubPage title="Customer Workspaces" />} />
            <Route path=":workspaceId" element={<StubPage title="Customer Detail" />} />
          </Route>
          <Route path="analytics" element={<AnalyticsDashboard />} />
          <Route path="knowledge-base">
            <Route index element={<KBPage />} />
            <Route path="articles/:articleId" element={<ArticlePage />} />
          </Route>
          <Route path="notifications" element={<NotificationsPage />} />
          <Route
            path="settings"
            element={
              <RoleGuard allow={['3sc_admin']} redirect="/internal/dashboard">
                <WorkspaceSettings />
              </RoleGuard>
            }
          />
          <Route path="settings/sla" element={<StubPage title="SLA Policies" />} />
          <Route path="settings/escalations" element={<StubPage title="Escalation Rules" />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  )
}
