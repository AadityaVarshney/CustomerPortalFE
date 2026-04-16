import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/axios'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { BarChart3, TrendingUp, Clock, CheckCircle, Download, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

const DATE_RANGES = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '1y', label: '1 year' },
]

const CHART_COLORS = {
  primary: '#8b5cf6',
  emerald: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  blue: '#3b82f6',
  cyan: '#06b6d4',
}

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#6b7280']

function useAnalytics(range) {
  return useQuery({
    queryKey: ['analytics', range],
    queryFn: async () => {
      const { data } = await api.get(`/analytics?range=${range}`)
      return data
    },
    staleTime: 1000 * 60 * 5,
  })
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card rounded-xl border border-white/[0.1] p-3 text-xs">
      <p className="font-medium text-foreground mb-1.5">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, delta, color, isLoading }) {
  const isPositive = delta >= 0
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
          <Icon className="w-5 h-5" />
        </div>
        {delta !== undefined && (
          <span className={cn('text-xs font-medium flex items-center gap-1', isPositive ? 'text-emerald-400' : 'text-red-400')}>
            <TrendingUp className={cn('w-3 h-3', !isPositive && 'rotate-180')} />
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      {isLoading
        ? <div className="h-8 w-20 bg-accent rounded animate-pulse" />
        : <p className="text-3xl font-display font-bold text-foreground">{value ?? '—'}</p>
      }
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </div>
  )
}

export default function AnalyticsDashboard() {
  const [range, setRange] = useState('30d')
  const { data, isLoading } = useAnalytics(range)

  const ticketTrend = data?.ticket_trend ?? []
  const statusBreakdown = data?.status_breakdown ?? []
  const categoryBreakdown = data?.category_breakdown ?? []
  const slaTimeline = data?.sla_timeline ?? []

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Support performance overview</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-accent/50 border border-white/[0.06]">
            {DATE_RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  range === r.value ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground border border-white/[0.06] hover:text-foreground hover:bg-accent/50 transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={BarChart3} label="Total Tickets" value={data?.total_tickets}
          delta={data?.total_tickets_delta} color="bg-blue-500/15 text-blue-400" isLoading={isLoading}
        />
        <StatCard
          icon={CheckCircle} label="Resolution Rate" value={data?.resolution_rate ? `${data.resolution_rate}%` : undefined}
          delta={data?.resolution_rate_delta} color="bg-emerald-500/15 text-emerald-400" isLoading={isLoading}
        />
        <StatCard
          icon={Clock} label="Avg Response Time" value={data?.avg_response_time ? `${data.avg_response_time}h` : undefined}
          delta={data?.response_time_delta} color="bg-amber-500/15 text-amber-400" isLoading={isLoading}
        />
        <StatCard
          icon={TrendingUp} label="SLA Compliance" value={data?.sla_compliance ? `${data.sla_compliance}%` : undefined}
          delta={data?.sla_compliance_delta} color="bg-violet-500/15 text-violet-400" isLoading={isLoading}
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Ticket trend — 2 cols */}
        <div className="xl:col-span-2 glass-card rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-5">Ticket Volume Over Time</h3>
          {isLoading ? (
            <div className="h-64 bg-accent/30 rounded-xl animate-pulse" />
          ) : ticketTrend.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={ticketTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="openGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="resolvedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.emerald} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.emerald} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }} />
                <Area type="monotone" dataKey="opened" name="Opened" stroke={CHART_COLORS.primary} fill="url(#openGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="resolved" name="Resolved" stroke={CHART_COLORS.emerald} fill="url(#resolvedGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Status breakdown pie — 1 col */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-5">Status Breakdown</h3>
          {isLoading ? (
            <div className="h-64 bg-accent/30 rounded-xl animate-pulse" />
          ) : statusBreakdown.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">No data</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={statusBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="status"
                  >
                    {statusBreakdown.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ background: 'hsl(224 71% 6%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {statusBreakdown.map((item, i) => (
                  <div key={item.status} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-muted-foreground capitalize">{item.status?.replace('_', ' ')}</span>
                    </div>
                    <span className="font-medium text-foreground">{item.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Category bar chart */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-5">Tickets by Category</h3>
          {isLoading ? (
            <div className="h-56 bg-accent/30 rounded-xl animate-pulse" />
          ) : categoryBreakdown.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={categoryBreakdown} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="category" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Tickets" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* SLA compliance timeline */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-5">SLA Compliance %</h3>
          {isLoading ? (
            <div className="h-56 bg-accent/30 rounded-xl animate-pulse" />
          ) : slaTimeline.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={slaTimeline} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="slaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.emerald} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.emerald} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={<CustomTooltip />} formatter={(v) => [`${v}%`, 'SLA Compliance']} />
                <Area type="monotone" dataKey="compliance" name="SLA %" stroke={CHART_COLORS.emerald} fill="url(#slaGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
