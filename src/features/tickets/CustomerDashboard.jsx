// FIXED: Removed call to GET /dashboard/stats — this endpoint does NOT exist on the backend.
// Stats are now derived client-side from the ticket list response.
import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, TrendingUp, Clock, CheckCircle2, AlertCircle, RefreshCw, ArrowRight, Activity } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/axios'
import { useAuthStore } from '@/stores/authStore'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
import { SLATimer } from '@/components/shared/SLATimer'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { formatRelativeTime, cn } from '@/lib/utils'

// --- API hooks ---

// REMOVED: useDashboardStats() — GET /dashboard/stats does not exist on BE.
// Stats are now derived from the ticket list.

function useRecentTickets() {
  return useQuery({
    queryKey: ['tickets', { limit: 50, sort: 'updated_at' }],
    queryFn: async () => {
      const { data } = await api.get('/tickets?limit=50&sort=updated_at&order=desc')
      return data
    },
    refetchInterval: 30000,
  })
}

function useProjectHealth() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await api.get('/projects')
      return data
    },
  })
}

// --- Sub-components ---
function MetricCard({ icon: Icon, label, value, trend, color, onClick, isLoading }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'glass-card glass-card-hover rounded-2xl p-5 text-left w-full',
        'group transition-all duration-200',
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
          <Icon className="w-5 h-5" />
        </div>
        {trend !== undefined && (
          <div className="flex items-center gap-1 text-xs text-emerald-400">
            <TrendingUp className="w-3 h-3" />
            {trend}%
          </div>
        )}
      </div>
      <div className="mt-4">
        {isLoading ? (
          <div className="h-8 w-16 bg-accent animate-pulse rounded-lg" />
        ) : (
          <p className="text-3xl font-display font-bold text-foreground">{value ?? '—'}</p>
        )}
        <p className="text-sm text-muted-foreground mt-1">{label}</p>
      </div>
    </button>
  )
}

function TicketRow({ ticket }) {
  return (
    <Link
      to={`/customer/tickets/${ticket.id}`}
      className="flex items-start gap-4 px-5 py-4 hover:bg-accent/20 transition-colors group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
        </div>
        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors leading-snug truncate">
          {ticket.title}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{formatRelativeTime(ticket.updated_at)}</p>
      </div>
      <SLATimer due_at={ticket.sla_due_at} breached={ticket.sla_breached} compact />
    </Link>
  )
}

function ProjectCard({ project }) {
  const progress = project.progress ?? 0
  return (
    <Link
      to={`/customer/projects/${project.id}`}
      className="p-4 hover:bg-accent/20 transition-colors group"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate flex-1 mr-2">
          {project.name}
        </p>
        <span className="text-xs text-muted-foreground shrink-0">{progress}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-accent overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1.5">
        {project.milestones_completed ?? 0} / {project.milestones_total ?? (project.milestones?.length ?? 0)} milestones
      </p>
    </Link>
  )
}

function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
      <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs">{description}</p>
      {action}
    </div>
  )
}

// --- Main page ---
export default function CustomerDashboard() {
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('all')

  const isInternal = ['3sc_agent', '3sc_lead', '3sc_admin'].includes(role)
  const newTicketPath = isInternal ? '/internal/tickets/new' : '/customer/tickets/new'

  const tickets = useRecentTickets()
  const projects = useProjectHealth()

  // Derive stats from ticket list (no /dashboard/stats endpoint on BE)
  const allTickets = useMemo(() => {
    return tickets.data?.items ?? tickets.data?.content ?? (Array.isArray(tickets.data) ? tickets.data : [])
  }, [tickets.data])

  const stats = useMemo(() => ({
    open_count: allTickets.filter((t) => t.status === 'OPEN').length,
    in_progress_count: allTickets.filter((t) => ['IN_PROGRESS', 'ACKNOWLEDGED'].includes(t.status)).length,
    resolved_count: allTickets.filter((t) => ['RESOLVED', 'CLOSED'].includes(t.status)).length,
    sla_breached: allTickets.filter((t) => t.sla_breached).length,
  }), [allTickets])

  const filteredTickets = statusFilter === 'all'
    ? allTickets
    : allTickets.filter((t) => t.status === statusFilter.toUpperCase())

  const projectList = useMemo(() => {
    const d = projects.data
    return d?.items ?? d?.content ?? (Array.isArray(d) ? d : [])
  }, [projects.data])

  const STATUS_FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
  ]

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            {greeting}, {user?.name?.split(' ')[0] ?? 'there'} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Here's what's happening with your support tickets today
          </p>
        </div>
        <button
          onClick={() => navigate(newTicketPath)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium',
            'bg-brand-gradient text-white hover:opacity-90',
            'transition-all duration-200 shadow-glow shrink-0',
          )}
        >
          <Plus className="w-4 h-4" />
          New Ticket
        </button>
      </div>

      {/* Metric cards — derived from ticket list */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={AlertCircle}
          label="Open Tickets"
          value={tickets.isLoading ? undefined : stats.open_count}
          color="bg-blue-500/15 text-blue-400"
          isLoading={tickets.isLoading}
          onClick={() => setStatusFilter('open')}
        />
        <MetricCard
          icon={Activity}
          label="In Progress"
          value={tickets.isLoading ? undefined : stats.in_progress_count}
          color="bg-amber-500/15 text-amber-400"
          isLoading={tickets.isLoading}
          onClick={() => setStatusFilter('in_progress')}
        />
        <MetricCard
          icon={CheckCircle2}
          label="Resolved"
          value={tickets.isLoading ? undefined : stats.resolved_count}
          color="bg-emerald-500/15 text-emerald-400"
          isLoading={tickets.isLoading}
          onClick={() => setStatusFilter('resolved')}
        />
        <MetricCard
          icon={Clock}
          label="SLA Breached"
          value={tickets.isLoading ? undefined : stats.sla_breached}
          color={stats.sla_breached > 0 ? 'bg-red-500/15 text-red-400' : 'bg-violet-500/15 text-violet-400'}
          isLoading={tickets.isLoading}
          onClick={() => setStatusFilter('all')}
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent tickets — 2 cols */}
        <div className="xl:col-span-2" id="tickets-section">
          <div className="glass-card rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold text-foreground">Recent Tickets</h2>
                {allTickets.length > 0 && (
                  <span className="text-xs bg-accent px-2 py-0.5 rounded-full text-muted-foreground">
                    {allTickets.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1">
                  {STATUS_FILTERS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setStatusFilter(f.value)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                        statusFilter === f.value
                          ? 'bg-primary/20 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => tickets.refetch()}
                  disabled={tickets.isFetching}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
                >
                  <RefreshCw className={cn('w-3.5 h-3.5', tickets.isFetching && 'animate-spin')} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="divide-y divide-white/[0.04]">
              {tickets.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-4 flex items-center gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-accent rounded animate-pulse w-1/4" />
                      <div className="h-4 bg-accent rounded animate-pulse w-3/4" />
                      <div className="h-3 bg-accent rounded animate-pulse w-1/3" />
                    </div>
                  </div>
                ))
              ) : filteredTickets.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="No tickets found"
                  description={
                    statusFilter === 'all'
                      ? "You haven't created any support tickets yet."
                      : `No ${statusFilter.replace('_', ' ')} tickets.`
                  }
                  action={
                    statusFilter === 'all' && (
                      <button
                        onClick={() => navigate(newTicketPath)}
                        className="mt-4 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                      >
                        Create your first ticket
                      </button>
                    )
                  }
                />
              ) : (
                filteredTickets.slice(0, 10).map((ticket) => (
                  <TicketRow key={ticket.id} ticket={ticket} />
                ))
              )}
            </div>

            {/* Footer */}
            {filteredTickets.length > 0 && (
              <div className="px-5 py-3 border-t border-white/[0.06]">
                <Link
                  to="/customer/tickets"
                  className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
                >
                  View all tickets <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Project health — 1 col */}
        <div className="space-y-4">
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Project Health</h2>
              <Link
                to="/customer/projects"
                className="text-xs text-primary hover:text-primary/80 transition-colors"
              >
                View all
              </Link>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {projects.isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-4 space-y-2">
                    <div className="h-3.5 bg-accent rounded animate-pulse w-2/3" />
                    <div className="h-1.5 bg-accent rounded-full animate-pulse" />
                  </div>
                ))
              ) : projectList.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-xs text-muted-foreground">No active projects.</p>
                </div>
              ) : (
                projectList.slice(0, 5).map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
