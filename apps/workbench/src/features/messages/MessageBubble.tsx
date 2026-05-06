import { useState } from 'react'
import { Check, CheckCheck, X, Loader2, RotateCcw } from 'lucide-react'
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

export function MessageBubble({ message, showTranslation, onRetry }: MessageBubbleProps): React.ReactElement {
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
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div
        onClick={handleToggle}
        className={`max-w-[70%] rounded-lg px-3.5 py-2.5 ${hasTranslation ? 'cursor-pointer' : ''} ${
          isOutbound
            ? message.status === 'failed'
              ? 'bg-destructive/10 text-foreground'
              : 'bg-primary text-primary-foreground'
            : 'bg-surface-container-low text-foreground'
        } transition-all duration-200`}
      >
        {!isOutbound && (
          <p className="mb-0.5 text-xs font-medium opacity-70">
            {message.senderDisplayName}
          </p>
        )}
        <p className="whitespace-pre-wrap text-sm">{displayText}</p>
        <div className={`mt-1 flex items-center gap-1 ${isOutbound ? 'justify-end' : 'justify-start'}`}>
          {hasTranslation && (
            <span className={`text-xs ${isOutbound ? 'opacity-60' : 'text-muted-foreground opacity-70'}`}>
              {effectiveShowTranslation ? '译' : '原'}
            </span>
          )}
          <span className="text-xs opacity-60">{formatMessageTime(message.createdAtMs)}</span>
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
              重试
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
  const date = new Date(timestamp)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()

  let label: string
  if (isToday) {
    label = formatMessageTime(timestamp)
  } else if (isYesterday) {
    label = `昨天 ${formatMessageTime(timestamp)}`
  } else {
    label = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${formatMessageTime(timestamp)}`
  }

  return (
    <div className="flex items-center justify-center py-2">
      <span className="rounded-full bg-surface-container px-3 py-0.5 text-[11px] text-on-surface-variant">
        {label}
      </span>
    </div>
  )
}
