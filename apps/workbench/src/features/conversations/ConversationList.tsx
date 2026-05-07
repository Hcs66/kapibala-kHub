import { MessageSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ConversationDTO } from '@/shared/api/types'

interface ConversationItemProps {
  conversation: ConversationDTO
  isActive: boolean
  onClick: () => void
}

function Avatar({ name }: { name: string }): React.ReactElement {
  const initial = name.charAt(0).toUpperCase()
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-container text-sm font-bold text-primary">
      {initial}
    </div>
  )
}

function PlatformPill({ platform }: { platform: string }): React.ReactElement {
  const styles: Record<string, string> = {
    telegram: 'bg-blue-100 text-blue-800',
    whatsapp: 'bg-green-100 text-green-800',
  }
  const labels: Record<string, string> = {
    telegram: 'Telegram',
    whatsapp: 'WhatsApp',
  }
  return (
    <span
      className={`rounded px-[6px] py-[2px] text-[9px] font-semibold uppercase tracking-wide ${styles[platform] ?? 'bg-gray-100 text-gray-700'}`}
    >
      {labels[platform] ?? platform}
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
      className={`relative flex w-full gap-sm rounded-lg p-sm text-left transition-colors ${
        isActive
          ? 'border border-primary/20 bg-primary-fixed-dim/20'
          : 'border border-transparent hover:bg-surface-container-low'
      }`}
    >
      {isActive && <div className="absolute bottom-0 left-0 top-0 w-1 rounded-l-lg bg-primary" />}
      <Avatar name={conversation.customerDisplayName} />
      <div className="min-w-0 flex-1">
        <div className="mb-[2px] flex items-start justify-between">
          <span className="truncate text-sm font-semibold text-foreground">
            {conversation.customerDisplayName}
          </span>
          <span className="shrink-0 whitespace-nowrap text-[10px] font-semibold tracking-wide text-on-surface-variant">
            {formatTime(conversation.lastMessageAtMs, t)}
          </span>
        </div>
        <p className="truncate text-[13px] text-on-surface-variant">
          {conversation.lastMessageText}
        </p>
        <div className="mt-xs flex items-center gap-xs">
          <PlatformPill platform={conversation.platform} />
          {conversation.unreadCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-error text-[10px] font-semibold text-on-error">
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
    <div className="flex flex-col gap-xs">
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
