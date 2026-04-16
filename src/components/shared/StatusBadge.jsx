import { cn } from '@/lib/utils'

const STATUS_CONFIG = {
  OPEN: { label: 'Open', className: 'badge-open' },
  ACKNOWLEDGED: { label: 'Acknowledged', className: 'badge-acknowledged' },
  IN_PROGRESS: { label: 'In Progress', className: 'badge-in_progress' },
  RESOLVED: { label: 'Resolved', className: 'badge-resolved' },
  CLOSED: { label: 'Closed', className: 'badge-closed' },
  ESCALATED: { label: 'Escalated', className: 'badge-escalated' },
}

export function StatusBadge({ status, className }) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'badge-closed' }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        config.className,
        className,
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80" />
      {config.label}
    </span>
  )
}
