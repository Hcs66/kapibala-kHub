import { useTranslation } from 'react-i18next'
import { useDashboardStore } from '@/stores/dashboardStore'
import {
  Sparkles,
  MessageSquare,
  FileText,
  Calendar,
  Send,
  Package,
  CreditCard,
  ArrowUpRight,
  XCircle,
} from 'lucide-react'
import type { NextActionType } from '../types'

const ACTION_ICONS: Record<NextActionType, React.ReactNode> = {
  reply: <MessageSquare className="h-4 w-4" />,
  send_quote: <FileText className="h-4 w-4" />,
  schedule_demo: <Calendar className="h-4 w-4" />,
  followup: <Send className="h-4 w-4" />,
  send_sample: <Package className="h-4 w-4" />,
  request_payment: <CreditCard className="h-4 w-4" />,
  escalate: <ArrowUpRight className="h-4 w-4" />,
  close_lost: <XCircle className="h-4 w-4" />,
  send_catalog: <FileText className="h-4 w-4" />,
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 90) return 'text-green-600 bg-green-50'
  if (confidence >= 75) return 'text-blue-600 bg-blue-50'
  if (confidence >= 60) return 'text-amber-600 bg-amber-50'
  return 'text-slate-600 bg-slate-50'
}

export function NextActions(): React.ReactElement {
  const { t } = useTranslation()
  const nextActions = useDashboardStore((s) => s.nextActions)

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/[0.03] p-md shadow-sm">
      <div className="mb-md flex items-center gap-xs">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-base font-semibold text-foreground">
          {t('dashboard.nextActions.title')}
        </h2>
      </div>

      <div className="space-y-sm">
        {nextActions.slice(0, 4).map((action) => (
          <div
            key={action.actionId}
            className="rounded-md border border-border bg-card p-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-xs flex items-center justify-between">
              <div className="flex items-center gap-xs">
                <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary">
                  {ACTION_ICONS[action.type]}
                </span>
                <span className="text-sm font-medium text-foreground">
                  {action.label}
                </span>
              </div>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${getConfidenceColor(action.confidence)}`}
              >
                {action.confidence}%
              </span>
            </div>

            <p className="mb-xs text-xs text-muted-foreground line-clamp-2">
              {action.description}
            </p>

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {action.leadName}
              </span>
              <button
                type="button"
                className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {t('dashboard.nextActions.execute')}
              </button>
            </div>
          </div>
        ))}

        {nextActions.length === 0 && (
          <p className="py-md text-center text-sm text-muted-foreground">
            {t('dashboard.nextActions.empty')}
          </p>
        )}
      </div>
    </div>
  )
}
