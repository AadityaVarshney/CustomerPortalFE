import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import api from '@/lib/axios'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import {
  Settings, Palette, Users, Shield, Bell, Save,
  Plus, Trash2, Loader2, ChevronRight, Mail, Crown
} from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'notifications', label: 'Notifications', icon: Bell },
]

function useWorkspace() {
  return useQuery({
    queryKey: ['workspace'],
    queryFn: async () => { const { data } = await api.get('/workspace'); return data },
  })
}

function useMembers() {
  return useQuery({
    queryKey: ['workspace', 'members'],
    queryFn: async () => { const { data } = await api.get('/workspace/members'); return data },
  })
}

function GeneralTab({ workspace }) {
  const qc = useQueryClient()
  const addToast = useUIStore((s) => s.addToast)
  const { register, handleSubmit, formState: { isDirty } } = useForm({
    defaultValues: {
      name: workspace?.name ?? '',
      company: workspace?.company ?? '',
      website: workspace?.website ?? '',
      timezone: workspace?.timezone ?? 'UTC',
    },
  })

  const save = useMutation({
    mutationFn: (data) => api.patch('/workspace', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace'] })
      addToast({ type: 'success', title: 'Settings saved' })
    },
    onError: () => addToast({ type: 'error', title: 'Failed to save' }),
  })

  return (
    <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-5 max-w-lg">
      {[
        { name: 'name', label: 'Workspace Name', placeholder: 'Acme Corp' },
        { name: 'company', label: 'Company', placeholder: 'Acme Corporation Ltd' },
        { name: 'website', label: 'Website', placeholder: 'https://acme.com', type: 'url' },
      ].map(({ name, label, placeholder, type = 'text' }) => (
        <div key={name}>
          <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
          <input
            type={type}
            {...register(name)}
            placeholder={placeholder}
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-accent/50 border border-white/[0.08] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      ))}

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Timezone</label>
        <select
          {...register('timezone')}
          className="w-full px-4 py-2.5 rounded-xl text-sm bg-accent/50 border border-white/[0.08] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {['UTC', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Asia/Kolkata', 'Australia/Sydney'].map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={!isDirty || save.isPending}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save Changes
      </button>
    </form>
  )
}

function BrandingTab({ workspace }) {
  const addToast = useUIStore((s) => s.addToast)
  const qc = useQueryClient()
  const [primary, setPrimary] = useState(workspace?.brand_color ?? '#8b5cf6')
  const [accent, setAccent] = useState(workspace?.accent_color ?? '#6d28d9')

  const save = useMutation({
    mutationFn: (data) => api.patch('/workspace/branding', data),
    onSuccess: (_, vars) => {
      document.documentElement.style.setProperty('--brand-primary', vars.brand_color)
      document.documentElement.style.setProperty('--brand-accent', vars.accent_color)
      qc.invalidateQueries({ queryKey: ['workspace'] })
      addToast({ type: 'success', title: 'Branding updated' })
    },
  })

  return (
    <div className="space-y-6 max-w-lg">
      <div className="p-4 rounded-xl bg-accent/30 border border-white/[0.06] text-sm text-muted-foreground">
        Branding colors are applied across the portal as CSS variables and update in real time.
      </div>

      <div className="space-y-4">
        {[
          { label: 'Primary Brand Color', value: primary, onChange: setPrimary, key: 'brand_color' },
          { label: 'Accent Color', value: accent, onChange: setAccent, key: 'accent_color' },
        ].map(({ label, value, onChange }) => (
          <div key={label}>
            <label className="block text-sm font-medium text-foreground mb-2">{label}</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-10 h-10 rounded-xl cursor-pointer border border-white/[0.08] bg-transparent"
              />
              <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="#8b5cf6"
                className="flex-1 px-4 py-2.5 rounded-xl text-sm bg-accent/50 border border-white/[0.08] text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <div className="w-10 h-10 rounded-xl shrink-0" style={{ background: value }} />
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => save.mutate({ brand_color: primary, accent_color: accent })}
        disabled={save.isPending}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Apply Branding
      </button>
    </div>
  )
}

function MembersTab() {
  const [inviteEmail, setInviteEmail] = useState('')
  const [removeTarget, setRemoveTarget] = useState(null)
  const addToast = useUIStore((s) => s.addToast)
  const qc = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)

  const { data, isLoading } = useMembers()
  const members = data?.items ?? []

  const invite = useMutation({
    mutationFn: (email) => api.post('/workspace/members/invite', { email }),
    onSuccess: () => {
      setInviteEmail('')
      qc.invalidateQueries({ queryKey: ['workspace', 'members'] })
      addToast({ type: 'success', title: 'Invitation sent' })
    },
    onError: () => addToast({ type: 'error', title: 'Failed to send invitation' }),
  })

  const removeMember = useMutation({
    mutationFn: (id) => api.delete(`/workspace/members/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace', 'members'] })
      addToast({ type: 'success', title: 'Member removed' })
      setRemoveTarget(null)
    },
  })

  const ROLE_LABEL = { customer_admin: 'Admin', customer_user: 'Member' }
  const ROLE_ICON = { customer_admin: Crown, customer_user: Users }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Invite form */}
      <div className="glass-card rounded-2xl p-4">
        <p className="text-sm font-semibold text-foreground mb-3">Invite Member</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              onKeyDown={(e) => e.key === 'Enter' && inviteEmail && invite.mutate(inviteEmail)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-accent/50 border border-white/[0.08] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button
            onClick={() => inviteEmail && invite.mutate(inviteEmail)}
            disabled={!inviteEmail || invite.isPending}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {invite.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Invite
          </button>
        </div>
      </div>

      {/* Member list */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.06]">
          <p className="text-sm font-semibold text-foreground">Members ({members.length})</p>
        </div>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.04]">
              <div className="w-9 h-9 rounded-full bg-accent animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 bg-accent rounded animate-pulse w-1/3" />
                <div className="h-3 bg-accent rounded animate-pulse w-1/2" />
              </div>
            </div>
          ))
        ) : (
          members.map((member) => {
            const RoleIcon = ROLE_ICON[member.role] ?? Users
            const isCurrentUser = member.id === currentUser?.id
            return (
              <div key={member.id} className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.04] last:border-0 hover:bg-accent/20 transition-colors">
                <UserAvatar user={member} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{member.name}</p>
                    {isCurrentUser && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">You</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground px-2.5 py-1 rounded-lg bg-accent/50 border border-white/[0.06]">
                    <RoleIcon className="w-3 h-3" />
                    {ROLE_LABEL[member.role] ?? member.role}
                  </span>
                  {!isCurrentUser && (
                    <button
                      onClick={() => setRemoveTarget(member)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      <ConfirmDialog
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => removeMember.mutate(removeTarget?.id)}
        title={`Remove ${removeTarget?.name}?`}
        message="They will lose access to this workspace immediately."
        confirmLabel="Remove"
      />
    </div>
  )
}

export default function WorkspaceSettingsPage() {
  const [activeTab, setActiveTab] = useState('general')
  const { data: workspace, isLoading } = useWorkspace()

  const TAB_CONTENT = {
    general: <GeneralTab workspace={workspace} />,
    branding: <BrandingTab workspace={workspace} />,
    members: <MembersTab />,
    notifications: (
      <div className="text-sm text-muted-foreground py-4">
        Notification preferences coming soon.
      </div>
    ),
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Workspace Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your workspace configuration and members</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar nav */}
        <div className="lg:col-span-1">
          <div className="glass-card rounded-2xl p-2 space-y-0.5">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn('nav-item w-full', activeTab === id && 'active')}
              >
                <Icon className="w-4 h-4" />
                {label}
                <ChevronRight className={cn('w-3.5 h-3.5 ml-auto transition-opacity', activeTab === id ? 'opacity-100' : 'opacity-0')} />
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-base font-semibold text-foreground mb-5">
              {TABS.find((t) => t.id === activeTab)?.label}
            </h2>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-12 bg-accent rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              TAB_CONTENT[activeTab]
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
