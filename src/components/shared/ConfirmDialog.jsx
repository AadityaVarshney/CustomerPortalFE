import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
}) {
  if (!open) return null

  const confirmClass =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-500 text-white'
      : 'bg-primary hover:bg-primary/90 text-primary-foreground'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative glass-card rounded-2xl p-6 w-full max-w-md shadow-glass animate-fade-in">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1">
            <h3 id="confirm-title" className="text-base font-semibold text-foreground">
              {title}
            </h3>
            {message && (
              <p className="mt-1.5 text-sm text-muted-foreground">{message}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => { onConfirm?.(); onClose?.() }}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors', confirmClass)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
