import { io } from 'socket.io-client'
import { useAuthStore } from '@/stores/authStore'

let socket = null

export const getSocket = () => socket

export const initSocket = () => {
  const token = useAuthStore.getState().token
  const workspaceId = useAuthStore.getState().workspaceId

  if (socket?.connected) return socket

  socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:8080', {
    auth: { token },
    query: { workspaceId, token }, 
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 10,
  })

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket.id)
  })

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason)
  })

  socket.on('connect_error', (error) => {
    console.warn('[Socket] Connection error:', error.message)
  })

  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

// Helper to subscribe to events with auto-cleanup
export const subscribeToSocket = (event, handler) => {
  const sock = getSocket()
  if (!sock) return () => {}
  sock.on(event, handler)
  return () => sock.off(event, handler)
}
