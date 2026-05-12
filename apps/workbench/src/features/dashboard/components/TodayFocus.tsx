import { useTranslation } from 'react-i18next'
import { useDashboardStore } from '@/stores/dashboardStore'
import { CheckCircle2, Circle, Clock, AlertTriangle } from 'lucide-react'
import type { TaskPriority } from '../types'

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-blue-100 text-blue-700',
  low: 'bg-slate-100 text-slate-600',
}

const PRIORITY_DOT: Record<TaskPriority, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-blue-500',
  low: 'bg-slate-400',
}

function formatDueTime(dueAtMs: number): string {
  const diff = dueAtMs - Date.now()
  if (diff < 0) return 'Overdue'
  const hours = Math.floor(diff / 3_600_000)
  if (hours < 1) {
    const mins = Math.floor(diff / 60_000)
    return `${mins}m`
  }
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

export function TodayFocus(): React.ReactElement {
  const { t } = useTranslation()
  const tasks = useDashboardStore((s) => s.tasks)
  const completeTask = useDashboardStore((s) => s.completeTask)

  const pendingTasks = tasks.filter((task) => task.status !== 'completed')

  return (
    <div className="rounded-lg border border-border bg-card p-md shadow-sm">
      <div className="mb-md flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">
          {t('dashboard.todayFocus.title')}
        </h2>
        <span className="text-xs font-medium text-muted-foreground">
          {pendingTasks.length} {t('dashboard.todayFocus.pending')}
        </span>
      </div>

      <div className="space-y-xs">
        {pendingTasks.map((task) => {
          const isOverdue = task.dueAtMs < Date.now()
          return (
            <div
              key={task.taskId}
              className="group flex items-center gap-sm rounded-md px-sm py-xs transition-colors hover:bg-surface-container-low"
            >
              <button
                type="button"
                onClick={() => completeTask(task.taskId)}
                className="shrink-0 text-muted-foreground transition-colors hover:text-primary"
              >
                {task.status === 'in_progress' ? (
                  <Clock className="h-4 w-4 text-primary" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </button>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {task.title}
                </p>
                {task.leadName && (
                  <p className="truncate text-xs text-muted-foreground">
                    {task.leadName}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-xs">
                <span
                  className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${PRIORITY_STYLES[task.priority]}`}
                >
                  <span className={`mr-1 h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[task.priority]}`} />
                  {t(`dashboard.todayFocus.priority.${task.priority}`)}
                </span>

                <span
                  className={`flex items-center gap-0.5 text-xs font-medium ${
                    isOverdue ? 'text-destructive' : 'text-muted-foreground'
                  }`}
                >
                  {isOverdue && <AlertTriangle className="h-3 w-3" />}
                  {formatDueTime(task.dueAtMs)}
                </span>
              </div>
            </div>
          )
        })}

        {pendingTasks.length === 0 && (
          <div className="flex items-center justify-center gap-xs py-lg text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            {t('dashboard.todayFocus.allDone')}
          </div>
        )}
      </div>
    </div>
  )
}
