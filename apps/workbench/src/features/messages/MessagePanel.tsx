import { useEffect, useRef, useState, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Languages, MessageSquare, ChevronDown, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { MessageDTO } from '@/shared/api/types'
import { MessageBubble, TimeSeparator } from './MessageBubble'
import { MessageSkeleton } from './MessageSkeleton'

interface MessagePanelProps {
  messages: MessageDTO[]
  showTranslation: boolean
  onToggleTranslation: () => void
  onRetry?: (messageId: string) => void
  onLoadMore?: () => void
  hasMore?: boolean
  loadingMore?: boolean
  loading?: boolean
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
  onLoadMore,
  hasMore,
  loadingMore,
  loading,
  conversationName,
}: MessagePanelProps): React.ReactElement {
  const { t } = useTranslation()
  const parentRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [newMessageCount, setNewMessageCount] = useState(0)
  const prevMessageCountRef = useRef(messages.length)
  const hasScrolledInitially = useRef(false)

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  })

  const scrollToBottom = useCallback(() => {
    if (parentRef.current) {
      parentRef.current.scrollTop = parentRef.current.scrollHeight
      setIsAtBottom(true)
      setNewMessageCount(0)
    }
  }, [])

  useEffect(() => {
    if (messages.length === 0) {
      hasScrolledInitially.current = false
      return
    }
    if (!hasScrolledInitially.current) {
      requestAnimationFrame(() => {
        scrollToBottom()
        hasScrolledInitially.current = true
      })
    }
  }, [messages.length, scrollToBottom])

  useEffect(() => {
    const diff = messages.length - prevMessageCountRef.current
    if (diff > 0 && hasScrolledInitially.current) {
      if (isAtBottom) {
        requestAnimationFrame(scrollToBottom)
      } else {
        setNewMessageCount((c) => c + diff)
      }
    }
    prevMessageCountRef.current = messages.length
  }, [messages.length, isAtBottom, scrollToBottom])

  const handleScroll = useCallback(() => {
    const el = parentRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    const atBottom = distanceFromBottom < 50
    setIsAtBottom(atBottom)
    if (atBottom) {
      setNewMessageCount(0)
    }
    if (el.scrollTop < 100 && hasMore && !loadingMore && onLoadMore) {
      onLoadMore()
    }
  }, [hasMore, loadingMore, onLoadMore])

  if (loading) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="flex h-12 items-center justify-between border-b border-border px-4">
          <span className="text-sm font-semibold">{conversationName ?? ''}</span>
        </div>
        <div className="flex-1 px-4 py-3">
          <MessageSkeleton count={5} />
        </div>
      </div>
    )
  }

  if (messages.length === 0 && !conversationName) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <MessageSquare className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">{t('message.selectConversation')}</p>
      </div>
    )
  }

  return (
    <div className="relative flex flex-1 flex-col">
      <div className="flex h-12 items-center justify-between border-b border-border px-4">
        <span className="text-sm font-semibold">{conversationName ?? ''}</span>
        <button
          type="button"
          onClick={onToggleTranslation}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
            showTranslation
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent'
          }`}
        >
          <Languages className="h-3.5 w-3.5" />
          {showTranslation ? t('message.showOriginal') : t('message.showTranslation')}
        </button>
      </div>

      <div
        ref={parentRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3"
      >
        {loadingMore && (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="ml-2 text-xs text-muted-foreground">{t('message.loadingMore')}</span>
          </div>
        )}
        <div
          style={{ height: `${String(virtualizer.getTotalSize())}px`, position: 'relative', width: '100%' }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const msg = messages[virtualItem.index]
            if (!msg) return null
            const prev = virtualItem.index > 0 ? messages[virtualItem.index - 1] : undefined
            return (
              <div
                key={msg.messageId}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${String(virtualItem.start)}px)`,
                }}
              >
                {shouldShowTimeSeparator(msg, prev) && (
                  <TimeSeparator timestamp={msg.createdAtMs} />
                )}
                <div className="animate-message-in">
                  <MessageBubble message={msg} showTranslation={showTranslation} onRetry={onRetry} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {newMessageCount > 0 && !isAtBottom && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-lg transition-all hover:bg-primary/90"
        >
          <ChevronDown className="h-3.5 w-3.5" />
          {t('message.newMessages', { count: newMessageCount })}
        </button>
      )}
    </div>
  )
}
