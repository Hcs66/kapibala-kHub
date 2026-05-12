import { useTranslation } from 'react-i18next'
import { useDashboardStore } from '@/stores/dashboardStore'
import {
  MessageSquare,
  Send,
  CheckCircle2,
  ArrowRightLeft,
  Trophy,
  XCircle,
} from 'lucide-react'
import type { ActivityType } from '../types'

const ACTIVITY_ICONS: Record<ActivityType, React.ReactNode> = {
  message_received: <MessageSquare className="h-3.5 w-3.5 text-blue-500" />,
  message_sent: <Send className="h-3.5 w-3.5 text-green-500" />,
  task_completed: <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />,
  lead_stage_changed: <ArrowRightLeft className="h-3.5 w-3.5 text-indigo-500" />,
  opportunity_stage_changed: <ArrowRightLeft className="h-3.5 w-3.5 text-purple-500" />,
  deal_won: <Trophy className="h-3.5 w-3.5 text-amber-500" />,
  deal_lost: <XCircle className="h-3.5 w-3.5 text-red-400" />,
}

function formatTimeAgo(createdAtMs: number): string {
  const diff = Date.now() - createdAtMs
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return '<1m'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

export function RecentActivity(): React.ReactElement {
  const { t } = useTranslation()
  const recentActivity = useDashboardStore((s) => s.recentActivity)

  return (
    <div className="rounded-lg border border-border bg-card p-md shadow-sm">
      <h2 className="mb-md text-base font-semibold text-foreground">
        {t('dashboard.activity.title')}
      </h2>

      <div className="relative">
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

        <div className="space-y-sm">
          {recentActivity.slice(0, 10).map((event) => (
            <div key={event.eventId} className="relative flex items-start gap-sm pl-0">
              <div
                className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-card border border-border`}
              >
                {ACTIVITY_ICONS[event.type]}
              </div>

              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-center justify-between gap-sm">
                  <p className="truncate text-sm text-foreground">
                    {event.title}
                  </p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatTimeAgo(event.createdAtMs)}
                  </span>
                </div>
                {event.description && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {event.description}
                  </p>
                )}
              </div>
            </div>
          ))}

          {recentActivity.length === 0 && (
            <p className="py-md text-center text-sm text-muted-foreground">
              {t('dashboard.activity.empty')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
