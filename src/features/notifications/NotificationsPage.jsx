import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '@/lib/axios'
import { useNotificationStore } from '@/stores/notificationStore'
import { Bell, Check, CheckCheck, Ticket, MessageSquare, AlertTriangle, FolderOpen, Zap } from 'lucide-react'
import { formatRelativeTime, cn } from '@/lib/utils'

const NOTIF_ICON = {
  ticket_created: Ticket,
  ticket_status_changed: Ticket,
  comment_created: MessageSquare,
  sla_breach_warning: AlertTriangle,
  mention_created: Zap,
  project_milestone_updated: FolderOpen,
}

const NOTIF_COLOR = {
  ticket_created: 'bg-blue-500/15 text-blue-400',
  ticket_status_changed: 'bg-violet-500/15 text-violet-400',
  comment_created: 'bg-primary/15 text-primary',
  sla_breach_warning: 'bg-red-500/15 text-red-400',
  mention_created: 'bg-amber-500/15 text-amber-400',
  project_milestone_updated: 'bg-emerald-500/15 text-emerald-400',
}

function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get('/notifications?limit=50')
      return data
    },
  })
}

function useMarkRead() {
  const qc = useQueryClient()
  const markRead = useNotificationStore((s) => s.markRead)
  return useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onMutate: (id) => markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

function useMarkAllRead() {
  const qc = useQueryClient()
  const markAllRead = useNotificationStore((s) => s.markAllRead)
  return useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onMutate: () => markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

function NotifItem({ notif, onRead }) {
  const Icon = NOTIF_ICON[notif.type] ?? Bell
  const colorClass = NOTIF_COLOR[notif.type] ?? 'bg-accent text-muted-foreground'
  const isUnread = !notif.read_at

  return (
    <div
      className={cn(
        'flex items-start gap-4 px-5 py-4 border-b border-white/[0.04] last:border-0 transition-colors',
        isUnread ? 'bg-primary/[0.03]' : '',
        'hover:bg-accent/20',
      )}
    >
      {/* Icon */}
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', colorClass)}>
        <Icon className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm', isUnread ? 'text-foreground font-medium' : 'text-muted-foreground')}>
          {notif.title}
        </p>
        {notif.body && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>
        )}
        <p className="text-xs text-muted-foreground/60 mt-1.5">
          {formatRelativeTime(notif.created_at)}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {notif.link && (
          <Link
            to={notif.link}
            onClick={() => isUnread && onRead(notif.id)}
            className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
          >
            View
          </Link>
        )}
        {isUnread && (
          <button
            onClick={() => onRead(notif.id)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
            title="Mark as read"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        )}
        {!isUnread && (
          <span className="w-1.5 h-1.5 rounded-full bg-transparent" />
        )}
      </div>

      {/* Unread dot */}
      {isUnread && (
        <div className="absolute right-5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
      )}
    </div>
  )
}

export default function NotificationsPage() {
  const { data, isLoading } = useNotifications()
  const setNotifications = useNotificationStore((s) => s.setNotifications)
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()

  const notifications = data?.items ?? []

  useEffect(() => {
    if (notifications.length > 0) {
      setNotifications(notifications)
    }
  }, [notifications, setNotifications])

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground border border-white/[0.06] hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      <div className="glass-card rounded-2xl overflow-hidden relative">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 px-5 py-4 border-b border-white/[0.04]">
              <div className="w-9 h-9 rounded-xl bg-accent animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-accent rounded animate-pulse w-3/4" />
                <div className="h-3 bg-accent rounded animate-pulse w-1/2" />
              </div>
            </div>
          ))
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mb-4">
              <Bell className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">No notifications yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              You'll be notified about ticket updates, mentions, and SLA alerts here.
            </p>
          </div>
        ) : (
          notifications.map((notif) => (
            <NotifItem
              key={notif.id}
              notif={notif}
              onRead={(id) => markRead.mutate(id)}
            />
          ))
        )}
      </div>
    </div>
  )
}
