import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  FolderOpen, Plus, ChevronLeft, Calendar, Users,
  CheckCircle2, Clock, AlertCircle, Target, Loader2,
  ChevronDown, ChevronUp, MoreHorizontal
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/lib/axios'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { formatDateTime, formatRelativeTime, cn } from '@/lib/utils'

// ── API helpers ─────────────────────────────────────────────────────────────

const fetchProjects = async () => {
  const { data } = await api.get('/projects')
  return data
}

const fetchProject = async (id) => {
  const { data } = await api.get(`/projects/${id}`)
  return data
}

const createProject = async (payload) => {
  const { data } = await api.post('/projects', payload)
  return data
}

const addMilestone = async ({ projectId, ...payload }) => {
  const { data } = await api.post(`/projects/${projectId}/milestones`, payload)
  return data
}

// ── Hooks ────────────────────────────────────────────────────────────────────

function useProjects() {
  return useQuery({ queryKey: ['projects'], queryFn: fetchProjects })
}

function useProject(id) {
  return useQuery({ queryKey: ['projects', id], queryFn: () => fetchProject(id), enabled: !!id })
}

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  on_hold: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  completed: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/20',
}

function StatusChip({ status }) {
  return (
    <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full border capitalize', STATUS_COLORS[status] ?? 'bg-accent text-muted-foreground border-transparent')}>
      {status?.replace(/_/g, ' ')}
    </span>
  )
}

function ProgressBar({ value }) {
  const pct = Math.min(100, Math.max(0, value ?? 0))
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-primary'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-accent overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground w-8 text-right shrink-0">{pct}%</span>
    </div>
  )
}

// ── Projects List Page ────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(3, 'At least 3 characters'),
  description: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
})

function CreateProjectModal({ onClose, onSuccess }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(createSchema) })
  const qc = useQueryClient()
  const addToast = useUIStore((s) => s.addToast)

  const mutation = useMutation({
    mutationFn: createProject,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      addToast({ type: 'success', title: 'Project created' })
      onSuccess(data)
    },
    onError: () => addToast({ type: 'error', title: 'Failed to create project' }),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 bg-card border border-white/[0.08] rounded-2xl shadow-glass p-6">
        <h2 className="text-lg font-display font-bold text-foreground mb-5">New Project</h2>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Name *</label>
            <input {...register('name')} placeholder="Project name" className="w-full px-3 py-2.5 rounded-xl bg-accent/50 border border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50" />
            {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
            <textarea {...register('description')} rows={3} placeholder="Brief description…" className="w-full px-3 py-2.5 rounded-xl bg-accent/50 border border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Start date</label>
              <input type="date" {...register('start_date')} className="w-full px-3 py-2 rounded-xl bg-accent/50 border border-white/[0.08] text-sm text-foreground outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">End date</label>
              <input type="date" {...register('end_date')} className="w-full px-3 py-2 rounded-xl bg-accent/50 border border-white/[0.08] text-sm text-foreground outline-none focus:border-primary/50" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function ProjectsListPage() {
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.role)
  const canCreate = ['3sc_lead', '3sc_admin'].includes(role)
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading } = useProjects()
  const projects = data?.items ?? data?.content ?? (Array.isArray(data) ? data : [])

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{isLoading ? '…' : `${projects.length} projects`}</p>
        </div>
        {canCreate && (
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> New Project
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 bg-accent rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="glass-card rounded-2xl flex flex-col items-center justify-center py-20 text-center">
          <FolderOpen className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm font-medium text-foreground">No projects yet</p>
          {canCreate && (
            <button onClick={() => setShowCreate(true)} className="mt-4 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm hover:bg-primary/20 transition-colors">
              Create first project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={project.id}
              className="glass-card glass-card-hover rounded-2xl p-5 flex flex-col gap-4 group transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  <FolderOpen className="w-5 h-5 text-primary" />
                </div>
                <StatusChip status={project.status} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">{project.name}</h3>
                {project.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
                )}
              </div>
              {project.progress !== undefined && (
                <ProgressBar value={project.progress} />
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {project.end_date && (
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDateTime(project.end_date).split(' ')[0]}</span>
                )}
                {project.milestones?.length > 0 && (
                  <span className="flex items-center gap-1"><Target className="w-3 h-3" />{project.milestones.length} milestones</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onSuccess={(p) => { setShowCreate(false); navigate(p.id) }}
        />
      )}
    </div>
  )
}

// ── Project Detail Page ───────────────────────────────────────────────────────

const milestoneSchema = z.object({
  title: z.string().min(3),
  due_date: z.string().optional(),
  description: z.string().optional(),
})

function MilestoneItem({ milestone }) {
  const done = milestone.status === 'completed'
  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/[0.04] last:border-0">
      <div className={cn('w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5', done ? 'bg-emerald-500/15 text-emerald-400' : 'bg-accent text-muted-foreground')}>
        {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3 h-3" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', done ? 'line-through text-muted-foreground' : 'text-foreground')}>{milestone.title}</p>
        {milestone.description && <p className="text-xs text-muted-foreground mt-0.5">{milestone.description}</p>}
        {milestone.due_date && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Due {formatDateTime(milestone.due_date).split(' ')[0]}
          </p>
        )}
      </div>
      <StatusChip status={milestone.status ?? 'pending'} />
    </div>
  )
}

export function ProjectDetailPage() {
  const { projectId } = useParams()
  const role = useAuthStore((s) => s.role)
  const addToast = useUIStore((s) => s.addToast)
  const qc = useQueryClient()
  const canEdit = ['3sc_lead', '3sc_admin'].includes(role)
  const [showMilestoneForm, setShowMilestoneForm] = useState(false)

  const { data: project, isLoading, error } = useProject(projectId)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(milestoneSchema) })

  const milestonesMutation = useMutation({
    mutationFn: (payload) => addMilestone({ projectId, ...payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', projectId] })
      addToast({ type: 'success', title: 'Milestone added' })
      reset()
      setShowMilestoneForm(false)
    },
    onError: () => addToast({ type: 'error', title: 'Failed to add milestone' }),
  })

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="h-8 w-40 bg-accent rounded animate-pulse" />
        <div className="h-48 bg-accent rounded-2xl animate-pulse" />
        <div className="h-64 bg-accent rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
        <h2 className="text-lg font-display font-bold text-foreground">Project not found</h2>
        <Link to=".." className="text-primary text-sm mt-2 inline-block">← Back to projects</Link>
      </div>
    )
  }

  const milestones = project.milestones ?? []
  const doneMilestones = milestones.filter((m) => m.status === 'completed').length

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Back */}
      <Link to=".." className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
        <ChevronLeft className="w-4 h-4" /> Projects
      </Link>

      {/* Header */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <FolderOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">{project.name}</h1>
              {project.description && <p className="text-sm text-muted-foreground mt-1">{project.description}</p>}
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <StatusChip status={project.status} />
                {project.start_date && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {formatDateTime(project.start_date).split(' ')[0]} → {project.end_date ? formatDateTime(project.end_date).split(' ')[0] : 'TBD'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        {project.progress !== undefined && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>Overall progress</span><span>{project.progress}%</span>
            </div>
            <ProgressBar value={project.progress} />
          </div>
        )}
      </div>

      {/* Milestones */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Milestones
            {milestones.length > 0 && (
              <span className="ml-2 text-xs text-muted-foreground">{doneMilestones}/{milestones.length}</span>
            )}
          </h2>
          {canEdit && (
            <button
              onClick={() => setShowMilestoneForm((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add milestone
            </button>
          )}
        </div>

        {showMilestoneForm && (
          <form onSubmit={handleSubmit((d) => milestonesMutation.mutate(d))} className="px-5 py-4 border-b border-white/[0.06] bg-accent/20 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <input {...register('title')} placeholder="Milestone title *" className="w-full px-3 py-2 rounded-xl bg-accent/50 border border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50" />
                {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title.message}</p>}
              </div>
              <input type="date" {...register('due_date')} className="px-3 py-2 rounded-xl bg-accent/50 border border-white/[0.08] text-sm text-foreground outline-none focus:border-primary/50" />
              <input {...register('description')} placeholder="Description (optional)" className="px-3 py-2 rounded-xl bg-accent/50 border border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={isSubmitting} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />} Save
              </button>
              <button type="button" onClick={() => { setShowMilestoneForm(false); reset() }} className="px-4 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">Cancel</button>
            </div>
          </form>
        )}

        <div className="px-5">
          {milestones.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No milestones yet.</div>
          ) : (
            milestones.map((m) => <MilestoneItem key={m.id} milestone={m} />)
          )}
        </div>
      </div>
    </div>
  )
}
