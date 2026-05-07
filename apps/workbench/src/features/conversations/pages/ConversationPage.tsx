import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useConversationStore } from '@/stores/conversationStore'
import { useMessageStore } from '@/stores/messageStore'
import { ConversationList } from '@/features/conversations/ConversationList'
import { PlatformTabs } from '@/features/conversations/PlatformTabs'
import { useWorkbenchWs } from '@/features/conversations/hooks/useWorkbenchWs'
import { useMessageActions } from '@/features/conversations/hooks/useMessageActions'
import { MessagePanel, MessageInput, ConversationSkeleton } from '@/features/messages'
import { AnalysisSidebar } from '@/features/analysis'
import { AccountStatusBar } from '@/features/accounts'
import { TranslatePreview } from '@/features/translate'
import { mockClient } from '@/shared/api/mockClient'
import type { AnalysisSummaryDTO, AccountStatusDTO } from '@/shared/api/types'
import type { SuggestedReply } from '@/mocks/data'

export function ConversationPage(): React.ReactElement {
  const { t } = useTranslation()
  const conversations = useConversationStore((s) => s.conversations)
  const currentId = useConversationStore((s) => s.currentConversationId)
  const conversationLoading = useConversationStore((s) => s.loading)
  const setConversations = useConversationStore((s) => s.setConversations)
  const switchConversation = useConversationStore((s) => s.switchConversation)
  const setConversationLoading = useConversationStore((s) => s.setLoading)

  const messages = useMessageStore((s) => s.messages)
  const showTranslation = useMessageStore((s) => s.showTranslation)
  const hasMore = useMessageStore((s) => s.hasMore)
  const loadingMore = useMessageStore((s) => s.loadingMore)
  const messageLoading = useMessageStore((s) => s.loading)
  const toggleTranslation = useMessageStore((s) => s.toggleTranslation)
  const setMessages = useMessageStore((s) => s.setMessages)
  const setHasMore = useMessageStore((s) => s.setHasMore)
  const setMessageLoading = useMessageStore((s) => s.setLoading)

  const wsStatus = useWorkbenchWs()
  const { inputText, setInputText, handleSend, handleRetry, handleLoadMore, handleTranslateSend } = useMessageActions()

  const [analysis, setAnalysis] = useState<AnalysisSummaryDTO | null>(null)
  const [platformFilter, setPlatformFilter] = useState<string>('')
  const [accounts, setAccounts] = useState<AccountStatusDTO[]>([])
  const [suggestedReplies, setSuggestedReplies] = useState<SuggestedReply[]>([])

  useEffect(() => {
    setConversationLoading(true)
    void mockClient.listConversations({}).then((result) => {
      setConversations(result.conversations)
      setConversationLoading(false)
    })
    void mockClient.listAccounts().then(setAccounts)
  }, [setConversations, setConversationLoading])

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

  const handleSuggestedReplyClick = (text: string): void => {
    setInputText(text)
  }

  const currentConversation = conversations.find((c) => c.conversationId === currentId)

  const filteredConversations = conversations.filter((c) => {
    if (platformFilter && c.platform !== platformFilter) return false
    return true
  })

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {wsStatus !== 'connected' && (
        <div className="flex items-center justify-center bg-error-container px-4 py-1.5 text-xs text-on-error-container">
          {wsStatus === 'connecting' && t('ws.connecting')}
          {wsStatus === 'disconnected' && t('ws.disconnected')}
          {wsStatus === 'reconnecting' && t('ws.reconnecting')}
        </div>
      )}
      <AccountStatusBar accounts={accounts} />

      <div className="flex flex-1 gap-md overflow-hidden p-md">
        <aside className="hidden w-[300px] shrink-0 flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-soft md:flex">
          <div className="flex items-center justify-between border-b border-surface-container-highest bg-surface-bright p-md">
            <span className="text-[16px] font-semibold text-foreground">{t('workbench.title')}</span>
          </div>

          <PlatformTabs value={platformFilter} onChange={setPlatformFilter} />

          <div className="custom-scrollbar flex-1 overflow-y-auto p-xs">
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

        <main className="flex min-w-[400px] flex-1 flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-soft">
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

        <aside className="custom-scrollbar hidden w-[320px] shrink-0 flex-col gap-md overflow-y-auto lg:flex">
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
