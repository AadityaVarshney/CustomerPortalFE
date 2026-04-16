import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTickets } from './ticketQueries'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
import { SLATimer } from '@/components/shared/SLATimer'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { formatRelativeTime, cn, TICKET_STATUSES, TICKET_PRIORITIES } from '@/lib/utils'
import {
  Plus, Search, Filter, ChevronDown, ChevronUp,
  RefreshCw, Ticket, SlidersHorizontal, X
} from 'lucide-react'

const SORT_OPTIONS = [
  { value: 'updated_at', label: 'Recently Updated' },
  { value: 'created_at', label: 'Date Created' },
  { value: 'priority', label: 'Priority' },
  { value: 'sla_due_at', label: 'SLA Due' },
]

function FilterChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
      {label}
      <button onClick={onRemove} className="hover:text-primary/60 transition-colors">
        <X className="w-3 h-3" />
      </button>
    </span>
  )
}

function TicketTableRow({ ticket }) {
  return (
    <Link
      to={`tickets/${ticket.id}`}
      className="flex items-center gap-4 px-5 py-4 hover:bg-accent/30 transition-colors group border-b border-white/[0.04] last:border-0"
    >
      <div className="w-20 shrink-0">
        <span className="text-xs font-mono text-muted-foreground">#{ticket.id?.slice(-6)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
          {ticket.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {ticket.category} · {formatRelativeTime(ticket.updatedAt)}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <StatusBadge status={ticket.status} />
        <PriorityBadge priority={ticket.priority} />
        <SLATimer due_at={ticket.slaDueAt} breached={ticket.slaBreached} />
        {ticket.assignee && <UserAvatar user={ticket.assignee} size="xs" />}
      </div>
    </Link>
  )
}

export default function TicketListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ status: '', priority: '', category: '' })
  const [sort, setSort] = useState('updated_at')
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)

  const activeFilters = Object.entries(filters).filter(([, v]) => v)

  const { data, isLoading, isFetching, refetch } = useTickets({
    search,
    ...filters,
    sort,
    page,
    limit: 20,
  })

  const tickets = data?.content ?? []
  const total = data?.totalElements ?? 0
  const totalPages = Math.ceil(total / 20)

  const clearFilter = (key) => setFilters((f) => ({ ...f, [key]: '' }))

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">My Tickets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total > 0 ? `${total} ticket${total !== 1 ? 's' : ''}` : 'No tickets yet'}
          </p>
        </div>
        <button
          onClick={() => navigate('new')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-gradient text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-glow"
        >
          <Plus className="w-4 h-4" /> New Ticket
        </button>
      </div>

      {/* Search + filter bar */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search tickets…"
              className="w-full pl-9 pr-4 py-2 rounded-xl text-sm bg-accent/50 border border-white/[0.06] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 rounded-xl text-sm bg-accent/50 border border-white/[0.06] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all',
              showFilters || activeFilters.length > 0
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'text-muted-foreground border-white/[0.06] hover:text-foreground hover:bg-accent/50',
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFilters.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {activeFilters.length}
              </span>
            )}
          </button>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
          </button>
        </div>

        {/* Expandable filters */}
        {showFilters && (
          <div className="px-4 py-3 border-b border-white/[0.06] flex flex-wrap gap-3">
            {/* Status */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => { setFilters((f) => ({ ...f, status: e.target.value })); setPage(1) }}
                className="px-3 py-1.5 rounded-lg text-sm bg-accent/50 border border-white/[0.06] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              >
                <option value="">All</option>
                {TICKET_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            {/* Priority */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Priority</label>
              <select
                value={filters.priority}
                onChange={(e) => { setFilters((f) => ({ ...f, priority: e.target.value })); setPage(1) }}
                className="px-3 py-1.5 rounded-lg text-sm bg-accent/50 border border-white/[0.06] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              >
                <option value="">All</option>
                {TICKET_PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Active filter chips */}
        {activeFilters.length > 0 && (
          <div className="px-4 py-2.5 border-b border-white/[0.06] flex flex-wrap gap-2">
            {activeFilters.map(([key, val]) => (
              <FilterChip key={key} label={`${key}: ${val}`} onRemove={() => clearFilter(key)} />
            ))}
            <button
              onClick={() => setFilters({ status: '', priority: '', category: '' })}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Table header */}
        <div className="hidden md:flex items-center gap-4 px-5 py-2.5 bg-accent/20 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <span className="w-20 shrink-0">ID</span>
          <span className="flex-1">Title</span>
          <span className="shrink-0 w-60 text-right">Status · Priority · SLA</span>
        </div>

        {/* Rows */}
        <div>
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.04]">
                <div className="w-20 h-3 bg-accent rounded animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 bg-accent rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-accent rounded animate-pulse w-1/3" />
                </div>
                <div className="flex gap-2">
                  <div className="h-5 w-16 bg-accent rounded-full animate-pulse" />
                  <div className="h-5 w-14 bg-accent rounded-full animate-pulse" />
                </div>
              </div>
            ))
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mb-4">
                <Ticket className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground">No tickets found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {activeFilters.length > 0 || search ? 'Try adjusting your filters.' : "You haven't created any tickets yet."}
              </p>
              {!search && activeFilters.length === 0 && (
                <button
                  onClick={() => navigate('new')}
                  className="mt-4 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                >
                  Create your first ticket
                </button>
              )}
            </div>
          ) : (
            tickets.map((ticket) => <TicketTableRow key={ticket.id} ticket={ticket} />)
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06]">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages} · {total} total
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                const pageNum = i + 1
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={cn(
                      'w-7 h-7 rounded-lg text-xs font-medium transition-colors',
                      page === pageNum ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                    )}
                  >
                    {pageNum}
                  </button>
                )
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
