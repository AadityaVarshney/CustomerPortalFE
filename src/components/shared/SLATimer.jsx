import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseISO, differenceInSeconds } from 'date-fns'

function formatCountdown(totalSeconds) {
  if (totalSeconds <= 0) return 'Breached'
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function SLATimer({ due_at, breached = false, className }) {
  const [secondsLeft, setSecondsLeft] = useState(0)

  useEffect(() => {
    if (!due_at) return
    const update = () => {
      const diff = differenceInSeconds(parseISO(due_at), new Date())
      setSecondsLeft(diff)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [due_at])

  const isBreached = breached || secondsLeft <= 0
  const isWarning = !isBreached && secondsLeft <= 3600 // under 1 hour
  const isCritical = !isBreached && secondsLeft <= 900 // under 15 min

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full border',
        isBreached && 'bg-red-500/15 text-red-400 border-red-500/30',
        isCritical && !isBreached && 'bg-red-500/10 text-red-400 border-red-500/20 sla-warning',
        isWarning && !isCritical && 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        !isWarning && !isBreached && 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        className,
      )}
    >
      <Clock className="w-3 h-3" />
      {!due_at ? '—' : isBreached ? 'SLA Breached' : formatCountdown(secondsLeft)}
    </span>
  )
}
