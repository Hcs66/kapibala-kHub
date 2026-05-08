import { useTranslation } from 'react-i18next'
import { MessageSquare, Users, TrendingUp, Clock } from 'lucide-react'
import type { TimelineEventDTO } from '@/shared/api/types'

interface TimelinePanelProps {
  events: TimelineEventDTO[]
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  conversation: <MessageSquare className="h-3.5 w-3.5" />,
  lead: <Users className="h-3.5 w-3.5" />,
  opportunity: <TrendingUp className="h-3.5 w-3.5" />,
}

const EVENT_COLORS = {
  conversation: { dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
  lead: { dot: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700' },
  opportunity: { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' },
} as const

type EventColorKey = keyof typeof EVENT_COLORS

function getEventColors(type: string): { dot: string; bg: string; text: string } {
  if (type in EVENT_COLORS) {
    return EVENT_COLORS[type as EventColorKey]
  }
  return EVENT_COLORS.conversation
}

function formatRelativeDate(ms: number): string {
  const diff = Date.now() - ms
  const days = Math.floor(diff / (24 * 60 * 60 * 1000))
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  if (days < 30) return `${Math.floor(days / 7)}周前`
  if (days < 365) return `${Math.floor(days / 30)}月前`
  return `${Math.floor(days / 365)}年前`
}

export function TimelinePanel({ events }: TimelinePanelProps): React.ReactElement {
  const { t } = useTranslation()

  if (events.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4">
        <Clock className="h-8 w-8 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">{t('sidebar.timeline.noEvents')}</p>
      </div>
    )
  }

  const sortedEvents = [...events].sort((a, b) => b.createdAtMs - a.createdAtMs)

  return (
    <div className="flex flex-col gap-0">
      {sortedEvents.map((event, idx) => {
        const colors = getEventColors(event.type)
        const isLast = idx === sortedEvents.length - 1

        return (
          <div key={event.eventId} className="relative flex gap-3 pb-4">
            <div className="flex flex-col items-center">
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${colors.bg}`}>
                <span className={colors.text}>{EVENT_ICONS[event.type]}</span>
              </div>
              {!isLast && (
                <div className="mt-1 w-px flex-1 bg-outline-variant/60" />
              )}
            </div>
            <div className="flex-1 pt-0.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[12px] font-semibold text-foreground">{event.title}</p>
                  {event.description && (
                    <p className="mt-0.5 text-[11px] text-on-surface-variant">{event.description}</p>
                  )}
                </div>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {formatRelativeDate(event.createdAtMs)}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {event.status && (
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${colors.bg} ${colors.text} border-current/20`}>
                    {event.status}
                  </span>
                )}
                {event.amount != null && (
                  <span className="rounded-full border border-outline-variant bg-surface-container-low px-2 py-0.5 text-[10px] font-semibold text-foreground">
                    ${event.amount.toLocaleString()} {event.currency}
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
