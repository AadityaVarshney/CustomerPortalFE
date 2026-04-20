import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { subDays, format } from 'date-fns'
import {
  BarChart3, TrendingUp, Clock, CheckCircle, Download, Loader2
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'
import api from '@/lib/axios'
import { cn } from '@/lib/utils'

// ── Date helpers ──────────────────────────────────────────────────────────────

const DATE_RANGES = [
  { label: '7d', value: 7 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
]

function toIso(date) {
  return format(date, 'yyyy-MM-dd')
}

function getRange(days) {
  const to = new Date()
  const from = subDays(to, days)
  return { from: toIso(from), to: toIso(to) }
}

// ── API hooks ─────────────────────────────────────────────────────────────────

function useIssueTrends(days) {
  const { from, to } = getRange(days)
  return useQuery({
    queryKey: ['analytics', 'issue-trends', days],
    queryFn: async () => {
      const { data } = await api.get(`/analytics/issue-trends?from=${from}&to=${to}&groupBy=day`)
      return data
    },
  })
}

function useResolutionTime(days) {
  const { from, to } = getRange(days)
  return useQuery({
    queryKey: ['analytics', 'resolution-time', days],
    queryFn: async () => {
      const { data } = await api.get(`/analytics/resolution-time?from=${from}&to=${to}`)
      return data
    },
  })
}

function useSlaCompliance(days) {
  const { from, to } = getRange(days)
  return useQuery({
    queryKey: ['analytics', 'sla', days],
    queryFn: async () => {
      const { data } = await api.get(`/analytics/sla?from=${from}&to=${to}`)
      return data
    },
  })
}

function useCsat(days) {
  const { from, to } = getRange(days)
  return useQuery({
    queryKey: ['analytics', 'csat', days],
    queryFn: async () => {
      const { data } = await api.get(`/analytics/csat?from=${from}&to=${to}`)
      return data
    },
  })
}

function useAgentPerformance(days) {
  const { from, to } = getRange(days)
  return useQuery({
    queryKey: ['analytics', 'agent-performance', days],
    queryFn: async () => {
      const { data } = await api.get(`/analytics/agent-performance?from=${from}&to=${to}`)
      return data
    },
  })
}

// ── UI helpers ────────────────────────────────────────────────────────────────

const CHART_COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  fontSize: '12px',
}

function StatCard({ icon: Icon, label, value, delta, color, isLoading }) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="mt-4">
        {isLoading
          ? <div className="h-8 w-20 bg-accent rounded animate-pulse" />
          : <p className="text-3xl font-display font-bold text-foreground">{value ?? '—'}</p>
        }
        <p className="text-sm text-muted-foreground mt-1">{label}</p>
        {delta !== undefined && (
          <p className={cn('text-xs mt-1', delta >= 0 ? 'text-emerald-400' : 'text-red-400')}>
            {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}% vs prev period
          </p>
        )}
      </div>
    </div>
  )
}

function SectionCard({ title, children, isLoading }) {
  return (
    <div className="glass-card rounded-2xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {isLoading ? (
        <div className="h-48 bg-accent rounded-xl animate-pulse" />
      ) : (
        children
      )}
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function AnalyticsDashboard() {
  const [days, setDays] = useState(30)

  const trends = useIssueTrends(days)
  const resolution = useResolutionTime(days)
  const sla = useSlaCompliance(days)
  const csat = useCsat(days)
  const agents = useAgentPerformance(days)

  const trendData = Array.isArray(trends.data) ? trends.data : []
  const resolutionData = Array.isArray(resolution.data) ? resolution.data : []
  const slaData = Array.isArray(sla.data) ? sla.data : []
  const csatData = csat.data ?? {}
  const agentData = Array.isArray(agents.data) ? agents.data : []

  // Derive KPIs
  const totalTickets = trendData.reduce((acc, p) => acc + (p.count ?? p.value ?? 0), 0)
  const avgResolutionHours = resolutionData.length
    ? (resolutionData.reduce((acc, p) => acc + (p.avg_hours ?? p.average_hours ?? 0), 0) / resolutionData.length).toFixed(1)
    : null
  const slaCompliance = slaData.length
    ? (slaData.reduce((acc, p) => acc + (p.compliance_rate ?? p.rate ?? 0), 0) / slaData.length * 100).toFixed(0)
    : null
  const csatScore = csatData.score ?? csatData.average_score ?? null

  const handleExport = async () => {
    try {
      const { from, to } = getRange(days)
      const resp = await api.post('/analytics/export', { report_type: 'tickets', from, to, format: 'csv' }, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([resp.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `analytics_${from}_to_${to}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // silent — export is best-effort
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Support performance overview</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-accent/50 border border-white/[0.06]">
            {DATE_RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setDays(r.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  days === r.value ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground border border-white/[0.06] hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BarChart3} label="Total Tickets" value={totalTickets || null} color="bg-blue-500/15 text-blue-400" isLoading={trends.isLoading} />
        <StatCard icon={Clock} label="Avg Resolution" value={avgResolutionHours ? `${avgResolutionHours}h` : null} color="bg-amber-500/15 text-amber-400" isLoading={resolution.isLoading} />
        <StatCard icon={TrendingUp} label="SLA Compliance" value={slaCompliance ? `${slaCompliance}%` : null} color="bg-emerald-500/15 text-emerald-400" isLoading={sla.isLoading} />
        <StatCard icon={CheckCircle} label="CSAT Score" value={csatScore ? csatScore.toFixed(1) : null} color="bg-purple-500/15 text-purple-400" isLoading={csat.isLoading} />
      </div>

      {/* Ticket Trends */}
      <SectionCard title="Ticket Volume" isLoading={trends.isLoading}>
        {trendData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No data for this period.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line type="monotone" dataKey={trendData[0] && Object.keys(trendData[0]).find(k => k !== 'date') || 'count'} stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Resolution Time */}
        <SectionCard title="Resolution Time (hours)" isLoading={resolution.isLoading}>
          {resolutionData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No data for this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={resolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="category" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="avg_hours" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        {/* Agent Performance */}
        <SectionCard title="Agent Performance" isLoading={agents.isLoading}>
          {agentData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No data for this period.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
              {agentData.map((agent, i) => (
                <div key={agent.agent_id ?? i} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-24 truncate shrink-0">{agent.agent_name ?? `Agent ${i + 1}`}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-accent overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(100, (agent.resolved_count ?? 0) / (agentData[0]?.resolved_count || 1) * 100)}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right shrink-0">{agent.resolved_count ?? 0}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
