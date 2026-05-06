import { MessageSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ConversationDTO } from '@/shared/api/types'

interface ConversationItemProps {
  conversation: ConversationDTO
  isActive: boolean
  onClick: () => void
}

function PlatformIcon({ platform }: { platform: string }): React.ReactElement {
  const colors: Record<string, string> = {
    telegram: 'bg-sky-500',
    whatsapp: 'bg-green-500',
  }
  const labels: Record<string, string> = {
    telegram: 'TG',
    whatsapp: 'WA',
  }
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-medium text-white ${colors[platform] ?? 'bg-gray-400'}`}
    >
      {labels[platform] ?? platform.slice(0, 2).toUpperCase()}
    </span>
  )
}

function formatTime(ms: number, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const diff = Date.now() - ms
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return t('conversation.justNow')
  if (minutes < 60) return t('conversation.minutesAgo', { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('conversation.hoursAgo', { count: hours })
  const days = Math.floor(hours / 24)
  if (days === 1) return t('conversation.yesterday')
  return t('conversation.daysAgo', { count: days })
}

export function ConversationItem({ conversation, isActive, onClick }: ConversationItemProps): React.ReactElement {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-md px-4 py-3 text-left transition-colors ${
        isActive ? 'border-l-2 border-l-primary bg-primary/10' : 'hover:bg-accent'
      }`}
    >
      <PlatformIcon platform={conversation.platform} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="truncate text-[13px] font-medium">{conversation.customerDisplayName}</span>
          <span className="shrink-0 text-[11px] text-on-surface-variant">
            {formatTime(conversation.lastMessageAtMs, t)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="truncate text-xs text-muted-foreground">
            {conversation.lastMessageText}
          </span>
          {conversation.unreadCount > 0 && (
            <span className="ml-2 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
              {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

interface ConversationListProps {
  conversations: ConversationDTO[]
  currentId: string | null
  onSelect: (id: string) => void
}

export function ConversationList({ conversations, currentId, onSelect }: ConversationListProps): React.ReactElement {
  const { t } = useTranslation()
  if (conversations.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4">
        <MessageSquare className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t('conversation.empty')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      {conversations.map((c) => (
        <ConversationItem
          key={c.conversationId}
          conversation={c}
          isActive={c.conversationId === currentId}
          onClick={() => onSelect(c.conversationId)}
        />
      ))}
    </div>
  )
}
