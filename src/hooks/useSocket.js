import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { initSocket, disconnectSocket, subscribeToSocket } from '@/lib/socket'
import { useNotificationStore } from '@/stores/notificationStore'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'

export function useSocket() {
  const queryClient = useQueryClient()
  const addNotification = useNotificationStore((s) => s.addNotification)
  const addToast = useUIStore((s) => s.addToast)
  const token = useAuthStore((s) => s.token)

  useEffect(() => {
    if (!token) return

    const socket = initSocket()

    const unsubscribers = [
      subscribeToSocket('ticket.created', () => {
        queryClient.invalidateQueries({ queryKey: ['tickets'] })
      }),

      subscribeToSocket('ticket.status_changed', ({ ticket_id }) => {
        queryClient.invalidateQueries({ queryKey: ['tickets', ticket_id] })
        queryClient.invalidateQueries({ queryKey: ['tickets'] })
      }),

      subscribeToSocket('comment.created', ({ ticket_id }) => {
        queryClient.invalidateQueries({
          queryKey: ['tickets', ticket_id, 'comments'],
        })
      }),

      subscribeToSocket('ticket.sla_breach_warning', ({ ticket_id, minutes_remaining }) => {
        queryClient.invalidateQueries({ queryKey: ['tickets', ticket_id, 'sla-status'] })
        addToast({
          type: 'warning',
          title: 'SLA Warning',
          description: `Ticket #${ticket_id} breaches SLA in ${minutes_remaining} minutes`,
          duration: 10000,
        })
      }),

      subscribeToSocket('mention.created', (notification) => {
        addNotification(notification)
      }),

      subscribeToSocket('project.milestone_updated', ({ project_id }) => {
        queryClient.invalidateQueries({
          queryKey: ['projects', project_id, 'milestones'],
        })
      }),
    ]

    return () => {
      unsubscribers.forEach((unsub) => unsub())
    }
  }, [token, queryClient, addNotification, addToast])

  return null
}
