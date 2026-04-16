import { useState } from 'react'
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
function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/stats')
      return data
    },
  })
}

function useRecentTickets() {
  return useQuery({
    queryKey: ['tickets', { limit: 10, sort: 'updated_at' }],
    queryFn: async () => {
      const { data } = await api.get('/tickets?limit=10&sort=updated_at&order=desc')
      return data
    },
    refetchInterval: 30000,
  })
}

function useProjectHealth() {
  return useQuery({
    queryKey: ['projects', 'health'],
    queryFn: async () => {
      const { data } = await api.get('/projects?include=health')
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
      <div className="mt-3 flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
        View all <ArrowRight className="w-3 h-3" />
      </div>
    </button>
  )
}

function TicketRow({ ticket }) {
  return (
    <Link
      to={`/customer/tickets/${ticket.id}`}
      className="flex items-center gap-4 p-4 rounded-xl hover:bg-accent/30 transition-colors group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono text-muted-foreground">#{ticket.id?.slice(-6)}</span>
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} showLabel={false} />
        </div>
        <p className="text-sm font-medium text-foreground mt-1 truncate group-hover:text-primary transition-colors">
          {ticket.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Updated {formatRelativeTime(ticket.updated_at)}
        </p>
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <SLATimer due_at={ticket.sla_due_at} breached={ticket.sla_breached} />
      </div>
    </Link>
  )
}

function ProjectHealthCard({ project }) {
  const ragColor = {
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
  }[project.rag_status] ?? 'bg-gray-500'

  const progress = project.milestones_total > 0
    ? Math.round((project.milestones_completed / project.milestones_total) * 100)
    : 0

  return (
    <Link
      to={`/customer/projects/${project.id}`}
      className="glass-card glass-card-hover rounded-xl p-4 block"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', ragColor)} />
            <p className="text-sm font-semibold text-foreground truncate">{project.name}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {project.open_issues ?? 0} open
        </span>
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-accent overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          {project.milestones_completed ?? 0} / {project.milestones_total ?? 0} milestones
        </p>
      </div>
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
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('all')

  const stats = useDashboardStats()
  const tickets = useRecentTickets()
  const projects = useProjectHealth()

  const filteredTickets = statusFilter === 'all'
    ? tickets.data?.items ?? []
    : (tickets.data?.items ?? []).filter((t) => t.status === statusFilter)

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
          onClick={() => navigate('/customer/tickets/new')}
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

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={AlertCircle}
          label="Open Tickets"
          value={stats.data?.open_count}
          color="bg-blue-500/15 text-blue-400"
          isLoading={stats.isLoading}
          onClick={() => { setStatusFilter('open'); document.getElementById('tickets-section')?.scrollIntoView({ behavior: 'smooth' }) }}
        />
        <MetricCard
          icon={Activity}
          label="In Progress"
          value={stats.data?.in_progress_count}
          color="bg-amber-500/15 text-amber-400"
          isLoading={stats.isLoading}
          onClick={() => { setStatusFilter('in_progress'); document.getElementById('tickets-section')?.scrollIntoView({ behavior: 'smooth' }) }}
        />
        <MetricCard
          icon={CheckCircle2}
          label="Resolved (30d)"
          value={stats.data?.resolved_count}
          trend={stats.data?.resolved_trend}
          color="bg-emerald-500/15 text-emerald-400"
          isLoading={stats.isLoading}
          onClick={() => setStatusFilter('resolved')}
        />
        <MetricCard
          icon={Clock}
          label="Avg Response"
          value={stats.data?.avg_response_time ? `${stats.data.avg_response_time}h` : undefined}
          color="bg-violet-500/15 text-violet-400"
          isLoading={stats.isLoading}
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
                {tickets.data?.total && (
                  <span className="text-xs bg-accent px-2 py-0.5 rounded-full text-muted-foreground">
                    {tickets.data.total}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Status filter pills */}
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
                  description={statusFilter === 'all' ? "You haven't created any support tickets yet." : `No ${statusFilter.replace('_', ' ')} tickets.`}
                  action={
                    statusFilter === 'all' && (
                      <button
                        onClick={() => navigate('/customer/tickets/new')}
                        className="mt-4 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                      >
                        Create your first ticket
                      </button>
                    )
                  }
                />
              ) : (
                filteredTickets.map((ticket) => (
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
            <div className="p-4 space-y-3">
              {projects.isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="glass-card rounded-xl p-4 space-y-3">
                    <div className="h-4 bg-accent rounded animate-pulse w-2/3" />
                    <div className="h-2 bg-accent rounded animate-pulse" />
                  </div>
                ))
              ) : !projects.data?.items?.length ? (
                <EmptyState
                  icon={Activity}
                  title="No projects yet"
                  description="Projects will appear here once your team creates them."
                />
              ) : (
                projects.data.items.slice(0, 4).map((project) => (
                  <ProjectHealthCard key={project.id} project={project} />
                ))
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="glass-card rounded-2xl p-4 space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Quick Actions
            </h3>
            {[
              { label: 'Create new ticket', to: '/customer/tickets/new', icon: Plus },
              { label: 'Browse knowledge base', to: '/customer/knowledge-base', icon: Activity },
              { label: 'View all projects', to: '/customer/projects', icon: Activity },
            ].map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.to}
                  to={action.to}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent/50 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                    <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                    {action.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
