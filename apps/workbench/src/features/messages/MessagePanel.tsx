import { useEffect, useRef } from 'react'
import { Languages, MessageSquare } from 'lucide-react'
import type { MessageDTO } from '@/shared/api/types'
import { MessageBubble, TimeSeparator } from './MessageBubble'

interface MessagePanelProps {
  messages: MessageDTO[]
  showTranslation: boolean
  onToggleTranslation: () => void
  onRetry?: (messageId: string) => void
  conversationName?: string
}

function shouldShowTimeSeparator(current: MessageDTO, previous: MessageDTO | undefined): boolean {
  if (!previous) return true
  return current.createdAtMs - previous.createdAtMs > 5 * 60_000
}

export function MessagePanel({
  messages,
  showTranslation,
  onToggleTranslation,
  onRetry,
  conversationName,
}: MessagePanelProps): React.ReactElement {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (messages.length === 0 && !conversationName) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <MessageSquare className="h-12 w-12 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">选择一个会话开始聊天</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex h-12 items-center justify-between border-b border-border px-4">
        <span className="text-sm font-medium">{conversationName ?? ''}</span>
        <button
          type="button"
          onClick={onToggleTranslation}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors ${
            showTranslation
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <Languages className="h-3.5 w-3.5" />
          {showTranslation ? '查看原文' : '查看译文'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="flex flex-col gap-1">
          {messages.map((msg, i) => (
            <div key={msg.messageId}>
              {shouldShowTimeSeparator(msg, messages[i - 1]) && (
                <TimeSeparator timestamp={msg.createdAtMs} />
              )}
              <MessageBubble message={msg} showTranslation={showTranslation} onRetry={onRetry} />
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  )
}
