import { X, AlertCircle, CheckCircle, Info } from 'lucide-react'
import { useToastStore } from '@/stores/toastStore'
import type { Toast } from '@/stores/toastStore'

const iconMap = {
  error: AlertCircle,
  success: CheckCircle,
  info: Info,
}

const styleMap = {
  error: 'border-error/30 bg-error-container text-on-error-container',
  success: 'border-green-300 bg-green-50 text-green-900',
  info: 'border-primary/30 bg-primary-container text-on-surface',
}

function ToastItem({ toast }: { toast: Toast }): React.ReactElement {
  const removeToast = useToastStore((s) => s.removeToast)
  const Icon = iconMap[toast.type]

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-4 py-3 shadow-elevated animate-in slide-in-from-top-2 fade-in duration-200 ${styleMap[toast.type]}`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 text-sm">{toast.message}</span>
      <button
        type="button"
        onClick={() => removeToast(toast.id)}
        className="shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

export function ToastContainer(): React.ReactElement | null {
  const toasts = useToastStore((s) => s.toasts)

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[9999] flex flex-col items-center gap-2">
      <div className="pointer-events-auto flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </div>
    </div>
  )
}
