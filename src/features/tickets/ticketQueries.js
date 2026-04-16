import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'

// --- Query keys ---
export const ticketKeys = {
  all: ['tickets'],
  list: (filters) => ['tickets', filters],
  detail: (id) => ['tickets', id],
  comments: (id) => ['tickets', id, 'comments'],
  slaStatus: (id) => ['tickets', id, 'sla-status'],
}

// --- API calls ---
const fetchTickets = async (filters = {}) => {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => v && params.append(k, v))
  const { data } = await api.get(`/tickets?${params}`)
  return data
}

const fetchTicket = async (id) => {
  const { data } = await api.get(`/tickets/${id}`)
  return data
}

const fetchComments = async (ticketId) => {
  const { data } = await api.get(`/tickets/${ticketId}/comments`)
  return data
}

const fetchSLAStatus = async (ticketId) => {
  const { data } = await api.get(`/tickets/${ticketId}/sla-status`)
  return data
}

const createTicket = async (payload) => {
  const { data } = await api.post('/tickets', payload)
  return data
}

const updateTicketStatus = async ({ id, status, note }) => {
  const { data } = await api.patch(`/tickets/${id}/status`, { status, note })
  return data
}

const addComment = async ({ ticketId, content, is_internal, attachments }) => {
  const { data } = await api.post(`/tickets/${ticketId}/comments`, {
    content,
    is_internal,
    attachments,
  })
  return data
}

// --- Hooks ---
export function useTickets(filters) {
  return useQuery({
    queryKey: ticketKeys.list(filters),
    queryFn: () => fetchTickets(filters),
  })
}

export function useTicket(id) {
  return useQuery({
    queryKey: ticketKeys.detail(id),
    queryFn: () => fetchTicket(id),
    enabled: !!id,
  })
}

export function useTicketComments(ticketId) {
  return useQuery({
    queryKey: ticketKeys.comments(ticketId),
    queryFn: () => fetchComments(ticketId),
    enabled: !!ticketId,
    refetchInterval: 30000,
  })
}

export function useTicketSLA(ticketId) {
  return useQuery({
    queryKey: ticketKeys.slaStatus(ticketId),
    queryFn: () => fetchSLAStatus(ticketId),
    enabled: !!ticketId,
    refetchInterval: 60000,
  })
}

export function useCreateTicket() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.all })
    },
  })
}

export function useUpdateTicketStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateTicketStatus,
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: ticketKeys.all })
    },
  })
}

export function useAddComment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: addComment,
    onSuccess: (_, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.comments(ticketId) })
    },
  })
}
