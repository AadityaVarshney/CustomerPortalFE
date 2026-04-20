import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Settings, Users, Palette, Loader2, Trash2, UserPlus, Shield } from 'lucide-react'
import api from '@/lib/axios'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { cn } from '@/lib/utils'

// ── API ───────────────────────────────────────────────────────────────────────

const fetchWorkspace = async (id) => {
  const { data } = await api.get(`/workspaces/${id}`)
  return data
}

const fetchMembers = async (id) => {
  const { data } = await api.get(`/workspaces/${id}/members`)
  return data
}

const updateBranding = async ({ id, ...payload }) => {
  const { data } = await api.patch(`/workspaces/${id}/branding`, payload)
  return data
}

const removeMember = async ({ workspaceId, userId }) => {
  await api.delete(`/workspaces/${workspaceId}/members/${userId}`)
}

const inviteUser = async (payload) => {
  const { data } = await api.post('/auth/invite', payload)
  return data
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'branding', label: 'Branding', icon: Palette },
  { key: 'members', label: 'Members', icon: Users },
]

// ── Branding Tab ──────────────────────────────────────────────────────────────

function BrandingTab({ workspace }) {
  const qc = useQueryClient()
  const addToast = useUIStore((s) => s.addToast)
  const { register, handleSubmit, reset, formState: { isDirty, isSubmitting } } = useForm({
    defaultValues: {
      logo_url: workspace?.logo_url ?? '',
      primary_color: workspace?.primary_color ?? '#8b5cf6',
      accent_color: workspace?.accent_color ?? '#06b6d4',
    },
  })

  useEffect(() => {
    if (workspace) reset({
      logo_url: workspace.logo_url ?? '',
      primary_color: workspace.primary_color ?? '#8b5cf6',
      accent_color: workspace.accent_color ?? '#06b6d4',
    })
  }, [workspace, reset])

  const mutation = useMutation({
    mutationFn: (payload) => updateBranding({ id: workspace.id, ...payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace', workspace.id] })
      addToast({ type: 'success', title: 'Branding updated' })
    },
    onError: () => addToast({ type: 'error', title: 'Failed to update branding' }),
  })

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5 max-w-lg">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Logo URL</label>
        <input
          {...register('logo_url')}
          placeholder="https://yourcompany.com/logo.png"
          className="w-full px-3 py-2.5 rounded-xl bg-accent/50 border border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50"
        />
        <p className="text-xs text-muted-foreground mt-1">Link to your company logo (PNG or SVG recommended)</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Primary Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              {...register('primary_color')}
              className="w-10 h-10 rounded-lg border border-white/[0.08] bg-transparent cursor-pointer"
            />
            <input
              {...register('primary_color')}
              placeholder="#8b5cf6"
              className="flex-1 px-3 py-2.5 rounded-xl bg-accent/50 border border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Accent Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              {...register('accent_color')}
              className="w-10 h-10 rounded-lg border border-white/[0.08] bg-transparent cursor-pointer"
            />
            <input
              {...register('accent_color')}
              placeholder="#06b6d4"
              className="flex-1 px-3 py-2.5 rounded-xl bg-accent/50 border border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50"
            />
          </div>
        </div>
      </div>
      <div className="pt-2">
        <button
          type="submit"
          disabled={!isDirty || isSubmitting}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Changes
        </button>
      </div>
    </form>
  )
}

// ── Members Tab ───────────────────────────────────────────────────────────────

function InviteForm({ workspaceId, onClose }) {
  const qc = useQueryClient()
  const addToast = useUIStore((s) => s.addToast)
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm()

  const mutation = useMutation({
    mutationFn: (d) => inviteUser({ ...d, workspace_id: workspaceId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace', workspaceId, 'members'] })
      addToast({ type: 'success', title: 'Invite sent' })
      reset()
      onClose()
    },
    onError: () => addToast({ type: 'error', title: 'Failed to send invite' }),
  })

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-5 bg-accent/20 rounded-xl border border-white/[0.06] space-y-3">
      <h4 className="text-sm font-semibold text-foreground">Invite new member</h4>
      <div className="grid grid-cols-2 gap-3">
        <input
          {...register('email', { required: true })}
          type="email"
          placeholder="Email address *"
          className="col-span-2 px-3 py-2 rounded-xl bg-accent/50 border border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50"
        />
        <input
          {...register('name')}
          placeholder="Full name"
          className="px-3 py-2 rounded-xl bg-accent/50 border border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50"
        />
        <select
          {...register('role')}
          className="px-3 py-2 rounded-xl bg-accent/50 border border-white/[0.08] text-sm text-foreground outline-none focus:border-primary/50"
        >
          <option value="customer_user">Customer User</option>
          <option value="customer_admin">Customer Admin</option>
          <option value="3sc_agent">3SC Agent</option>
          <option value="3sc_lead">3SC Lead</option>
          <option value="3sc_admin">3SC Admin</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />} Send Invite
        </button>
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">Cancel</button>
      </div>
    </form>
  )
}

function MembersTab({ workspace }) {
  const role = useAuthStore((s) => s.role)
  const addToast = useUIStore((s) => s.addToast)
  const qc = useQueryClient()
  const [showInvite, setShowInvite] = useState(false)
  const canManage = ['customer_admin', '3sc_admin'].includes(role)

  const { data, isLoading } = useQuery({
    queryKey: ['workspace', workspace.id, 'members'],
    queryFn: () => fetchMembers(workspace.id),
  })

  const members = Array.isArray(data) ? data : (data?.items ?? data?.content ?? [])

  const removeMutation = useMutation({
    mutationFn: ({ userId }) => removeMember({ workspaceId: workspace.id, userId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace', workspace.id, 'members'] })
      addToast({ type: 'success', title: 'Member removed' })
    },
    onError: () => addToast({ type: 'error', title: 'Failed to remove member' }),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{isLoading ? '…' : `${members.length} members`}</p>
        {canManage && (
          <button
            onClick={() => setShowInvite((v) => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground border border-white/[0.08] hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" /> Invite
          </button>
        )}
      </div>

      {showInvite && <InviteForm workspaceId={workspace.id} onClose={() => setShowInvite(false)} />}

      <div className="space-y-1">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-accent animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-accent rounded animate-pulse w-1/3" />
                <div className="h-3 bg-accent rounded animate-pulse w-1/4" />
              </div>
            </div>
          ))
        ) : (
          members.map((member) => (
            <div key={member.id ?? member.user_id} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-accent/30 transition-colors group">
              <UserAvatar user={member} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                <p className="text-xs text-muted-foreground truncate">{member.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent text-muted-foreground capitalize">
                  {member.role?.replace(/_/g, ' ')}
                </span>
                {canManage && (
                  <button
                    onClick={() => removeMutation.mutate({ userId: member.id ?? member.user_id })}
                    disabled={removeMutation.isPending}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function WorkspaceSettingsPage() {
  const workspaceId = useAuthStore((s) => s.workspaceId)
  const [activeTab, setActiveTab] = useState('branding')

  const { data: workspace, isLoading, error } = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => fetchWorkspace(workspaceId),
    enabled: !!workspaceId,
  })

  if (!workspaceId) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center">
        <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
        <p className="text-sm text-foreground">No workspace associated with your account.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Workspace Settings</h1>
        {workspace && <p className="text-sm text-muted-foreground mt-0.5">{workspace.name}</p>}
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-white/[0.06]">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2',
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-6">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 bg-accent rounded-xl animate-pulse" />
              ))}
            </div>
          ) : error || !workspace ? (
            <p className="text-sm text-muted-foreground">Could not load workspace settings.</p>
          ) : activeTab === 'branding' ? (
            <BrandingTab workspace={workspace} />
          ) : (
            <MembersTab workspace={workspace} />
          )}
        </div>
      </div>
    </div>
  )
}
