import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageSquare, MoreHorizontal, Tag, Check } from 'lucide-react'
import type { ConversationDTO } from '@/shared/api/types'
import { useTagStore } from '@/stores/tagStore'
import { useConversationStore } from '@/stores/conversationStore'

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

interface ConversationTagPopoverProps {
  conversationId: string
  conversationTags: string[]
  open: boolean
  onClose: () => void
}

function ConversationTagPopover({ conversationId, conversationTags, open, onClose }: ConversationTagPopoverProps): React.ReactElement | null {
  const { t } = useTranslation()
  const tags = useTagStore((s) => s.tags)
  const addTagToConversation = useConversationStore((s) => s.addTagToConversation)
  const removeTagFromConversation = useConversationStore((s) => s.removeTagFromConversation)
  const popoverRef = useRef<HTMLDivElement>(null)

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    },
    [onClose],
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, handleClickOutside])

  const handleToggleTag = (tagId: string): void => {
    if (conversationTags.includes(tagId)) {
      void removeTagFromConversation(conversationId, tagId)
    } else {
      void addTagToConversation(conversationId, tagId)
    }
  }

  if (!open) return null

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full z-50 mt-1 w-[160px] rounded-lg border border-outline-variant bg-surface-container-lowest shadow-elevated"
    >
      <div className="flex items-center gap-1.5 border-b border-surface-container-highest px-sm py-[6px]">
        <Tag className="h-3 w-3 text-on-surface-variant" />
        <span className="text-[10px] font-semibold text-on-surface-variant">{t('conversation.assignTags')}</span>
      </div>
      <div className="max-h-[150px] overflow-y-auto py-xs">
        {tags.map((tag) => {
          const isAssigned = conversationTags.includes(tag.tagId)
          return (
            <button
              key={tag.tagId}
              type="button"
              onClick={() => handleToggleTag(tag.tagId)}
              className="flex w-full items-center gap-2 px-sm py-[5px] text-left text-[11px] transition-colors hover:bg-surface-container-low"
            >
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: tag.color ?? '#94a3b8' }}
              />
              <span className="flex-1 truncate text-on-surface">{tag.name}</span>
              {isAssigned && <Check className="h-3 w-3 shrink-0 text-primary" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function ConversationItem({ conversation, isActive, onClick }: ConversationItemProps): React.ReactElement {
  const { t } = useTranslation()
  const tags = useTagStore((s) => s.tags)
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false)

  const conversationTags = conversation.tags ?? []
  const displayTags = tags.filter((tag) => conversationTags.includes(tag.tagId))

  const handleMoreClick = (e: React.MouseEvent): void => {
    e.stopPropagation()
    setTagPopoverOpen(!tagPopoverOpen)
  }

  return (
    <div className="group relative">
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
            {displayTags.slice(0, 2).map((tag) => (
              <span
                key={tag.tagId}
                className="inline-flex items-center gap-0.5 rounded-full px-[5px] py-[1px] text-[9px] font-medium"
                style={{
                  backgroundColor: `${tag.color}18`,
                  color: tag.color,
                }}
              >
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.name}
              </span>
            ))}
            {displayTags.length > 2 && (
              <span className="text-[9px] font-medium text-on-surface-variant">
                +{displayTags.length - 2}
              </span>
            )}
            {conversation.unreadCount > 0 && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-error text-[10px] font-semibold text-on-error">
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </span>
            )}
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={handleMoreClick}
        className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded text-on-surface-variant opacity-0 transition-opacity hover:bg-surface-container hover:text-foreground group-hover:opacity-100"
        title={t('conversation.assignTags')}
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>

      <ConversationTagPopover
        conversationId={conversation.conversationId}
        conversationTags={conversationTags}
        open={tagPopoverOpen}
        onClose={() => setTagPopoverOpen(false)}
      />
    </div>
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
