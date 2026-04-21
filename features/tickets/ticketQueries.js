import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'

// ─── Query keys ───────────────────────────────────────────────────────────────

export const ticketKeys = {
  all: ['tickets'],
  list: (filters) => ['tickets', 'list', filters],
  detail: (id) => ['tickets', id],
  comments: (id) => ['tickets', id, 'comments'],
  internalNotes: (id) => ['tickets', id, 'internal-notes'],
  history: (id) => ['tickets', id, 'history'],
  slaStatus: (id) => ['tickets', id, 'sla-status'],
}

// ─── Raw API calls ────────────────────────────────────────────────────────────

const fetchTickets = async (filters = {}) => {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.append(k, v)
  })
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

const fetchInternalNotes = async (ticketId) => {
  const { data } = await api.get(`/tickets/${ticketId}/internal-notes`)
  return data
}

const fetchHistory = async (ticketId) => {
  const { data } = await api.get(`/tickets/${ticketId}/history`)
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

const updateTicket = async ({ id, ...payload }) => {
  const { data } = await api.patch(`/tickets/${id}`, payload)
  return data
}

const deleteTicket = async (id) => {
  await api.delete(`/tickets/${id}`)
}

const updateTicketStatus = async ({ id, status, note }) => {
  const { data } = await api.patch(`/tickets/${id}/status`, { status, note })
  return data
}

const assignTicket = async ({ id, agentId }) => {
  // BE expects: PATCH /tickets/:id/assign  { agentId: UUID }
  const { data } = await api.patch(`/tickets/${id}/assign`, { agentId })
  return data
}

// FIX: BE CommentRequest expects { body, isInternal } — NOT { content, is_internal }
const addComment = async ({ ticketId, body, isInternal = false }) => {
  const { data } = await api.post(`/tickets/${ticketId}/comments`, { body, isInternal })
  return data
}

// Separate endpoint for internal notes: POST /tickets/:id/internal-notes  { body }
const addInternalNote = async ({ ticketId, body }) => {
  const { data } = await api.post(`/tickets/${ticketId}/internal-notes`, { body })
  return data
}

// PATCH /comments/:id  { body }  — edit within 5-min window
const editComment = async ({ commentId, body }) => {
  const { data } = await api.patch(`/comments/${commentId}`, { body })
  return data
}

// DELETE /comments/:id
const deleteComment = async (commentId) => {
  await api.delete(`/comments/${commentId}`)
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

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

export function useInternalNotes(ticketId, enabled = true) {
  return useQuery({
    queryKey: ticketKeys.internalNotes(ticketId),
    queryFn: () => fetchInternalNotes(ticketId),
    enabled: !!ticketId && enabled,
    refetchInterval: 30000,
  })
}

export function useTicketHistory(ticketId) {
  return useQuery({
    queryKey: ticketKeys.history(ticketId),
    queryFn: () => fetchHistory(ticketId),
    enabled: !!ticketId,
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

export function useUpdateTicket() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateTicket,
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: ticketKeys.all })
    },
  })
}

export function useDeleteTicket() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteTicket,
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
      queryClient.invalidateQueries({ queryKey: ticketKeys.history(id) })
      queryClient.invalidateQueries({ queryKey: ticketKeys.all })
    },
  })
}

export function useAssignTicket() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: assignTicket,
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(id) })
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

export function useAddInternalNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: addInternalNote,
    onSuccess: (_, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.internalNotes(ticketId) })
    },
  })
}

export function useEditComment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: editComment,
    // Invalidate the parent ticket's comment list (ticketId passed via context by caller)
    onSuccess: (_data, _vars, context) => {
      if (context?.ticketId) {
        queryClient.invalidateQueries({ queryKey: ticketKeys.comments(context.ticketId) })
        queryClient.invalidateQueries({ queryKey: ticketKeys.internalNotes(context.ticketId) })
      }
    },
  })
}

export function useDeleteComment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteComment,
    onSuccess: (_data, _vars, context) => {
      if (context?.ticketId) {
        queryClient.invalidateQueries({ queryKey: ticketKeys.comments(context.ticketId) })
        queryClient.invalidateQueries({ queryKey: ticketKeys.internalNotes(context.ticketId) })
      }
    },
  })
}
