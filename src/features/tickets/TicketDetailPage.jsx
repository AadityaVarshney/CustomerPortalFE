import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ChevronLeft, Sparkles, MoreHorizontal, Paperclip,
  Clock, Tag, User, FolderOpen, History, ChevronDown,
  ExternalLink, Download, AlertTriangle
} from 'lucide-react'
import { useTicket, useTicketComments, useTicketSLA, useUpdateTicketStatus } from './ticketQueries'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PriorityBadge } from '@/components/shared/PriorityBadge'
import { SLATimer } from '@/components/shared/SLATimer'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { ThreadComposer } from '@/components/shared/ThreadComposer'
import { AIAssistDrawer } from '@/components/shared/AIAssistDrawer'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { formatDateTime, formatRelativeTime, cn, TICKET_STATUSES } from '@/lib/utils'

// --- Status transition dropdown ---
function StatusDropdown({ ticket }) {
  const [open, setOpen] = useState(false)
  const updateStatus = useUpdateTicketStatus()
  const addToast = useUIStore((s) => s.addToast)
  const role = useAuthStore((s) => s.role)
  const isInternal = ['3sc_agent', '3sc_lead', '3sc_admin'].includes(role)

  const allowedTransitions = {
    open: ['acknowledged', 'in_progress', 'closed'],
    acknowledged: ['in_progress', 'escalated'],
    in_progress: ['resolved', 'escalated'],
    resolved: ['closed', 'open'],
    escalated: ['in_progress', 'resolved'],
    closed: isInternal ? ['open'] : [],
  }[ticket?.status] ?? []

  if (!allowedTransitions.length) return <StatusBadge status={ticket?.status} />

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 group"
      >
        <StatusBadge status={ticket?.status} />
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1.5 z-20 bg-popover border border-white/[0.1] rounded-xl shadow-glass overflow-hidden min-w-[160px]">
            <p className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-white/[0.06]">
              Transition to
            </p>
            {allowedTransitions.map((s) => (
              <button
                key={s}
                onClick={() => {
                  updateStatus.mutate({ id: ticket.id, status: s }, {
                    onSuccess: () => addToast({ type: 'success', title: 'Status updated' }),
                    onError: () => addToast({ type: 'error', title: 'Update failed' }),
                  })
                  setOpen(false)
                }}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm hover:bg-accent/50 transition-colors text-left"
              >
                <StatusBadge status={s} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// --- Comment bubble ---
function CommentBubble({ comment, currentUserId }) {
  const isOwn = comment.author?.id === currentUserId
  const isInternal = comment.is_internal

  return (
    <div className={cn('flex gap-3', isOwn && 'flex-row-reverse')}>
      <UserAvatar user={comment.author} size="sm" className="shrink-0 mt-0.5" />
      <div className={cn('flex-1 min-w-0 max-w-[85%]', isOwn && 'items-end flex flex-col')}>
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="text-xs font-medium text-foreground">{comment.author?.name}</span>
          {isInternal && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20 font-medium">
              Internal
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(comment.created_at)}
          </span>
        </div>

        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm',
            isOwn
              ? 'bg-primary/15 border border-primary/20 text-foreground rounded-tr-sm'
              : isInternal
              ? 'bg-amber-500/8 border border-amber-500/15 text-foreground rounded-tl-sm'
              : 'bg-accent/50 border border-white/[0.06] text-foreground rounded-tl-sm',
          )}
          dangerouslySetInnerHTML={{ __html: comment.content }}
        />

        {comment.attachments?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {comment.attachments.map((att) => (
              <a
                key={att.id}
                href={att.url}
                download
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-accent/50 border border-white/[0.06] text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Paperclip className="w-3 h-3" />
                {att.filename}
                <Download className="w-3 h-3" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// --- History event ---
function HistoryEvent({ event }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center shrink-0 mt-0.5">
        <History className="w-3 h-3 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">
          <span className="text-foreground font-medium">{event.actor?.name}</span>
          {' '}{event.description}
        </p>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
          {formatRelativeTime(event.created_at)}
        </p>
      </div>
    </div>
  )
}

// --- Left panel metadata ---
function MetadataPanel({ ticket, sla }) {
  const fields = [
    { icon: Tag, label: 'Category', value: ticket.category },
    { icon: FolderOpen, label: 'Project', value: ticket.project?.name, link: ticket.project_id ? `/customer/projects/${ticket.project_id}` : null },
    { icon: User, label: 'Created by', value: ticket.creator?.name, avatar: ticket.creator },
    { icon: User, label: 'Assigned to', value: ticket.assignee?.name ?? 'Unassigned', avatar: ticket.assignee },
    { icon: Clock, label: 'Created', value: formatDateTime(ticket.created_at) },
    { icon: Clock, label: 'Updated', value: formatRelativeTime(ticket.updated_at) },
  ]

  return (
    <div className="space-y-4">
      {/* SLA block */}
      {sla && (
        <div className={cn(
          'p-4 rounded-xl border',
          sla.breached ? 'bg-red-500/8 border-red-500/20' : 'bg-accent/30 border-white/[0.06]',
        )}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">SLA Status</span>
            <SLATimer due_at={sla.due_at} breached={sla.breached} />
          </div>
          {sla.policy_name && (
            <p className="text-xs text-muted-foreground">{sla.policy_name}</p>
          )}
        </div>
      )}

      {/* Fields */}
      <div className="space-y-3">
        {fields.map(({ icon: Icon, label, value, link, avatar }) => (
          <div key={label} className="flex items-start gap-3">
            <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">{label}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {avatar && <UserAvatar user={avatar} size="xs" />}
                {link ? (
                  <Link to={link} className="text-sm text-primary hover:text-primary/80 transition-colors truncate flex items-center gap-1">
                    {value}
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                ) : (
                  <p className="text-sm text-foreground truncate">{value || '—'}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tags */}
      {ticket.tags?.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {ticket.tags.map((tag) => (
              <span key={tag} className="px-2 py-0.5 rounded-md bg-accent text-xs text-muted-foreground border border-white/[0.06]">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Attachments */}
      {ticket.attachments?.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Attachments ({ticket.attachments.length})</p>
          <div className="space-y-1.5">
            {ticket.attachments.map((att) => (
              <a
                key={att.id}
                href={att.url}
                download
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors group"
              >
                <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors truncate flex-1">
                  {att.filename}
                </span>
                <Download className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {ticket.history?.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">History</p>
          <div className="divide-y divide-white/[0.04]">
            {ticket.history.map((event, i) => (
              <HistoryEvent key={i} event={event} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// --- Main page ---
export default function TicketDetailPage() {
  const { ticketId } = useParams()
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  const activeDrawer = useUIStore((s) => s.activeDrawer)
  const openDrawer = useUIStore((s) => s.openDrawer)
  const addToast = useUIStore((s) => s.addToast)

  const [commentTab, setCommentTab] = useState('customer')
  const [confirmClose, setConfirmClose] = useState(false)

  const isInternal = ['3sc_agent', '3sc_lead', '3sc_admin'].includes(role)

  const { data: ticket, isLoading, error } = useTicket(ticketId)
  const { data: commentsData, isLoading: commentsLoading } = useTicketComments(ticketId)
  const { data: sla } = useTicketSLA(ticketId)
  const updateStatus = useUpdateTicketStatus()

  const comments = commentsData?.items ?? []
  const visibleComments = isInternal
    ? comments
    : comments.filter((c) => !c.is_internal)

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="h-8 w-48 bg-accent rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <div className="xl:col-span-2 h-96 bg-accent rounded-2xl animate-pulse" />
          <div className="xl:col-span-3 h-96 bg-accent rounded-2xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center">
        <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-4" />
        <h2 className="text-lg font-display font-bold text-foreground">Ticket not found</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-6">
          This ticket doesn't exist or you don't have access.
        </p>
        <Link to=".." className="text-primary text-sm hover:text-primary/80 transition-colors">
          ← Back to tickets
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Breadcrumb + back */}
      <div className="flex items-center gap-2">
        <Link
          to=".."
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Tickets
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-sm text-foreground">#{ticketId?.slice(-6)}</span>
      </div>

      {/* Header bar */}
      <div className="glass-card rounded-2xl px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-display font-bold text-foreground leading-snug">
              {ticket.title}
            </h1>
            <div className="flex items-center gap-3 mt-2.5 flex-wrap">
              <StatusDropdown ticket={ticket} />
              <PriorityBadge priority={ticket.priority} />
              <SLATimer due_at={ticket.sla_due_at} breached={ticket.sla_breached} />
              <span className="text-xs text-muted-foreground">
                #{ticketId?.slice(-6)} · Opened {formatRelativeTime(ticket.created_at)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* AI Assist button */}
            <button
              onClick={() => openDrawer('ai-assist')}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all',
                activeDrawer === 'ai-assist'
                  ? 'bg-primary/15 text-primary border-primary/30'
                  : 'text-muted-foreground border-white/[0.06] hover:text-foreground hover:bg-accent/50',
              )}
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">AI Assist</span>
            </button>

            {/* More menu */}
            <button className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors border border-white/[0.06]">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Split pane */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Left — metadata (40%) */}
        <div className="xl:col-span-2">
          <div className="glass-card rounded-2xl p-5">
            <MetadataPanel ticket={ticket} sla={sla} />
          </div>
        </div>

        {/* Right — thread (60%) */}
        <div className="xl:col-span-3 flex flex-col gap-4">
          {/* Comments */}
          <div className="glass-card rounded-2xl overflow-hidden flex-1">
            {/* Tab header */}
            {isInternal && (
              <div className="flex border-b border-white/[0.06]">
                {[
                  { id: 'customer', label: 'Customer Thread' },
                  { id: 'internal', label: 'Internal Notes' },
                  { id: 'all', label: 'All' },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setCommentTab(id)}
                    className={cn(
                      'px-4 py-3 text-sm font-medium border-b-2 transition-all',
                      commentTab === id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {label}
                    {id === 'internal' && comments.filter((c) => c.is_internal).length > 0 && (
                      <span className="ml-1.5 text-xs bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded-full">
                        {comments.filter((c) => c.is_internal).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Comment list */}
            <div className="p-5 space-y-5 min-h-[200px] max-h-[500px] overflow-y-auto custom-scrollbar">
              {commentsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-accent animate-pulse shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-accent rounded animate-pulse w-1/4" />
                      <div className="h-16 bg-accent rounded-2xl animate-pulse" />
                    </div>
                  </div>
                ))
              ) : visibleComments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <p className="text-sm text-muted-foreground">No messages yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Be the first to reply below.</p>
                </div>
              ) : (
                (() => {
                  const filtered = commentTab === 'internal'
                    ? visibleComments.filter((c) => c.is_internal)
                    : commentTab === 'customer'
                    ? visibleComments.filter((c) => !c.is_internal)
                    : visibleComments
                  return filtered.map((comment) => (
                    <CommentBubble
                      key={comment.id}
                      comment={comment}
                      currentUserId={user?.id}
                    />
                  ))
                })()
              )}
            </div>
          </div>

          {/* Composer */}
          {ticket.status !== 'closed' && (
            <ThreadComposer
              ticketId={ticketId}
              isInternal={isInternal}
            />
          )}

          {ticket.status === 'closed' && (
            <div className="glass-card rounded-2xl p-4 text-center">
              <p className="text-sm text-muted-foreground">
                This ticket is closed.{' '}
                <button
                  onClick={() => setConfirmClose(true)}
                  className="text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  Reopen it
                </button>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* AI Assist Drawer */}
      {activeDrawer === 'ai-assist' && (
        <AIAssistDrawer ticketId={ticketId} ticket={ticket} />
      )}

      {/* Reopen confirm dialog */}
      <ConfirmDialog
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={() => updateStatus.mutate({ id: ticketId, status: 'open' }, {
          onSuccess: () => addToast({ type: 'success', title: 'Ticket reopened' }),
        })}
        title="Reopen this ticket?"
        message="The ticket will be moved back to Open status and your support team will be notified."
        confirmLabel="Reopen"
        variant="default"
      />
    </div>
  )
}
