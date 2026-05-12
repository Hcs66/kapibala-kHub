import { useTranslation } from 'react-i18next'
import { useDashboardStore } from '@/stores/dashboardStore'
import { MessageSquare } from 'lucide-react'
import { SiTelegram, SiWhatsapp } from '@icons-pack/react-simple-icons'

function formatWaitTime(waitingSinceMs: number): string {
  const diff = Date.now() - waitingSinceMs
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return '<1m'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

function getPlatformIcon(platform: string): React.ReactNode {
  switch (platform) {
    case 'telegram':
      return <SiTelegram className="h-3.5 w-3.5" color="#26A5E4" />
    case 'whatsapp':
      return <SiWhatsapp className="h-3.5 w-3.5" color="#25D366" />
    default:
      return <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
  }
}

function getWaitTimeColor(waitingSinceMs: number): string {
  const diff = Date.now() - waitingSinceMs
  const mins = Math.floor(diff / 60_000)
  if (mins > 120) return 'text-destructive font-semibold'
  if (mins > 30) return 'text-amber-600 font-medium'
  return 'text-muted-foreground'
}

export function UnreadPending(): React.ReactElement {
  const { t } = useTranslation()
  const unreadConversations = useDashboardStore((s) => s.unreadConversations)

  return (
    <div className="rounded-lg border border-border bg-card p-md shadow-sm">
      <div className="mb-md flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">
          {t('dashboard.unread.title')}
        </h2>
        <span className="text-xs font-medium text-muted-foreground">
          {unreadConversations.length} {t('dashboard.unread.conversations')}
        </span>
      </div>

      <div className="space-y-xs">
        {unreadConversations.map((conv) => (
          <div
            key={conv.conversationId}
            className="flex items-center gap-sm rounded-md px-sm py-xs transition-colors hover:bg-surface-container-low cursor-pointer"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container">
              {getPlatformIcon(conv.platform)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-xs">
                <span className="truncate text-sm font-medium text-foreground">
                  {conv.customerName}
                </span>
                {conv.unreadCount > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {conv.lastMessagePreview}
              </p>
            </div>

            <span className={`shrink-0 text-xs ${getWaitTimeColor(conv.waitingSinceMs)}`}>
              {formatWaitTime(conv.waitingSinceMs)}
            </span>
          </div>
        ))}

        {unreadConversations.length === 0 && (
          <p className="py-md text-center text-sm text-muted-foreground">
            {t('dashboard.unread.empty')}
          </p>
        )}
      </div>
    </div>
  )
}
