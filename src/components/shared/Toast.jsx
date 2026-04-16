import { createPortal } from 'react-dom'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'

const TOAST_CONFIG = {
  success: {
    icon: CheckCircle,
    className: 'border-emerald-500/30 bg-emerald-500/10',
    iconClass: 'text-emerald-400',
  },
  error: {
    icon: AlertCircle,
    className: 'border-red-500/30 bg-red-500/10',
    iconClass: 'text-red-400',
  },
  warning: {
    icon: AlertTriangle,
    className: 'border-amber-500/30 bg-amber-500/10',
    iconClass: 'text-amber-400',
  },
  info: {
    icon: Info,
    className: 'border-blue-500/30 bg-blue-500/10',
    iconClass: 'text-blue-400',
  },
}

function ToastItem({ toast }) {
  const removeToast = useUIStore((s) => s.removeToast)
  const config = TOAST_CONFIG[toast.type] ?? TOAST_CONFIG.info
  const Icon = config.icon

  return (
    <div
      className={cn(
        'flex items-start gap-3 w-full max-w-sm rounded-xl border p-4',
        'glass-card shadow-glass animate-fade-in',
        config.className,
      )}
    >
      <Icon className={cn('w-5 h-5 mt-0.5 shrink-0', config.iconClass)} />
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="text-sm font-semibold text-foreground">{toast.title}</p>
        )}
        {toast.description && (
          <p className="text-sm text-muted-foreground mt-0.5">{toast.description}</p>
        )}
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts)

  if (toasts.length === 0) return null

  return createPortal(
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>,
    document.body,
  )
}
