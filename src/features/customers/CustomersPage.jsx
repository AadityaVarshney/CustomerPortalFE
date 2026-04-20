import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  Building2, Plus, ChevronLeft, Calendar, Users,
  AlertCircle, Loader2, Trash2, Mail, Palette,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/lib/axios'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { formatDateTime, cn, getInitials } from '@/lib/utils'

const fetchWorkspaces = async () => { const { data } = await api.get('/workspaces'); return data }
const fetchWorkspace = async (id) => { const { data } = await api.get(`/workspaces/${id}`); return data }
const fetchWorkspaceMembers = async (id) => { const { data } = await api.get(`/workspaces/${id}/members`); return data }
const createWorkspace = async (payload) => { const { data } = await api.post('/workspaces', payload); return data }
const deleteMember = async ({ workspaceId, userId }) => { const { data } = await api.delete(`/workspaces/${workspaceId}/members/${userId}`); return data }

function useWorkspaces() { return useQuery({ queryKey: ['workspaces'], queryFn: fetchWorkspaces }) }
function useWorkspace(id) { return useQuery({ queryKey: ['workspaces', id], queryFn: () => fetchWorkspace(id), enabled: !!id }) }
function useWorkspaceMembers(id) { return useQuery({ queryKey: ['workspaces', id, 'members'], queryFn: () => fetchWorkspaceMembers(id), enabled: !!id }) }

const createSchema = z.object({ name: z.string().min(2, 'At least 2 characters').max(200) })

function CreateWorkspaceModal({ onClose, onSuccess }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(createSchema) })
  const qc = useQueryClient()
  const addToast = useUIStore((s) => s.addToast)
  const mutation = useMutation({
    mutationFn: createWorkspace,
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ['workspaces'] }); addToast({ type: 'success', title: 'Workspace created' }); onSuccess(data) },
    onError: () => addToast({ type: 'error', title: 'Failed to create workspace' }),
  })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 bg-card border border-white/[0.08] rounded-2xl shadow-glass p-6">
        <h2 className="text-lg font-display font-bold text-foreground mb-5">New Customer Workspace</h2>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Workspace Name *</label>
            <input {...register('name')} placeholder="e.g. Acme Corporation" autoFocus
              className="w-full px-3 py-2.5 rounded-xl bg-accent/50 border border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50" />
            {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting || mutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {(isSubmitting || mutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const ROLE_COLORS = {
  CUSTOMER_ADMIN: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  customer_admin: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  CUSTOMER_USER:  'bg-blue-500/15 text-blue-400 border-blue-500/20',
  customer_user:  'bg-blue-500/15 text-blue-400 border-blue-500/20',
}
function RoleBadge({ role }) {
  return (
    <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full border capitalize',
      ROLE_COLORS[role] ?? 'bg-accent text-muted-foreground border-transparent')}>
      {role?.replace(/_/g, ' ')?.toLowerCase()}
    </span>
  )
}

export function CustomersListPage() {
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.role)
  const canCreate = role === '3sc_admin'
  const [showCreate, setShowCreate] = useState(false)
  const { data, isLoading } = useWorkspaces()
  const workspaces = Array.isArray(data) ? data : (data?.items ?? data?.content ?? [])

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Customer Workspaces</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? '…' : `${workspaces.length} workspace${workspaces.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {canCreate && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> New Workspace
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-44 bg-accent rounded-2xl animate-pulse" />)}
        </div>
      ) : workspaces.length === 0 ? (
        <div className="glass-card rounded-2xl flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm font-medium text-foreground">No customer workspaces yet</p>
          {canCreate && (
            <button onClick={() => setShowCreate(true)} className="mt-4 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm hover:bg-primary/20 transition-colors">
              Create first workspace
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map((ws) => (
            <Link key={ws.id} to={String(ws.id)}
              className="glass-card glass-card-hover rounded-2xl p-5 flex flex-col gap-4 group transition-all duration-200">
              <div className="flex items-start gap-3">
                {ws.logoUrl ? (
                  <img src={ws.logoUrl} alt={ws.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white text-sm font-bold"
                    style={{ backgroundColor: ws.primaryColor || '#6366f1' }}>
                    {getInitials(ws.name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">{ws.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Users className="w-3 h-3" />{ws.memberCount ?? 0} member{ws.memberCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              {(ws.primaryColor || ws.accentColor) && (
                <div className="flex items-center gap-2">
                  <Palette className="w-3 h-3 text-muted-foreground" />
                  {ws.primaryColor && <span className="w-4 h-4 rounded-full border border-white/10 shrink-0" style={{ backgroundColor: ws.primaryColor }} />}
                  {ws.accentColor && <span className="w-4 h-4 rounded-full border border-white/10 shrink-0" style={{ backgroundColor: ws.accentColor }} />}
                  <span className="text-xs text-muted-foreground">Brand colours</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-auto">
                <Calendar className="w-3 h-3" />
                Created {ws.createdAt ? formatDateTime(ws.createdAt, 'MMM d, yyyy') : '—'}
              </div>
            </Link>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateWorkspaceModal
          onClose={() => setShowCreate(false)}
          onSuccess={(ws) => { setShowCreate(false); navigate(String(ws.id)) }}
        />
      )}
    </div>
  )
}

export function CustomerDetailPage() {
  const { workspaceId } = useParams()
  const role = useAuthStore((s) => s.role)
  const addToast = useUIStore((s) => s.addToast)
  const qc = useQueryClient()
  const canRemove = ['3sc_admin', 'customer_admin'].includes(role)

  const { data: workspace, isLoading: wsLoading, error: wsError } = useWorkspace(workspaceId)
  const { data: membersData, isLoading: membersLoading } = useWorkspaceMembers(workspaceId)
  const members = Array.isArray(membersData) ? membersData : (membersData?.items ?? membersData?.content ?? [])

  const removeMutation = useMutation({
    mutationFn: ({ userId }) => deleteMember({ workspaceId, userId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspaces', workspaceId, 'members'] })
      qc.invalidateQueries({ queryKey: ['workspaces', workspaceId] })
      addToast({ type: 'success', title: 'Member removed' })
    },
    onError: () => addToast({ type: 'error', title: 'Failed to remove member' }),
  })

  if (wsLoading) return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="h-8 w-40 bg-accent rounded animate-pulse" />
      <div className="h-48 bg-accent rounded-2xl animate-pulse" />
      <div className="h-64 bg-accent rounded-2xl animate-pulse" />
    </div>
  )

  if (wsError || !workspace) return (
    <div className="max-w-xl mx-auto py-20 text-center">
      <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
      <h2 className="text-lg font-display font-bold text-foreground">Workspace not found</h2>
      <Link to=".." className="text-primary text-sm mt-2 inline-block">← Back to customers</Link>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <Link to=".." className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
        <ChevronLeft className="w-4 h-4" /> Customer Workspaces
      </Link>

      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-start gap-4">
          {workspace.logoUrl ? (
            <img src={workspace.logoUrl} alt={workspace.name} className="w-14 h-14 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 text-white text-xl font-bold"
              style={{ backgroundColor: workspace.primaryColor || '#6366f1' }}>
              {getInitials(workspace.name)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-display font-bold text-foreground">{workspace.name}</h1>
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />{workspace.memberCount ?? 0} member{workspace.memberCount !== 1 ? 's' : ''}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Created {workspace.createdAt ? formatDateTime(workspace.createdAt, 'MMM d, yyyy') : '—'}
              </span>
            </div>
            {(workspace.primaryColor || workspace.accentColor) && (
              <div className="flex items-center gap-3 mt-3">
                <Palette className="w-3.5 h-3.5 text-muted-foreground" />
                {workspace.primaryColor && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-3.5 h-3.5 rounded-full inline-block border border-white/10" style={{ backgroundColor: workspace.primaryColor }} />
                    {workspace.primaryColor}
                  </span>
                )}
                {workspace.accentColor && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-3.5 h-3.5 rounded-full inline-block border border-white/10" style={{ backgroundColor: workspace.accentColor }} />
                    {workspace.accentColor}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-foreground">
            Members
            {members.length > 0 && <span className="ml-2 text-xs text-muted-foreground">{members.length}</span>}
          </h2>
        </div>
        {membersLoading ? (
          <div className="p-5 space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 bg-accent rounded-xl animate-pulse" />)}</div>
        ) : members.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">No members in this workspace.</div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {members.map((member) => (
              <div key={member.userId} className="px-5 py-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">{getInitials(member.name)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{member.email}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <RoleBadge role={member.role} />
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    Joined {member.joinedAt ? formatDateTime(member.joinedAt, 'MMM d, yyyy') : '—'}
                  </span>
                  {canRemove && (
                    <button onClick={() => removeMutation.mutate({ userId: member.userId })} disabled={removeMutation.isPending}
                      title="Remove member"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
