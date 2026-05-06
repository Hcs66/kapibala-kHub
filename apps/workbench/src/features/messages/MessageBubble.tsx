import { Clock, Check, CheckCheck, X, Loader2 } from 'lucide-react'
import type { MessageDTO } from '@/shared/api/types'

interface MessageBubbleProps {
  message: MessageDTO
  showTranslation: boolean
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

export function MessageBubble({ message, showTranslation }: MessageBubbleProps): React.ReactElement {
  const isOutbound = message.direction === 'outbound'
  const displayText = showTranslation && message.translatedText
    ? message.translatedText
    : message.originalText

  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] rounded-lg px-3 py-2 ${
          isOutbound
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
        }`}
      >
        {!isOutbound && (
          <p className="mb-0.5 text-xs font-medium opacity-70">
            {message.senderDisplayName}
          </p>
        )}
        <p className="whitespace-pre-wrap text-sm">{displayText}</p>
        <div className={`mt-1 flex items-center gap-1 ${isOutbound ? 'justify-end' : 'justify-start'}`}>
          <span className="text-xs opacity-60">{formatMessageTime(message.createdAtMs)}</span>
          {isOutbound && <StatusIcon status={message.status} />}
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
      <span className="rounded-full bg-muted px-3 py-0.5 text-xs text-muted-foreground">
        {label}
      </span>
    </div>
  )
}
