import { useEffect, useState } from 'react'
import { X, Sparkles, MessageSquare, GitBranch, Loader2, Copy, Check, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/axios'
import { useUIStore } from '@/stores/uiStore'
import { StatusBadge } from './StatusBadge'
import { PriorityBadge } from './PriorityBadge'
import { cn, truncate } from '@/lib/utils'
import { Link } from 'react-router-dom'

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
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="p-1.5 rounded-lg hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function ConfidenceBar({ value }) {
  const pct = Math.round(value * 100)
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

export function AIAssistDrawer({ ticketId, ticket }) {
  const closeDrawer = useUIStore((s) => s.closeDrawer)
  const addToast = useUIStore((s) => s.addToast)

  const aiAnalysis = useQuery({
    queryKey: ['ai', 'analyse', ticketId],
    queryFn: async () => {
      const { data } = await api.post(`/ai/analyse`, { ticket_id: ticketId })
      return data
    },
    enabled: !!ticketId,
    staleTime: 1000 * 60 * 5,
  })

  const suggestReply = useQuery({
    queryKey: ['ai', 'suggest-reply', ticketId],
    queryFn: async () => {
      const { data } = await api.post('/ai/suggest-reply', { ticket_id: ticketId })
      return data
    },
    enabled: !!ticketId,
    staleTime: 1000 * 60 * 5,
  })

  const similarTickets = useQuery({
    queryKey: ['ai', 'similar', ticketId],
    queryFn: async () => {
      const { data } = await api.get(`/ai/similar?ticket_id=${ticketId}&limit=5`)
      return data
    },
    enabled: !!ticketId,
    staleTime: 1000 * 60 * 10,
  })

  const ai = aiAnalysis.data
  const reply = suggestReply.data

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={closeDrawer}
      />

      {/* Panel */}
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
          <button
            onClick={closeDrawer}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Classification */}
          <Section title="Classification" icon={GitBranch}>
            {aiAnalysis.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-8 bg-accent rounded-lg animate-pulse" />)}
              </div>
            ) : ai ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Category</span>
                  <span className="text-xs font-medium text-foreground capitalize">{ai.category ?? '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Priority</span>
                  <PriorityBadge priority={ai.priority} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground">Confidence</span>
                  </div>
                  <ConfidenceBar value={ai.confidence ?? 0.75} />
                </div>
                {ai.resolution_prediction && (
                  <div className="mt-3 p-3 rounded-xl bg-accent/40">
                    <p className="text-xs text-muted-foreground mb-1">Resolution prediction</p>
                    <p className="text-sm text-foreground">{ai.resolution_prediction}</p>
                  </div>
                )}
                {ai.summary && (
                  <div className="mt-2 p-3 rounded-xl bg-primary/5 border border-primary/15">
                    <p className="text-xs text-muted-foreground mb-1">Summary</p>
                    <p className="text-sm text-foreground leading-relaxed">{ai.summary}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Analysis unavailable</p>
            )}
          </Section>

          {/* Suggested Reply */}
          <Section title="Suggested Reply" icon={MessageSquare}>
            {suggestReply.isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => <div key={i} className="h-4 bg-accent rounded animate-pulse" style={{ width: `${[85, 95, 70, 60][i-1]}%` }} />)}
              </div>
            ) : reply?.text ? (
              <div>
                <div className="relative p-3 rounded-xl bg-accent/40 border border-white/[0.06]">
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap pr-6">
                    {reply.text}
                  </p>
                  <div className="absolute top-2 right-2">
                    <CopyButton text={reply.text} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Review and edit before sending. AI suggestions may be inaccurate.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No suggestion available</p>
            )}
          </Section>

          {/* Similar tickets */}
          <Section title="Similar Tickets" icon={GitBranch} defaultOpen={false}>
            {similarTickets.isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-accent rounded-xl animate-pulse" />)}
              </div>
            ) : similarTickets.data?.items?.length ? (
              <div className="space-y-2">
                {similarTickets.data.items.map((t) => (
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
                      <p className="text-xs text-foreground truncate group-hover:text-primary transition-colors">
                        {t.title}
                      </p>
                      {t.similarity_score && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {Math.round(t.similarity_score * 100)}% similar
                        </p>
                      )}
                    </div>
                    <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No similar tickets found</p>
            )}
          </Section>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-3 border-t border-white/[0.06]">
          <button
            onClick={() => { aiAnalysis.refetch(); suggestReply.refetch(); similarTickets.refetch() }}
            disabled={aiAnalysis.isFetching}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            {aiAnalysis.isFetching
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Sparkles className="w-4 h-4" />}
            Regenerate analysis
          </button>
        </div>
      </div>
    </div>
  )
}
