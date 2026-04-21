import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ChevronLeft, Sparkles, MoreHorizontal, Paperclip,
  Clock, Tag, User, FolderOpen, History, ChevronDown,
  ExternalLink, Download, AlertTriangle, UserCheck,
  Pencil, Trash2, Check, X as XIcon, Loader2,
} from 'lucide-react'
import {
  useTicket,
  useTicketComments,
  useTicketSLA,
  useUpdateTicketStatus,
  useTicketHistory,
  useInternalNotes,
  useAssignTicket,
  useEditComment,
  useDeleteComment,
} from './ticketQueries'
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
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/axios'

// ─── Status transition dropdown ───────────────────────────────────────────────

function StatusDropdown({ ticket }) {
  const [open, setOpen] = useState(false)
  const updateStatus = useUpdateTicketStatus()
  const addToast = useUIStore((s) => s.addToast)
  const role = useAuthStore((s) => s.role)
  const isInternal = ['3sc_agent', '3sc_lead', '3sc_admin'].includes(role)

  const allowedTransitions = {
    open:         ['acknowledged', 'in_progress', 'closed'],
    acknowledged: ['in_progress', 'escalated'],
    in_progress:  ['resolved', 'escalated'],
    resolved:     ['closed', 'open'],
    escalated:    ['in_progress', 'resolved'],
    closed:       isInternal ? ['open'] : [],
  }[ticket?.status] ?? []

  if (!allowedTransitions.length) return <StatusBadge status={ticket?.status} />

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-1.5 group">
        <StatusBadge status={ticket?.status} />
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1.5 z-20 bg-popover border border-white/[0.1] rounded-xl shadow-glass overflow-hidden min-w-[160px]">
            <p className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-white/[0.06]">Transition to</p>
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

// ─── Assign dropdown (internal only) ─────────────────────────────────────────

function AssignDropdown({ ticket }) {
  const [open, setOpen] = useState(false)
  const assignTicket = useAssignTicket()
  const addToast = useUIStore((s) => s.addToast)

  // Fetch agents from workspace members
  const workspaceId = useAuthStore((s) => s.workspaceId)
  const { data: membersData } = useQuery({
    queryKey: ['workspace', workspaceId, 'members'],
    queryFn: async () => {
      const { data } = await api.get(`/workspaces/${workspaceId}/members`)
      return data
    },
    enabled: !!workspaceId && open,
    staleTime: 1000 * 60 * 5,
  })

  const agents = (Array.isArray(membersData) ? membersData : membersData?.items ?? [])
    .filter((m) => m.role?.startsWith('INTERNAL'))

  const currentAssigneeName = ticket?.assignedToName ?? ticket?.assignee?.name

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-white/[0.08] rounded-lg px-2.5 py-1.5"
      >
        <UserCheck className="w-3.5 h-3.5" />
        {currentAssigneeName ? `Assigned: ${currentAssigneeName}` : 'Unassigned'}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 w-52 bg-popover border border-white/[0.1] rounded-xl shadow-glass overflow-hidden">
            <p className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-white/[0.06]">Assign to</p>
            {agents.length === 0 ? (
              <p className="px-3 py-3 text-xs text-muted-foreground">No agents available</p>
            ) : (
              agents.map((agent) => (
                <button
                  key={agent.userId ?? agent.id}
                  onClick={() => {
                    assignTicket.mutate(
                      { id: ticket.id, agentId: agent.userId ?? agent.id },
                      {
                        onSuccess: () => { addToast({ type: 'success', title: 'Ticket assigned' }); setOpen(false) },
                        onError: () => addToast({ type: 'error', title: 'Assignment failed' }),
                      },
                    )
                  }}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm hover:bg-accent/50 transition-colors text-left"
                >
                  <UserAvatar user={agent} size="xs" />
                  <span className="truncate">{agent.name}</span>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Comment bubble with inline edit & delete ─────────────────────────────────

function CommentBubble({ comment, currentUserId, ticketId }) {
  const isOwn = comment.author?.id === currentUserId || comment.authorId === currentUserId
  const isInternalComment = comment.isInternal ?? comment.is_internal
  const canEdit = comment.canEdit ?? false
  const editComment = useEditComment()
  const deleteComment = useDeleteComment()
  const addToast = useUIStore((s) => s.addToast)

  const [editing, setEditing] = useState(false)
  const [editBody, setEditBody] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const startEdit = () => {
    // Strip HTML tags for plain-text editing in the textarea
    const plain = (comment.body ?? comment.content ?? '').replace(/<[^>]*>/g, '')
    setEditBody(plain)
    setEditing(true)
  }

  const submitEdit = () => {
    if (!editBody.trim()) return
    editComment.mutate(
      { commentId: comment.id, body: editBody },
      {
        onSuccess: () => { setEditing(false); addToast({ type: 'success', title: 'Comment updated' }) },
        onError: () => addToast({ type: 'error', title: 'Edit failed' }),
        // Pass ticketId as mutation context so the hook can invalidate the right query
        meta: { ticketId },
      },
    )
  }

  const confirmAndDelete = () => {
    deleteComment.mutate(comment.id, {
      onSuccess: () => { setConfirmDelete(false); addToast({ type: 'success', title: 'Comment deleted' }) },
      onError: () => { setConfirmDelete(false); addToast({ type: 'error', title: 'Delete failed' }) },
      meta: { ticketId },
    })
  }

  return (
    <>
      <div className={cn('flex gap-3', isOwn && 'flex-row-reverse')}>
        <UserAvatar user={comment.author ?? { name: comment.authorName }} size="sm" className="shrink-0 mt-0.5" />
        <div className={cn('flex-1 min-w-0 max-w-[85%]', isOwn && 'items-end flex flex-col')}>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-xs font-medium text-foreground">
              {comment.author?.name ?? comment.authorName}
            </span>
            {isInternalComment && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20 font-medium">
                Internal
              </span>
            )}
            <span className="text-xs text-muted-foreground">{formatRelativeTime(comment.createdAt ?? comment.created_at)}</span>
            {comment.isEdited && <span className="text-[10px] text-muted-foreground/60">(edited)</span>}

            {/* Edit / delete actions */}
            {(isOwn && canEdit) && !editing && (
              <button onClick={startEdit} className="ml-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all">
                <Pencil className="w-3 h-3" />
              </button>
            )}
            {isOwn && !editing && (
              <button onClick={() => setConfirmDelete(true)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all">
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>

          {editing ? (
            <div className="w-full space-y-2">
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-xl bg-accent/50 border border-white/[0.08] text-sm text-foreground outline-none focus:border-primary/50 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={submitEdit}
                  disabled={editComment.isPending}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {editComment.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  Save
                </button>
                <button onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                'rounded-2xl px-4 py-3 text-sm group',
                isOwn
                  ? 'bg-primary/15 border border-primary/20 text-foreground rounded-tr-sm'
                  : isInternalComment
                  ? 'bg-amber-500/8 border border-amber-500/15 text-foreground rounded-tl-sm'
                  : 'bg-accent/50 border border-white/[0.06] text-foreground rounded-tl-sm',
              )}
              // FIX: BE returns body field, not content
              dangerouslySetInnerHTML={{ __html: comment.body ?? comment.content ?? '' }}
            />
          )}

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

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={confirmAndDelete}
        title="Delete comment?"
        message="This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </>
  )
}

// ─── History event ────────────────────────────────────────────────────────────

function HistoryEvent({ event }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center shrink-0 mt-0.5">
        <History className="w-3 h-3 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">
          <span className="text-foreground font-medium">
            {event.changedByName ?? event.actor?.name}
          </span>
          {' '}
          {event.note ?? event.description ?? `changed status from ${event.fromStatus} → ${event.toStatus}`}
        </p>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
          {formatRelativeTime(event.createdAt ?? event.created_at)}
        </p>
      </div>
    </div>
  )
}

// ─── Left metadata panel ──────────────────────────────────────────────────────

function MetadataPanel({ ticket, sla }) {
  const fields = [
    { icon: Tag,       label: 'Category',   value: ticket.category },
    { icon: FolderOpen, label: 'Project',   value: ticket.project?.name ?? ticket.projectName, link: ticket.project_id ? `/customer/projects/${ticket.project_id}` : null },
    { icon: User,      label: 'Created by', value: ticket.creator?.name ?? ticket.createdByName },
    { icon: User,      label: 'Assigned to', value: ticket.assignee?.name ?? ticket.assignedToName ?? 'Unassigned' },
    { icon: Clock,     label: 'Created',    value: formatDateTime(ticket.created_at ?? ticket.createdAt) },
    { icon: Clock,     label: 'Updated',    value: formatRelativeTime(ticket.updated_at ?? ticket.updatedAt) },
  ]

  return (
    <div className="space-y-4">
      {/* SLA block */}
      {sla && (
        <div className={cn(
          'p-4 rounded-xl border',
          sla.breached ? 'bg-red-500/8 border-red-500/20' : 'bg-emerald-500/8 border-emerald-500/20',
        )}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-foreground">SLA Status</p>
            <span className={cn('text-xs font-semibold', sla.breached ? 'text-red-400' : 'text-emerald-400')}>
              {sla.breached ? 'BREACHED' : 'ON TRACK'}
            </span>
          </div>
          {sla.slaDueAt && (
            <SLATimer due_at={sla.slaDueAt ?? sla.sla_due_at} breached={sla.breached} />
          )}
        </div>
      )}

      {/* Fields */}
      <div className="space-y-3">
        {fields.map(({ icon: Icon, label, value, link }) => (
          <div key={label} className="flex items-start gap-3">
            <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">{label}</p>
              {link ? (
                <Link to={link} className="text-xs text-primary hover:text-primary/80 transition-colors truncate block">
                  {value}
                </Link>
              ) : (
                <p className="text-xs text-foreground truncate">{value ?? '—'}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Tags */}
      {ticket.tags?.length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wide mb-1.5">Tags</p>
          <div className="flex flex-wrap gap-1">
            {ticket.tags.map((tag) => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-md bg-accent text-muted-foreground">{tag}</span>
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
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors truncate flex-1">{att.filename}</span>
                <Download className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TicketDetailPage() {
  const { ticketId } = useParams()
  const user        = useAuthStore((s) => s.user)
  const role        = useAuthStore((s) => s.role)
  const activeDrawer = useUIStore((s) => s.activeDrawer)
  const openDrawer   = useUIStore((s) => s.openDrawer)
  const addToast     = useUIStore((s) => s.addToast)

  const [commentTab,   setCommentTab]   = useState('customer')
  const [confirmClose, setConfirmClose] = useState(false)

  const isInternal  = ['3sc_agent', '3sc_lead', '3sc_admin'].includes(role)
  const isLeadAdmin = ['3sc_lead', '3sc_admin'].includes(role)

  // ── Data fetching ────────────────────────────────────────────────────────

  const { data: ticket, isLoading, error } = useTicket(ticketId)
  const { data: commentsData, isLoading: commentsLoading } = useTicketComments(ticketId)
  const { data: sla } = useTicketSLA(ticketId)

  // FIX: history is fetched from dedicated endpoint, NOT from ticket.history
  const { data: historyData } = useTicketHistory(ticketId)

  // FIX: internal notes fetched separately (only for internal users)
  const { data: internalNotesData } = useInternalNotes(ticketId, isInternal)

  const updateStatus = useUpdateTicketStatus()

  // Normalise data shapes from BE responses
  const customerComments = Array.isArray(commentsData)
    ? commentsData
    : (commentsData?.items ?? commentsData?.content ?? [])

  const internalNotes = Array.isArray(internalNotesData)
    ? internalNotesData
    : (internalNotesData?.items ?? internalNotesData?.content ?? [])

  const history = Array.isArray(historyData)
    ? historyData
    : (historyData?.items ?? historyData?.content ?? [])

  // Build unified comment list for "All" tab
  const allComments = [
    ...customerComments.map((c) => ({ ...c, isInternal: false, is_internal: false })),
    ...internalNotes.map((n) => ({ ...n, isInternal: true, is_internal: true, body: n.body, authorName: n.authorName })),
  ].sort((a, b) => new Date(a.createdAt ?? a.created_at) - new Date(b.createdAt ?? b.created_at))

  const displayedComments =
    commentTab === 'internal' ? internalNotes :
    commentTab === 'customer' ? customerComments :
    allComments

  // ── Loading / error states ───────────────────────────────────────────────

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
        <p className="text-sm text-muted-foreground mt-1 mb-6">This ticket doesn't exist or you don't have access.</p>
        <Link to=".." className="text-primary text-sm hover:text-primary/80 transition-colors">← Back to tickets</Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link to=".." className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" /> Tickets
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-sm text-foreground">#{ticketId?.slice(-6)}</span>
      </div>

      {/* Header bar */}
      <div className="glass-card rounded-2xl px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-display font-bold text-foreground leading-snug">{ticket.title}</h1>
            <div className="flex items-center gap-3 mt-2.5 flex-wrap">
              <StatusDropdown ticket={ticket} />
              <PriorityBadge priority={ticket.priority} />
              <SLATimer due_at={ticket.slaDueAt ?? ticket.sla_due_at} breached={ticket.slaBreached ?? ticket.sla_breached} />
              <span className="text-xs text-muted-foreground">
                #{ticketId?.slice(-6)} · Opened {formatRelativeTime(ticket.createdAt ?? ticket.created_at)}
              </span>
            </div>

            {/* Assign dropdown — internal users only */}
            {isInternal && (
              <div className="mt-3">
                <AssignDropdown ticket={ticket} />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
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
            <button className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors border border-white/[0.06]">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Split pane */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Left — metadata */}
        <div className="xl:col-span-2">
          <div className="glass-card rounded-2xl p-5 space-y-5">
            <MetadataPanel ticket={ticket} sla={sla} />

            {/* Status history — fetched from GET /tickets/:id/history */}
            {history.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">History</p>
                <div className="divide-y divide-white/[0.04]">
                  {history.map((event, i) => (
                    <HistoryEvent key={event.id ?? i} event={event} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right — thread */}
        <div className="xl:col-span-3 flex flex-col gap-4">
          <div className="glass-card rounded-2xl overflow-hidden flex-1">
            {/* Tab header (internal users see all 3 tabs) */}
            {isInternal && (
              <div className="flex border-b border-white/[0.06]">
                {[
                  { id: 'customer', label: 'Customer Thread' },
                  { id: 'internal', label: 'Internal Notes', count: internalNotes.length },
                  { id: 'all',      label: 'All' },
                ].map(({ id, label, count }) => (
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
                    {count > 0 && (
                      <span className="ml-1.5 text-xs bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded-full">{count}</span>
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
              ) : displayedComments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <p className="text-sm text-muted-foreground">No messages yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Be the first to reply below.</p>
                </div>
              ) : (
                displayedComments.map((comment) => (
                  <CommentBubble
                    key={comment.id}
                    comment={comment}
                    currentUserId={user?.id}
                    ticketId={ticketId}
                  />
                ))
              )}
            </div>
          </div>

          {/* Composer */}
          {ticket.status !== 'closed' ? (
            <ThreadComposer ticketId={ticketId} isInternal={isInternal} />
          ) : (
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

      {/* Reopen confirm */}
      <ConfirmDialog
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={() => updateStatus.mutate(
          { id: ticketId, status: 'open' },
          { onSuccess: () => addToast({ type: 'success', title: 'Ticket reopened' }) },
        )}
        title="Reopen this ticket?"
        message="The ticket will be moved back to Open status and your support team will be notified."
        confirmLabel="Reopen"
        variant="default"
      />
    </div>
  )
}
