import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, ChevronDown, SlidersHorizontal, X } from 'lucide-react'
import { useTickets } from './ticketQueries'
import { useAuthStore } from '@/stores/authStore'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
import { SLATimer } from '@/components/shared/SLATimer'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { formatRelativeTime, cn } from '@/lib/utils'

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

function FilterDropdown({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-all',
          value
            ? 'border-primary/50 bg-primary/10 text-foreground'
            : 'border-white/[0.08] bg-accent/30 text-muted-foreground hover:text-foreground hover:bg-accent/50',
        )}
      >
        {selected?.label ?? label}
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 z-20 w-44 bg-card border border-white/[0.08] rounded-xl shadow-glass overflow-hidden">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false) }}
                className={cn(
                  'w-full text-left px-3 py-2.5 text-sm transition-colors',
                  opt.value === value
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground hover:bg-accent/50',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function TicketRow({ ticket, isInternal }) {
  return (
    <Link
      to={ticket.id}
      className="flex items-start gap-4 px-5 py-4 hover:bg-accent/20 transition-colors border-b border-white/[0.04] last:border-0 group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-[11px] font-mono text-muted-foreground/60">
            #{ticket.ticket_number ?? ticket.id?.slice(-6)}
          </span>
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          {ticket.tags?.map((tag) => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-md bg-accent/60 text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors leading-snug truncate">
          {ticket.title}
        </p>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {ticket.category && (
            <span className="text-xs text-muted-foreground capitalize">
              {ticket.category.replace(/_/g, ' ')}
            </span>
          )}
          {ticket.project && (
            <span className="text-xs text-muted-foreground">
              📁 {ticket.project.name}
            </span>
          )}
          {isInternal && ticket.assignee && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <UserAvatar user={ticket.assignee} size="xs" />
              {ticket.assignee.name}
            </span>
          )}
          <span className="text-xs text-muted-foreground">{formatRelativeTime(ticket.updated_at)}</span>
        </div>
      </div>
      <div className="shrink-0">
        <SLATimer due_at={ticket.sla_due_at} breached={ticket.sla_breached} compact />
      </div>
    </Link>
  )
}

export default function TicketListPage() {
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.role)
  const isInternal = ['3sc_agent', '3sc_lead', '3sc_admin'].includes(role)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [page, setPage] = useState(0)

  const filters = {
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
    search: search || undefined,
    page,
    size: 20,
    sort: 'updated_at',
    order: 'desc',
  }

  const { data, isLoading, isFetching } = useTickets(filters)

  const tickets = data?.items ?? data?.content ?? []
  const totalPages = data?.total_pages ?? data?.totalPages ?? 0
  const totalElements = data?.total ?? data?.totalElements ?? 0

  const hasActiveFilters = statusFilter || priorityFilter || search

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            {isInternal ? 'All Tickets' : 'My Tickets'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? '…' : `${totalElements} total`}
          </p>
        </div>
        {!isInternal && (
          <button
            onClick={() => navigate('new')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Ticket
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="glass-card rounded-2xl p-3 flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="flex-1 min-w-[160px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            placeholder="Search tickets…"
            className="w-full pl-8 pr-3 py-2 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>

        <div className="h-5 w-px bg-white/[0.08]" />

        <FilterDropdown
          label="Status"
          value={statusFilter}
          options={STATUS_OPTIONS}
          onChange={(v) => { setStatusFilter(v); setPage(0) }}
        />
        <FilterDropdown
          label="Priority"
          value={priorityFilter}
          options={PRIORITY_OPTIONS}
          onChange={(v) => { setPriorityFilter(v); setPage(0) }}
        />

        {hasActiveFilters && (
          <button
            onClick={() => { setSearch(''); setStatusFilter(''); setPriorityFilter(''); setPage(0) }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}

        {isFetching && !isLoading && (
          <div className="ml-auto w-4 h-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        )}
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-white/[0.04]">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="px-5 py-4 space-y-2">
                <div className="h-3 bg-accent rounded animate-pulse w-1/5" />
                <div className="h-4 bg-accent rounded animate-pulse w-3/4" />
                <div className="h-3 bg-accent rounded animate-pulse w-1/3" />
              </div>
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-4">
              <SlidersHorizontal className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No tickets found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {hasActiveFilters ? 'Try adjusting your filters.' : 'Create your first ticket to get started.'}
            </p>
            {!isInternal && !hasActiveFilters && (
              <button
                onClick={() => navigate('new')}
                className="mt-4 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
              >
                Create ticket
              </button>
            )}
          </div>
        ) : (
          <div>
            {tickets.map((ticket) => (
              <TicketRow key={ticket.id} ticket={ticket} isInternal={isInternal} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06]">
            <span className="text-xs text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-white/[0.08] text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-white/[0.08] text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
