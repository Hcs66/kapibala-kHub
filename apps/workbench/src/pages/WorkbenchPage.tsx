import { useEffect, useState, useCallback, useRef } from 'react'
import { Search, Filter, Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useConversationStore } from '@/stores/conversationStore'
import { useMessageStore } from '@/stores/messageStore'
import { ConversationList } from '@/features/conversations/ConversationList'
import { MessagePanel } from '@/features/messages/MessagePanel'
import { MessageInput } from '@/features/messages/MessageInput'
import { AnalysisSidebar } from '@/features/analysis/AnalysisSidebar'
import { AccountStatusBar } from '@/features/accounts/AccountStatusBar'
import { TranslatePreview } from '@/features/translate/TranslatePreview'
import { ConversationSkeleton } from '@/features/messages/MessageSkeleton'
import { mockClient } from '@/shared/api/mockClient'
import { createMockWs } from '@/shared/ws/mockWs'
import { changeLanguage } from '@/shared/i18n'
import type { MessageDTO, AnalysisSummaryDTO, AccountStatusDTO, ServerPushEvent } from '@/shared/api/types'
import type { WsConnectionStatus } from '@/shared/ws/client'
import type { SuggestedReply } from '@/mocks/data'

function getWsOptions(): { simulateDisconnect?: boolean; disconnectAfterMs?: number; reconnectAfterMs?: number } {
  const params = new URLSearchParams(window.location.search)
  const scenario = params.get('scenario')
  if (scenario === 'timeout') {
    return { simulateDisconnect: true, disconnectAfterMs: 8_000, reconnectAfterMs: 3_000 }
  }
  return {}
}

export function WorkbenchPage(): React.ReactElement {
  const { t, i18n } = useTranslation()
  const conversations = useConversationStore((s) => s.conversations)
  const currentId = useConversationStore((s) => s.currentConversationId)
  const conversationLoading = useConversationStore((s) => s.loading)
  const setConversations = useConversationStore((s) => s.setConversations)
  const switchConversation = useConversationStore((s) => s.switchConversation)
  const incrementUnread = useConversationStore((s) => s.incrementUnread)
  const setConversationLoading = useConversationStore((s) => s.setLoading)

  const messages = useMessageStore((s) => s.messages)
  const showTranslation = useMessageStore((s) => s.showTranslation)
  const hasMore = useMessageStore((s) => s.hasMore)
  const loadingMore = useMessageStore((s) => s.loadingMore)
  const messageLoading = useMessageStore((s) => s.loading)
  const setMessages = useMessageStore((s) => s.setMessages)
  const prependMessages = useMessageStore((s) => s.prependMessages)
  const appendMessage = useMessageStore((s) => s.appendMessage)
  const updateMessageStatus = useMessageStore((s) => s.updateMessageStatus)
  const toggleTranslation = useMessageStore((s) => s.toggleTranslation)
  const setHasMore = useMessageStore((s) => s.setHasMore)
  const setLoadingMore = useMessageStore((s) => s.setLoadingMore)
  const setMessageLoading = useMessageStore((s) => s.setLoading)

  const [analysis, setAnalysis] = useState<AnalysisSummaryDTO | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [platformFilter, setPlatformFilter] = useState<string>('')
  const [accounts, setAccounts] = useState<AccountStatusDTO[]>([])
  const [wsStatus, setWsStatus] = useState<WsConnectionStatus>('disconnected')
  const [inputText, setInputText] = useState('')
  const [suggestedReplies, setSuggestedReplies] = useState<SuggestedReply[]>([])

  const wsRef = useRef(createMockWs(getWsOptions()))

  useEffect(() => {
    setConversationLoading(true)
    void mockClient.listConversations({}).then((result) => {
      setConversations(result.conversations)
      setConversationLoading(false)
    })
    void mockClient.listAccounts().then(setAccounts)
  }, [setConversations, setConversationLoading])

  useEffect(() => {
    const ws = wsRef.current
    ws.connect('mock_token')

    const unsubStatus = ws.onStatusChange(setWsStatus)
    const unsubEvent = ws.onEvent((event: ServerPushEvent) => {
      if (event.type === 'message.received') {
        const msg = event.payload
        if (msg.conversationId === currentId) {
          appendMessage(msg)
        } else {
          incrementUnread(msg.conversationId)
        }
      }
    })

    return () => {
      unsubStatus()
      unsubEvent()
      ws.disconnect()
    }
  }, [currentId, appendMessage, incrementUnread])

  useEffect(() => {
    if (!currentId) {
      setMessages([])
      setAnalysis(null)
      setSuggestedReplies([])
      return
    }
    setMessageLoading(true)
    void mockClient.listMessages({ conversationId: currentId }).then((result) => {
      setMessages(result.messages)
      setHasMore(result.hasMore)
      setMessageLoading(false)
    })
    void mockClient.getAnalysisSummary(currentId).then(setAnalysis)
    setSuggestedReplies(mockClient.getSuggestedReplies(currentId))
  }, [currentId, setMessages, setHasMore, setMessageLoading])

  const handleLoadMore = useCallback(() => {
    if (!currentId || loadingMore || !hasMore) return
    setLoadingMore(true)
    const oldestMessage = messages[0]
    void mockClient
      .listMessages({ conversationId: currentId, beforeSeq: oldestMessage?.createdAtMs })
      .then((result) => {
        prependMessages(result.messages)
        setHasMore(result.hasMore)
        setLoadingMore(false)
      })
  }, [currentId, loadingMore, hasMore, messages, prependMessages, setHasMore, setLoadingMore])

  const handleSend = useCallback(
    (text: string) => {
      if (!currentId) return
      const idempotencyKey = `local_${Date.now().toString()}_${Math.random().toString(36).slice(2)}`
      const currentConv = conversations.find((c) => c.conversationId === currentId)
      const pendingMessage: MessageDTO = {
        messageId: idempotencyKey,
        conversationId: currentId,
        platform: currentConv?.platform ?? 'telegram',
        accountId: currentConv?.accountId ?? '',
        direction: 'outbound',
        senderId: 'user_sales_001',
        senderDisplayName: '张三',
        originalText: text,
        status: 'pending',
        createdAtMs: Date.now(),
      }
      appendMessage(pendingMessage)
      setInputText('')

      void mockClient
        .sendMessage({ conversationId: currentId, accountId: pendingMessage.accountId, text, idempotencyKey })
        .then((result) => {
          updateMessageStatus(idempotencyKey, result.status === 'sent' ? 'sent' : 'failed')
        })
    },
    [currentId, conversations, appendMessage, updateMessageStatus],
  )

  const handleRetry = useCallback(
    (messageId: string) => {
      const msg = messages.find((m) => m.messageId === messageId)
      if (!msg || !currentId) return
      updateMessageStatus(messageId, 'pending')
      const idempotencyKey = messageId

      void mockClient
        .sendMessage({ conversationId: currentId, accountId: msg.accountId, text: msg.originalText, idempotencyKey })
        .then((result) => {
          updateMessageStatus(messageId, result.status === 'sent' ? 'sent' : 'failed')
        })
    },
    [currentId, messages, updateMessageStatus],
  )

  const handleTranslateSend = useCallback(
    (_originalText: string, _translatedText: string) => {
      handleSend(_originalText)
    },
    [handleSend],
  )

  const handleSuggestedReplyClick = useCallback(
    (text: string) => {
      setInputText(text)
    },
    [],
  )

  const currentConversation = conversations.find((c) => c.conversationId === currentId)

  const filteredConversations = conversations.filter((c) => {
    if (platformFilter && c.platform !== platformFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return c.customerDisplayName.toLowerCase().includes(q) || c.lastMessageText.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="flex h-svh flex-col">
      {wsStatus !== 'connected' && (
        <div className="flex items-center justify-center bg-error-container px-4 py-1.5 text-xs text-on-error-container">
          {wsStatus === 'connecting' && t('ws.connecting')}
          {wsStatus === 'disconnected' && t('ws.disconnected')}
          {wsStatus === 'reconnecting' && t('ws.reconnecting')}
        </div>
      )}
      <AccountStatusBar accounts={accounts} />

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-white/78 backdrop-blur-[16px] md:flex">
          <div className="flex h-12 items-center justify-between border-b border-border px-4">
            <span className="text-sm font-semibold">{t('workbench.title')}</span>
            <button
              type="button"
              onClick={() => changeLanguage(i18n.language === 'zh' ? 'en' : 'zh')}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent"
            >
              <Globe className="h-3.5 w-3.5" />
              {i18n.language === 'zh' ? 'EN' : '中'}
            </button>
          </div>

          <div className="flex flex-col gap-2 border-b border-border p-3">
            <div className="flex items-center gap-1.5 rounded-md border border-border bg-surface-container-lowest px-2.5 py-1.5 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-glow">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('workbench.searchPlaceholder')}
                className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="flex-1 rounded-md border border-border bg-surface-container-lowest px-2 py-1 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary-glow"
              >
                <option value="">{t('common.allPlatforms')}</option>
                <option value="telegram">Telegram</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {conversationLoading ? (
              <ConversationSkeleton count={6} />
            ) : (
              <ConversationList
                conversations={filteredConversations}
                currentId={currentId}
                onSelect={switchConversation}
              />
            )}
          </div>
        </aside>

        <main className="flex flex-1 flex-col">
          <MessagePanel
            messages={messages}
            showTranslation={showTranslation}
            onToggleTranslation={toggleTranslation}
            onRetry={handleRetry}
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
            loadingMore={loadingMore}
            loading={messageLoading}
            conversationName={currentConversation?.customerDisplayName}
          />
          {inputText.trim() && currentId && (
            <TranslatePreview
              text={inputText}
              targetLang="en"
              onConfirmSend={handleTranslateSend}
            />
          )}
          <MessageInput
            disabled={!currentId}
            onSend={handleSend}
            onTextChange={setInputText}
            externalText={inputText}
          />
        </main>

        <aside className="hidden w-80 shrink-0 flex-col border-l border-border bg-white/78 backdrop-blur-[16px] lg:flex">
          <div className="flex h-12 items-center border-b border-border px-4">
            <span className="text-sm font-semibold">{t('workbench.aiAnalysis')}</span>
          </div>
          <AnalysisSidebar
            analysis={analysis}
            suggestedReplies={suggestedReplies}
            onSuggestedReplyClick={handleSuggestedReplyClick}
          />
        </aside>
      </div>
    </div>
  )
}
