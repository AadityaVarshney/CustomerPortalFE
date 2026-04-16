import { AlertTriangle, ArrowDown, ArrowUp, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

const PRIORITY_CONFIG = {
  low: {
    label: 'Low',
    icon: ArrowDown,
    className: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
  },
  medium: {
    label: 'Medium',
    icon: ArrowUp,
    className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  },
  high: {
    label: 'High',
    icon: AlertTriangle,
    className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
  critical: {
    label: 'Critical',
    icon: Zap,
    className: 'bg-red-500/15 text-red-400 border-red-500/30',
  },
}

export function PriorityBadge({ priority, className, showLabel = true }) {
  const config = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.medium
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border',
        config.className,
        className,
      )}
    >
      <Icon className="w-3 h-3" />
      {showLabel && config.label}
    </span>
  )
}
