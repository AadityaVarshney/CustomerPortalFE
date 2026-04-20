import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, BellOff, Loader2 } from 'lucide-react'
import api from '@/lib/axios'
import { useUIStore } from '@/stores/uiStore'
import { formatRelativeTime, cn } from '@/lib/utils'

// ── API ───────────────────────────────────────────────────────────────────────

const fetchNotifications = async () => {
  const { data } = await api.get('/notifications')
  return data
}

const markRead = async (id) => {
  const { data } = await api.patch(`/notifications/${id}/read`)
  return data
}

const markAllRead = async () => {
  await api.patch('/notifications/read-all')
}

// ── Notification Icon ─────────────────────────────────────────────────────────

const TYPE_ICONS = {
  ticket_created: '🎫',
  ticket_updated: '✏️',
  ticket_assigned: '👤',
  comment_added: '💬',
  sla_breach: '⚠️',
  ticket_resolved: '✅',
  ticket_escalated: '🚨',
}

function NotificationItem({ notification, onMarkRead }) {
  const isUnread = !notification.read_at
  return (
    <div
      className={cn(
        'flex items-start gap-3 px-5 py-4 border-b border-white/[0.04] last:border-0 transition-colors',
        isUnread ? 'bg-primary/[0.03]' : '',
      )}
    >
      <div className="text-lg shrink-0 mt-0.5">
        {TYPE_ICONS[notification.type] ?? '🔔'}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm leading-snug', isUnread ? 'text-foreground font-medium' : 'text-muted-foreground')}>
          {notification.message ?? notification.title}
        </p>
        {notification.body && notification.body !== notification.message && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.body}</p>
        )}
        <p className="text-xs text-muted-foreground/60 mt-1.5">
          {formatRelativeTime(notification.created_at)}
        </p>
      </div>
      {isUnread && (
        <button
          onClick={() => onMarkRead(notification.id)}
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          title="Mark as read"
        >
          <CheckCheck className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

export default function NotificationsPage() {
  const addToast = useUIStore((s) => s.addToast)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    refetchInterval: 30000,
  })

  const notifications = Array.isArray(data) ? data : (data?.items ?? data?.content ?? [])
  const unreadCount = notifications.filter((n) => !n.read_at).length

  const markReadMutation = useMutation({
    mutationFn: markRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
    onError: () => addToast({ type: 'error', title: 'Failed to mark as read' }),
  })

  const markAllMutation = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      addToast({ type: 'success', title: 'All notifications marked as read' })
    },
    onError: () => addToast({ type: 'error', title: 'Failed to mark all as read' }),
  })

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground border border-white/[0.08] hover:text-foreground hover:bg-accent/50 transition-colors disabled:opacity-50"
          >
            {markAllMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
            Mark all read
          </button>
        )}
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-white/[0.04]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 px-5 py-4">
                <div className="w-7 h-7 rounded-full bg-accent animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-accent rounded animate-pulse w-4/5" />
                  <div className="h-3 bg-accent rounded animate-pulse w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BellOff className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm font-medium text-foreground">No notifications</p>
            <p className="text-xs text-muted-foreground mt-1">You're all caught up!</p>
          </div>
        ) : (
          notifications.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onMarkRead={(id) => markReadMutation.mutate(id)}
            />
          ))
        )}
      </div>
    </div>
  )
}
