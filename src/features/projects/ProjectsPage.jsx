import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import api from '@/lib/axios'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { formatDateTime, formatRelativeTime, cn } from '@/lib/utils'
import {
  FolderOpen, Calendar, Users, CheckSquare,
  AlertCircle, ChevronRight, Activity, Clock, ArrowLeft
} from 'lucide-react'

function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => { const { data } = await api.get('/projects'); return data },
  })
}

function useProject(id) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: async () => { const { data } = await api.get(`/projects/${id}`); return data },
    enabled: !!id,
  })
}

function useMilestones(projectId) {
  return useQuery({
    queryKey: ['projects', projectId, 'milestones'],
    queryFn: async () => { const { data } = await api.get(`/projects/${projectId}/milestones`); return data },
    enabled: !!projectId,
  })
}

const RAG_CONFIG = {
  green: { label: 'On Track', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-500' },
  amber: { label: 'At Risk', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30', dot: 'bg-amber-500' },
  red: { label: 'Off Track', className: 'bg-red-500/15 text-red-400 border-red-500/30', dot: 'bg-red-500' },
}

function RAGBadge({ status }) {
  const config = RAG_CONFIG[status] ?? RAG_CONFIG.green
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border', config.className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  )
}

function ProjectCard({ project }) {
  const progress = project.milestones_total > 0
    ? Math.round((project.milestones_completed / project.milestones_total) * 100) : 0

  return (
    <Link
      to={project.id}
      className="glass-card glass-card-hover rounded-2xl p-5 block group"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <FolderOpen className="w-5 h-5 text-primary" />
        </div>
        <RAGBadge status={project.rag_status} />
      </div>

      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
        {project.name}
      </h3>
      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{project.description}</p>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span>Milestones</span>
          <span>{project.milestones_completed ?? 0}/{project.milestones_total ?? 0}</span>
        </div>
        <div className="h-1.5 rounded-full bg-accent overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{project.open_issues ?? 0} open issues</span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          <span>{project.target_date ? formatDateTime(project.target_date, 'MMM d, yyyy') : 'No date'}</span>
        </div>
      </div>
    </Link>
  )
}

export function ProjectsListPage() {
  const { data, isLoading } = useProjects()
  const projects = data?.items ?? []

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Projects</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track your active projects and milestones</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-5 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-accent animate-pulse" />
              <div className="h-5 bg-accent rounded animate-pulse w-2/3" />
              <div className="h-3 bg-accent rounded animate-pulse" />
              <div className="h-3 bg-accent rounded animate-pulse w-4/5" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="glass-card rounded-2xl py-20 text-center">
          <FolderOpen className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <p className="font-medium text-foreground">No projects yet</p>
          <p className="text-sm text-muted-foreground mt-1">Projects created by your team will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}
    </div>
  )
}

export function ProjectDetailPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { data: project, isLoading } = useProject(projectId)
  const { data: milestonesData } = useMilestones(projectId)
  const milestones = milestonesData?.items ?? []

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="h-8 w-48 bg-accent rounded animate-pulse" />
        <div className="h-48 glass-card rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (!project) return null

  const progress = project.milestones_total > 0
    ? Math.round((project.milestones_completed / project.milestones_total) * 100) : 0

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Projects
      </button>

      {/* Header card */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-display font-bold text-foreground">{project.name}</h1>
              <RAGBadge status={project.rag_status} />
            </div>
            <p className="text-muted-foreground">{project.description}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { icon: CheckSquare, label: 'Milestones', value: `${project.milestones_completed ?? 0}/${project.milestones_total ?? 0}` },
            { icon: AlertCircle, label: 'Open Issues', value: project.open_issues ?? 0 },
            { icon: Calendar, label: 'Target Date', value: project.target_date ? formatDateTime(project.target_date, 'MMM d, yyyy') : '—' },
            { icon: Clock, label: 'Last Updated', value: formatRelativeTime(project.updated_at) },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-accent/40 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <p className="text-sm font-semibold text-foreground">{value}</p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-semibold text-foreground">{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-accent overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Milestones */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-foreground">Milestones</h2>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {milestones.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No milestones defined</div>
          ) : (
            milestones.map((m) => (
              <div key={m.id} className="flex items-start gap-4 px-6 py-4">
                <div className={cn(
                  'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5',
                  m.completed
                    ? 'bg-emerald-500 border-emerald-500'
                    : 'border-border bg-transparent',
                )}>
                  {m.completed && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium', m.completed ? 'text-muted-foreground line-through' : 'text-foreground')}>
                    {m.title}
                  </p>
                  {m.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {m.due_date && (
                    <p className="text-xs text-muted-foreground">{formatDateTime(m.due_date, 'MMM d')}</p>
                  )}
                  {m.completed_at && (
                    <p className="text-xs text-emerald-400 mt-0.5">✓ {formatRelativeTime(m.completed_at)}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
