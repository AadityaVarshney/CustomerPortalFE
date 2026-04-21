import { useState } from 'react'
import {
  X, Sparkles, MessageSquare, GitBranch, Loader2,
  Copy, Check, ChevronDown, ChevronUp, ExternalLink,
  Clock, Route, AlignLeft,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/axios'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { StatusBadge } from './StatusBadge'
import { PriorityBadge } from './PriorityBadge'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'

// ─── Shared sub-components ────────────────────────────────────────────────────

function Section({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-white/[0.06] last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-accent/20 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Icon className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-5 pb-4">{children}</div>}
    </div>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return (
    <button onClick={copy} className="p-1.5 rounded-lg hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function ConfidenceBar({ value }) {
  const pct = Math.round((value ?? 0) * 100)
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-accent overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
    </div>
  )
}

// Generic text result renderer shared by multiple sections
function TextResult({ query, emptyLabel = 'No data available.' }) {
  const text = query.data?.result ?? query.data?.text
  if (query.isLoading) {
    return (
      <div className="space-y-2">
        {[100, 92, 78, 62].map((w, i) => (
          <div key={i} className="h-3.5 bg-accent rounded animate-pulse" style={{ width: `${w}%` }} />
        ))}
      </div>
    )
  }
  if (query.isError) return <p className="text-xs text-red-400">Failed to load. Retry below.</p>
  if (!text) return <p className="text-sm text-muted-foreground">{emptyLabel}</p>
  return (
    <div className="relative p-3 rounded-xl bg-accent/40 border border-white/[0.06]">
      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap pr-6">{text}</p>
      <div className="absolute top-2 right-2"><CopyButton text={text} /></div>
    </div>
  )
}

// ─── Main drawer ──────────────────────────────────────────────────────────────

export function AIAssistDrawer({ ticketId, ticket }) {
  const closeDrawer = useUIStore((s) => s.closeDrawer)
  const role = useAuthStore((s) => s.role)
  const isInternal   = ['3sc_agent', '3sc_lead', '3sc_admin'].includes(role)
  const isLeadAdmin  = ['3sc_lead', '3sc_admin'].includes(role)

  // ── 1. Classification
  // FIX: was POST /ai/analyse (doesn't exist) → correct: POST /ai/classify
  // Payload: { title, description } → returns AiClassifyResponse { suggestedCategory, suggestedPriority, suggestedTags, confidence }
  const aiClassify = useQuery({
    queryKey: ['ai', 'classify', ticketId],
    queryFn: async () => {
      const { data } = await api.post('/ai/classify', {
        title: ticket?.title ?? '',
        description: ticket?.description ?? '',
      })
      return data
    },
    enabled: !!ticketId && !!ticket,
    staleTime: 1000 * 60 * 5,
  })

  // ── 2. Suggest reply
  // FIX: was POST /ai/suggest-reply (doesn't exist) → correct: POST /ai/suggest-response
  // Payload: { ticketId } → returns AiTextResponse { result }
  const suggestReply = useQuery({
    queryKey: ['ai', 'suggest-response', ticketId],
    queryFn: async () => {
      const { data } = await api.post('/ai/suggest-response', { ticketId })
      return data
    },
    enabled: !!ticketId && isInternal,
    staleTime: 1000 * 60 * 5,
  })

  // ── 3. Thread summary (NEW — was missing entirely)
  // POST /ai/summarize-thread  { ticketId } → AiTextResponse { result }
  const threadSummary = useQuery({
    queryKey: ['ai', 'summarize-thread', ticketId],
    queryFn: async () => {
      const { data } = await api.post('/ai/summarize-thread', { ticketId })
      return data
    },
    enabled: !!ticketId,
    staleTime: 1000 * 60 * 10,
  })

  // ── 4. Ticket TL;DR (NEW — was missing entirely)
  // POST /ai/summarize-ticket  { ticketId } → AiTextResponse { result }
  const ticketSummary = useQuery({
    queryKey: ['ai', 'summarize-ticket', ticketId],
    queryFn: async () => {
      const { data } = await api.post('/ai/summarize-ticket', { ticketId })
      return data
    },
    enabled: !!ticketId,
    staleTime: 1000 * 60 * 10,
  })

  // ── 5. Auto-route (NEW — internal lead/admin only)
  // POST /ai/auto-route  { ticketId } → AiTextResponse { result }
  const autoRoute = useQuery({
    queryKey: ['ai', 'auto-route', ticketId],
    queryFn: async () => {
      const { data } = await api.post('/ai/auto-route', { ticketId })
      return data
    },
    enabled: !!ticketId && isLeadAdmin,
    staleTime: 1000 * 60 * 5,
  })

  // ── 6. Resolution time prediction (NEW — internal only)
  // POST /ai/predict-resolution-time  { ticketId } → AiPredictResolutionResponse { estimatedHours, reasoning }
  const resolutionPrediction = useQuery({
    queryKey: ['ai', 'predict-resolution-time', ticketId],
    queryFn: async () => {
      const { data } = await api.post('/ai/predict-resolution-time', { ticketId })
      return data
    },
    enabled: !!ticketId && isInternal,
    staleTime: 1000 * 60 * 5,
  })

  // ── 7. Similar tickets
  // FIX: was GET /ai/similar (doesn't exist) → correct: POST /ai/search
  // Payload: { query, limit } → returns List<TicketResponse>
  const similarTickets = useQuery({
    queryKey: ['ai', 'search-similar', ticketId],
    queryFn: async () => {
      const { data } = await api.post('/ai/search', { query: ticket?.title ?? '', limit: 5 })
      return data
    },
    enabled: !!ticketId && !!ticket?.title,
    staleTime: 1000 * 60 * 10,
  })

  const ai = aiClassify.data

  const refetchAll = () => {
    aiClassify.refetch()
    suggestReply.refetch()
    threadSummary.refetch()
    ticketSummary.refetch()
    similarTickets.refetch()
    if (isLeadAdmin) autoRoute.refetch()
    if (isInternal)  resolutionPrediction.refetch()
  }

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={closeDrawer} />

      <div className="relative ml-auto w-[420px] h-full bg-card border-l border-white/[0.08] flex flex-col shadow-glass animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">AI Assist</p>
              <p className="text-xs text-muted-foreground">Powered by Claude</p>
            </div>
          </div>
          <button onClick={closeDrawer} className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">

          {/* 1 — Ticket TL;DR */}
          <Section title="Ticket Summary" icon={AlignLeft}>
            <TextResult query={ticketSummary} emptyLabel="Summary unavailable." />
          </Section>

          {/* 2 — AI Classification */}
          <Section title="AI Classification" icon={GitBranch}>
            {aiClassify.isLoading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-8 bg-accent rounded-lg animate-pulse" />)}</div>
            ) : ai ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Category</span>
                  <span className="text-xs font-medium text-foreground capitalize">
                    {ai.suggestedCategory ?? ai.category ?? '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Priority</span>
                  <PriorityBadge priority={(ai.suggestedPriority ?? ai.priority ?? '').toLowerCase()} />
                </div>
                {ai.suggestedTags?.length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground">Tags</span>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {ai.suggestedTags.map((tag) => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-md bg-accent/60 text-muted-foreground">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground">Confidence</span>
                  </div>
                  <ConfidenceBar value={ai.confidence ?? 0} />
                </div>
              </div>
            ) : aiClassify.isError ? (
              <p className="text-xs text-red-400">Classification failed. Retry below.</p>
            ) : (
              <p className="text-sm text-muted-foreground">Analysis unavailable.</p>
            )}
          </Section>

          {/* 3 — Thread Summary */}
          <Section title="Thread Summary" icon={MessageSquare} defaultOpen={false}>
            <TextResult query={threadSummary} emptyLabel="No messages to summarize yet." />
          </Section>

          {/* 4 — Suggested Reply (internal only) */}
          {isInternal && (
            <Section title="Suggested Reply" icon={MessageSquare}>
              {suggestReply.isLoading ? (
                <div className="space-y-2">{[85, 95, 70, 60].map((w, i) => <div key={i} className="h-4 bg-accent rounded animate-pulse" style={{ width: `${w}%` }} />)}</div>
              ) : (suggestReply.data?.result ?? suggestReply.data?.text) ? (
                <div>
                  <div className="relative p-3 rounded-xl bg-accent/40 border border-white/[0.06]">
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap pr-6">
                      {suggestReply.data.result ?? suggestReply.data.text}
                    </p>
                    <div className="absolute top-2 right-2">
                      <CopyButton text={suggestReply.data.result ?? suggestReply.data.text} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Review and edit before sending. AI suggestions may be inaccurate.</p>
                </div>
              ) : suggestReply.isError ? (
                <p className="text-xs text-red-400">Could not generate reply.</p>
              ) : (
                <p className="text-sm text-muted-foreground">No suggestion available.</p>
              )}
            </Section>
          )}

          {/* 5 — Resolution Estimate (internal only) */}
          {isInternal && (
            <Section title="Resolution Estimate" icon={Clock} defaultOpen={false}>
              {resolutionPrediction.isLoading ? (
                <div className="h-8 bg-accent rounded-lg animate-pulse" />
              ) : resolutionPrediction.data ? (
                <div className="p-3 rounded-xl bg-accent/40 border border-white/[0.06]">
                  <p className="text-2xl font-display font-bold text-foreground">
                    {resolutionPrediction.data.estimatedHours ?? '—'}h
                  </p>
                  {resolutionPrediction.data.reasoning && (
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {resolutionPrediction.data.reasoning}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Prediction unavailable.</p>
              )}
            </Section>
          )}

          {/* 6 — Auto-route (lead/admin only) */}
          {isLeadAdmin && (
            <Section title="Suggested Agent" icon={Route} defaultOpen={false}>
              <TextResult query={autoRoute} emptyLabel="No routing suggestion available." />
            </Section>
          )}

          {/* 7 — Similar Tickets */}
          <Section title="Similar Tickets" icon={GitBranch} defaultOpen={false}>
            {similarTickets.isLoading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-14 bg-accent rounded-xl animate-pulse" />)}</div>
            ) : (Array.isArray(similarTickets.data) ? similarTickets.data : similarTickets.data?.items ?? []).length > 0 ? (
              <div className="space-y-2">
                {(Array.isArray(similarTickets.data) ? similarTickets.data : similarTickets.data?.items ?? []).map((t) => (
                  <Link
                    key={t.id}
                    to={`/customer/tickets/${t.id}`}
                    onClick={closeDrawer}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[10px] font-mono text-muted-foreground">#{t.id?.slice(-6)}</span>
                        <StatusBadge status={t.status} />
                      </div>
                      <p className="text-xs text-foreground truncate group-hover:text-primary transition-colors">{t.title}</p>
                    </div>
                    <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No similar tickets found.</p>
            )}
          </Section>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-3 border-t border-white/[0.06]">
          <button
            onClick={refetchAll}
            disabled={aiClassify.isFetching}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            {aiClassify.isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Regenerate all
          </button>
        </div>
      </div>
    </div>
  )
}
