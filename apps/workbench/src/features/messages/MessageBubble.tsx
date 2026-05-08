import { useState } from 'react'
import { Check, CheckCheck, X, Loader2, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { MessageDTO } from '@/shared/api/types'

interface MessageBubbleProps {
  message: MessageDTO
  showTranslation: boolean
  onRetry?: (messageId: string) => void
}

function StatusIcon({ status }: { status?: MessageDTO['status'] }): React.ReactElement | null {
  switch (status) {
    case 'pending':
      return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
    case 'sent':
      return <Check className="h-3 w-3 text-muted-foreground" />
    case 'delivered':
      return <CheckCheck className="h-3 w-3 text-muted-foreground" />
    case 'read':
      return <CheckCheck className="h-3 w-3 text-blue-500" />
    case 'failed':
      return <X className="h-3 w-3 text-destructive" />
    default:
      return null
  }
}

function formatMessageTime(ms: number): string {
  const date = new Date(ms)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function MessageAvatar({ name, isOutbound }: { name: string; isOutbound: boolean }): React.ReactElement {
  if (isOutbound) {
    return (
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
        Me
      </div>
    )
  }
  return (
    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary-container text-xs font-bold text-primary">
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

export function MessageBubble({ message, showTranslation, onRetry }: MessageBubbleProps): React.ReactElement {
  const { t } = useTranslation()
  const [localShowTranslated, setLocalShowTranslated] = useState<boolean | null>(null)
  const isOutbound = message.direction === 'outbound'
  const hasTranslation = Boolean(message.translatedText)

  const effectiveShowTranslation = localShowTranslated !== null ? localShowTranslated : showTranslation
  const displayText = effectiveShowTranslation && message.translatedText
    ? message.translatedText
    : message.originalText

  const handleToggle = (): void => {
    if (!hasTranslation) return
    if (localShowTranslated === null) {
      setLocalShowTranslated(!showTranslation)
    } else {
      setLocalShowTranslated(!localShowTranslated)
    }
  }

  return (
    <div className={`flex gap-sm ${isOutbound ? 'flex-row-reverse' : ''}`}>
      <MessageAvatar name={message.senderDisplayName} isOutbound={isOutbound} />
      <div className={`flex flex-col gap-1 ${isOutbound ? 'items-end' : 'items-start'}`}>
        <div
          onClick={handleToggle}
          className={`rounded-2xl p-sm shadow-sm ${hasTranslation ? 'cursor-pointer' : ''} ${
            isOutbound
              ? message.status === 'failed'
                ? 'rounded-tr-sm bg-destructive/10 text-foreground'
                : 'rounded-tr-sm bg-primary text-primary-foreground'
              : 'rounded-tl-sm border border-surface-container-highest bg-surface-container-low text-foreground'
          } transition-all duration-200`}
        >
          {!isOutbound && effectiveShowTranslation && message.translatedText && message.originalText !== message.translatedText && (
            <p className="mb-1 text-[12px] italic text-outline-variant">
              {message.originalText}
            </p>
          )}
          {message.imageUrl && (
            <img
              src={message.imageUrl}
              alt=""
              className="mb-1.5 max-h-[200px] max-w-[260px] rounded-lg object-cover"
            />
          )}
          <p className="whitespace-pre-wrap text-[14px]">{displayText}</p>
        </div>
        <div className={`flex items-center gap-xs px-2 ${isOutbound ? 'justify-end' : 'justify-start'}`}>
          {hasTranslation && !isOutbound && (
            <span className="flex items-center gap-1 text-[10px] font-semibold tracking-wide text-outline">
              {t('message.translatedFrom')}
            </span>
          )}
          <span className="text-[10px] font-semibold tracking-wide text-outline">
            {formatMessageTime(message.createdAtMs)}
            {isOutbound && message.status === 'read' && ' • Read'}
          </span>
          {isOutbound && <StatusIcon status={message.status} />}
          {message.status === 'failed' && onRetry && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRetry(message.messageId)
              }}
              className="ml-1 flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs text-destructive hover:bg-destructive/10"
            >
              <RotateCcw className="h-3 w-3" />
              {t('common.retry')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

interface TimeSeparatorProps {
  timestamp: number
}

export function TimeSeparator({ timestamp }: TimeSeparatorProps): React.ReactElement {
  const { t } = useTranslation()
  const date = new Date(timestamp)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()

  let label: string
  if (isToday) {
    label = `Today, ${formatMessageTime(timestamp)}`
  } else if (isYesterday) {
    label = `${t('conversation.yesterday')} ${formatMessageTime(timestamp)}`
  } else {
    const isThisYear = date.getFullYear() === now.getFullYear()
    if (isThisYear) {
      label = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${formatMessageTime(timestamp)}`
    } else {
      label = `${String(date.getFullYear())}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${formatMessageTime(timestamp)}`
    }
  }

  return (
    <div className="my-2 flex justify-center">
      <span className="rounded-full bg-surface-container-highest px-3 py-1 text-[10px] font-semibold tracking-wide text-on-surface-variant">
        {label}
      </span>
    </div>
  )
}
