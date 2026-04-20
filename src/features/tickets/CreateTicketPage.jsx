// FIXED: Attachment upload flow corrected.
// BUG: Was calling POST /uploads BEFORE ticket creation — this endpoint does not exist on BE.
// FIX: Ticket is created first, then files are uploaded to POST /tickets/{id}/attachments.
import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useDropzone } from 'react-dropzone'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronRight, ChevronLeft, CheckCircle, Loader2,
  Upload, X, FileText, Sparkles, AlertCircle, Link2
} from 'lucide-react'
import api from '@/lib/axios'
import { useCreateTicket } from './ticketQueries'
import { useUIStore } from '@/stores/uiStore'
import { cn, TICKET_CATEGORIES, TICKET_PRIORITIES } from '@/lib/utils'

const STEPS = [
  { id: 1, title: 'Basic Info', description: 'Title and category' },
  { id: 2, title: 'Description', description: 'Describe the issue' },
  { id: 3, title: 'Attachments', description: 'Add files (optional)' },
  { id: 4, title: 'Project Link', description: 'Link to a project' },
]

const step1Schema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  category: z.string().min(1, 'Please select a category'),
  priority: z.string().min(1, 'Please select a priority'),
})

const step2Schema = z.object({
  description: z.string().min(20, 'Description must be at least 20 characters'),
})

// --- Step indicator ---
function StepIndicator({ steps, currentStep }) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, idx) => (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all duration-300',
                currentStep > step.id
                  ? 'bg-primary border-primary text-primary-foreground'
                  : currentStep === step.id
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-border text-muted-foreground bg-transparent',
              )}
            >
              {currentStep > step.id ? <CheckCircle className="w-4 h-4" /> : step.id}
            </div>
            <div className="mt-1.5 text-center hidden sm:block">
              <p className={cn('text-[11px] font-medium', currentStep === step.id ? 'text-foreground' : 'text-muted-foreground')}>
                {step.title}
              </p>
            </div>
          </div>
          {idx < steps.length - 1 && (
            <div
              className={cn(
                'flex-1 h-px w-12 sm:w-20 mx-2 transition-colors duration-300',
                currentStep > step.id ? 'bg-primary' : 'bg-border',
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// --- Step 1: Basic Info ---
function Step1({ form, onNext }) {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = form
  const [isClassifying, setIsClassifying] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState(null)
  const title = watch('title')

  const classifyWithAI = async () => {
    if (!title || title.length < 5) return
    setIsClassifying(true)
    try {
      const { data } = await api.post('/ai/classify', { title, description: '' })
      setAiSuggestion(data)
      if (data.suggestedCategory) setValue('category', data.suggestedCategory.toLowerCase())
      if (data.suggestedPriority) setValue('priority', data.suggestedPriority.toLowerCase())
    } catch {
      // AI classify is best-effort
    } finally {
      setIsClassifying(false)
    }
  }

  const categories = TICKET_CATEGORIES ?? [
    { value: 'bug', label: 'Bug' },
    { value: 'feature_request', label: 'Feature Request' },
    { value: 'question', label: 'Question' },
    { value: 'billing', label: 'Billing' },
    { value: 'other', label: 'Other' },
  ]

  const priorities = TICKET_PRIORITIES ?? [
    { value: 'low', label: 'Low', color: 'text-blue-400' },
    { value: 'medium', label: 'Medium', color: 'text-amber-400' },
    { value: 'high', label: 'High', color: 'text-orange-400' },
    { value: 'critical', label: 'Critical', color: 'text-red-400' },
  ]

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-5">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Issue Title <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <input
            {...register('title')}
            placeholder="Briefly describe your issue…"
            onBlur={classifyWithAI}
            className={cn(
              'w-full px-4 py-2.5 pr-10 rounded-xl text-sm',
              'bg-accent/50 border border-white/[0.08] text-foreground',
              'placeholder:text-muted-foreground/50',
              'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50',
              errors.title && 'border-red-500/50',
            )}
          />
          {isClassifying && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
          )}
        </div>
        {errors.title && <p className="mt-1.5 text-xs text-red-400">{errors.title.message}</p>}
      </div>

      {/* AI suggestion banner */}
      {aiSuggestion && (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20">
          <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div className="text-xs">
            <p className="text-primary font-medium">AI pre-filled category & priority</p>
            <p className="text-muted-foreground mt-0.5">
              Confidence: {Math.round((aiSuggestion.confidence ?? 0) * 100)}% — feel free to adjust below.
            </p>
          </div>
        </div>
      )}

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Category <span className="text-red-400">*</span>
        </label>
        <Controller
          name="category"
          control={form.control}
          render={({ field }) => (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => field.onChange(cat.value)}
                  className={cn(
                    'px-3 py-2.5 rounded-xl text-sm font-medium border transition-all text-left',
                    field.value === cat.value
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border/50 text-muted-foreground hover:text-foreground hover:border-white/20',
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}
        />
        {errors.category && <p className="mt-1.5 text-xs text-red-400">{errors.category.message}</p>}
      </div>

      {/* Priority */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Priority</label>
        <Controller
          name="priority"
          control={form.control}
          render={({ field }) => (
            <div className="flex gap-2 flex-wrap">
              {priorities.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => field.onChange(p.value)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all',
                    field.value === p.value
                      ? 'border-current bg-current/10 ring-2 ring-offset-1 ring-offset-background ring-current'
                      : 'border-border/50',
                    p.color,
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        />
        {errors.priority && <p className="mt-1.5 text-xs text-red-400">{errors.priority.message}</p>}
      </div>

      <div className="flex justify-end pt-2">
        <button type="submit" className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          Continue <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  )
}

// --- Step 2: Description ---
function Step2({ form, onNext, onBack }) {
  const { register, handleSubmit, formState: { errors }, watch } = form
  const [kbSuggestions, setKbSuggestions] = useState([])
  const [isSearchingKB, setIsSearchingKB] = useState(false)
  const description = watch('description')

  const searchKB = async () => {
    if (!description || description.length < 20) return
    setIsSearchingKB(true)
    try {
      const { data } = await api.get(`/ai/kb-search?query=${encodeURIComponent(description.slice(0, 200))}`)
      const articles = Array.isArray(data) ? data : (data?.articles ?? data?.items ?? [])
      setKbSuggestions(articles.slice(0, 3))
    } catch {
      // Silent fail
    } finally {
      setIsSearchingKB(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Detailed Description <span className="text-red-400">*</span>
        </label>
        <textarea
          {...register('description')}
          rows={8}
          placeholder="Please provide as much detail as possible: steps to reproduce, expected vs actual behavior, environment details, error messages…"
          onBlur={searchKB}
          className={cn(
            'w-full px-4 py-3 rounded-xl text-sm resize-none',
            'bg-accent/50 border border-white/[0.08] text-foreground',
            'placeholder:text-muted-foreground/50',
            'focus:outline-none focus:ring-2 focus:ring-primary/50',
            errors.description && 'border-red-500/50',
          )}
        />
        <div className="flex items-center justify-between mt-1.5">
          {errors.description
            ? <p className="text-xs text-red-400">{errors.description.message}</p>
            : <span />}
          <span className="text-xs text-muted-foreground">{description?.length ?? 0} chars</span>
        </div>
      </div>

      {/* KB suggestions */}
      {isSearchingKB && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          Searching Knowledge Base…
        </div>
      )}
      {kbSuggestions.length > 0 && (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs text-amber-400">
            <AlertCircle className="w-3.5 h-3.5" />
            Related articles found — these might answer your question:
          </p>
          {kbSuggestions.map((article) => (
            <a
              key={article.id}
              href={`/customer/knowledge-base/articles/${article.id}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors text-sm text-amber-300"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              {article.title}
            </a>
          ))}
          <p className="text-xs text-muted-foreground">If yes, you may not need to submit a ticket.</p>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button type="submit" className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          Continue <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  )
}

// --- Step 3: Attachments ---
function Step3({ files, setFiles, onNext, onBack }) {
  const onDrop = useCallback((accepted) => {
    const valid = accepted.filter((f) => !files.some((e) => e.name === f.name))
    setFiles((prev) => [...prev, ...valid].slice(0, 10))
  }, [files, setFiles])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 25 * 1024 * 1024,
    maxFiles: 10,
    accept: {
      'image/*': [],
      'application/pdf': [],
      'text/*': [],
      'application/zip': [],
      'application/msword': [],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [],
    },
  })

  const removeFile = (name) => setFiles((prev) => prev.filter((f) => f.name !== name))

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  }

  return (
    <div className="space-y-5">
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200',
          isDragActive ? 'border-primary bg-primary/10 scale-[1.01]' : 'border-border hover:border-primary/50 hover:bg-accent/30',
        )}
      >
        <input {...getInputProps()} />
        <Upload className={cn('w-10 h-10 mx-auto mb-3 transition-colors', isDragActive ? 'text-primary' : 'text-muted-foreground')} />
        <p className="text-sm font-medium text-foreground">
          {isDragActive ? 'Drop files here…' : 'Drag & drop files here'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          or <span className="text-primary underline-offset-2 underline">browse to upload</span>
        </p>
        <p className="text-xs text-muted-foreground mt-3">Up to 10 files · 25MB each · Images, PDFs, docs, archives</p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div key={file.name} className="flex items-center gap-3 p-3 rounded-xl bg-accent/40 border border-white/[0.06]">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
              </div>
              <button onClick={() => removeFile(file.name)} className="text-muted-foreground hover:text-red-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <p className="text-xs text-muted-foreground text-right">{files.length} / 10 files</p>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button type="button" onClick={onNext} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          Continue <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// --- Step 4: Project Link ---
function Step4({ selectedProject, setSelectedProject, onBack, onSubmit, isSubmitting }) {
  const projects = useQuery({
    queryKey: ['projects', 'active'],
    queryFn: async () => {
      const { data } = await api.get('/projects?status=active')
      return data
    },
  })

  const projectList = projects.data?.items ?? projects.data?.content ?? (Array.isArray(projects.data) ? projects.data : [])

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Link to Project <span className="text-muted-foreground text-xs font-normal">(optional)</span>
        </label>
        <p className="text-xs text-muted-foreground mb-3">
          Associating this ticket with a project helps your team track progress.
        </p>

        {projects.isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-14 bg-accent rounded-xl animate-pulse" />)}</div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
            <button
              type="button"
              onClick={() => setSelectedProject(null)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                !selectedProject ? 'border-primary/50 bg-primary/10' : 'border-border hover:border-white/[0.15] hover:bg-accent/30',
              )}
            >
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                <X className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">No project — standalone ticket</span>
            </button>

            {projectList.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => setSelectedProject(project.id)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                  selectedProject === project.id ? 'border-primary/50 bg-primary/10' : 'border-border hover:border-white/[0.15] hover:bg-accent/30',
                )}
              >
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <Link2 className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{project.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{project.description}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-gradient text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 shadow-glow"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          {isSubmitting ? 'Submitting…' : 'Submit Ticket'}
        </button>
      </div>
    </div>
  )
}

// --- Main page ---
export default function CreateTicketPage() {
  const navigate = useNavigate()
  const addToast = useUIStore((s) => s.addToast)
  const createTicket = useCreateTicket()

  const [currentStep, setCurrentStep] = useState(1)
  const [files, setFiles] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)

  const step1Form = useForm({
    resolver: zodResolver(step1Schema),
    defaultValues: { title: '', category: '', priority: 'medium' },
  })

  const step2Form = useForm({
    resolver: zodResolver(step2Schema),
    defaultValues: { description: '' },
  })

  const handleNext = () => setCurrentStep((s) => s + 1)

  // FIXED: Create ticket first, THEN upload attachments to /tickets/{id}/attachments
  // (was incorrectly calling POST /uploads before ticket creation — that endpoint doesn't exist)
  const handleSubmit = async () => {
    const step1Data = step1Form.getValues()
    const step2Data = step2Form.getValues()

    createTicket.mutate(
      {
        ...step1Data,
        ...step2Data,
        project_id: selectedProject,
        // No attachment_ids here — attachments are uploaded after the ticket ID exists
      },
      {
        onSuccess: async (ticket) => {
          // Upload attachments to the newly-created ticket's own endpoint
          if (files.length > 0 && ticket?.id) {
            try {
              const formData = new FormData()
              files.forEach((f) => formData.append('files', f))
              await api.post(`/tickets/${ticket.id}/attachments`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
              })
            } catch {
              addToast({
                type: 'warning',
                title: 'Attachment upload failed',
                description: 'Your ticket was created but attachments could not be saved.',
              })
            }
          }
          addToast({
            type: 'success',
            title: 'Ticket created!',
            description: `#${ticket.id?.slice(-6)} has been submitted.`,
          })
          navigate(`/customer/tickets/${ticket.id}`)
        },
        onError: (err) => {
          addToast({
            type: 'error',
            title: 'Failed to create ticket',
            description: err.response?.data?.message ?? 'Please try again.',
          })
        },
      },
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-foreground">Create New Ticket</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Fill in the details below and we'll get back to you as soon as possible.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex justify-center mb-10">
        <StepIndicator steps={STEPS} currentStep={currentStep} />
      </div>

      {/* Step content */}
      <div className="glass-card rounded-2xl p-6 sm:p-8">
        <div className="mb-6">
          <h2 className="text-base font-semibold text-foreground">{STEPS[currentStep - 1].title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{STEPS[currentStep - 1].description}</p>
        </div>

        {currentStep === 1 && <Step1 form={step1Form} onNext={handleNext} />}
        {currentStep === 2 && <Step2 form={step2Form} onNext={handleNext} onBack={() => setCurrentStep(1)} />}
        {currentStep === 3 && <Step3 files={files} setFiles={setFiles} onNext={() => setCurrentStep(4)} onBack={() => setCurrentStep(2)} />}
        {currentStep === 4 && (
          <Step4
            selectedProject={selectedProject}
            setSelectedProject={setSelectedProject}
            onBack={() => setCurrentStep(3)}
            onSubmit={handleSubmit}
            isSubmitting={createTicket.isPending}
          />
        )}
      </div>

      <div className="mt-4 text-center text-xs text-muted-foreground">
        Step {currentStep} of {STEPS.length}
      </div>
    </div>
  )
}
