import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { useConversationStore } from '@/stores/conversationStore'
import { useTagStore } from '@/stores/tagStore'
import { useMessageStore } from '@/stores/messageStore'
import { useToastStore } from '@/stores/toastStore'
import { ConversationList } from '@/features/conversations/ConversationList'
import { PlatformTabs } from '@/features/conversations/PlatformTabs'
import { ChatTypeTabs } from '@/features/conversations/ChatTypeTabs'
import { TagFilterBar } from '@/features/conversations/TagFilterBar'
import { TagPopover } from '@/features/conversations/TagPopover'
import { useWorkbenchWs } from '@/features/conversations/hooks/useWorkbenchWs'
import { useMessageActions } from '@/features/conversations/hooks/useMessageActions'
import { MessagePanel, MessageInput, ConversationSkeleton } from '@/features/messages'
import { AnalysisSidebar } from '@/features/analysis'
import { AccountStatusBar } from '@/features/accounts'
import { TranslatePreview } from '@/features/translate'
import { apiClient, mockClient } from '@/shared/api'
import type { AnalysisSummaryDTO, AccountStatusDTO } from '@/shared/api/types'
import type { SuggestedReply } from '@/mocks/data'

const ACTIVE_THRESHOLD_MS = 24 * 60 * 60 * 1000

export function ConversationPage(): React.ReactElement {
  const { t } = useTranslation()
  const conversations = useConversationStore((s) => s.conversations)
  const currentId = useConversationStore((s) => s.currentConversationId)
  const conversationLoading = useConversationStore((s) => s.loading)
  const setConversations = useConversationStore((s) => s.setConversations)
  const switchConversation = useConversationStore((s) => s.switchConversation)
  const setConversationLoading = useConversationStore((s) => s.setLoading)
  const chatTypeFilter = useConversationStore((s) => s.chatTypeFilter)
  const setChatTypeFilter = useConversationStore((s) => s.setChatTypeFilter)
  const activeFilterOn = useConversationStore((s) => s.activeFilterOn)
  const selectedTagIds = useConversationStore((s) => s.selectedTagIds)

  const fetchTags = useTagStore((s) => s.fetchTags)

  const messages = useMessageStore((s) => s.messages)
  const showTranslation = useMessageStore((s) => s.showTranslation)
  const hasMore = useMessageStore((s) => s.hasMore)
  const loadingMore = useMessageStore((s) => s.loadingMore)
  const messageLoading = useMessageStore((s) => s.loading)
  const toggleTranslation = useMessageStore((s) => s.toggleTranslation)
  const setMessages = useMessageStore((s) => s.setMessages)
  const setHasMore = useMessageStore((s) => s.setHasMore)
  const setMessageLoading = useMessageStore((s) => s.setLoading)

  const [analysis, setAnalysis] = useState<AnalysisSummaryDTO | null>(null)
  const [platformFilter, setPlatformFilter] = useState<string>('')
  const [accounts, setAccounts] = useState<AccountStatusDTO[]>([])
  const [suggestedReplies, setSuggestedReplies] = useState<SuggestedReply[]>([])
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleAccountStatusChanged = useCallback((account: AccountStatusDTO) => {
    setAccounts((prev) =>
      prev.map((a) => (a.accountId === account.accountId ? account : a)),
    )
  }, [])

  const handleAnalysisUpdated = useCallback((updatedAnalysis: AnalysisSummaryDTO) => {
    setAnalysis((prev) => {
      if (prev && prev.conversationId === updatedAnalysis.conversationId) {
        return updatedAnalysis
      }
      return prev
    })
  }, [])

  const wsStatus = useWorkbenchWs({
    onAccountStatusChanged: handleAccountStatusChanged,
    onAnalysisUpdated: handleAnalysisUpdated,
  })
  const { inputText, setInputText, handleSend, handleRetry, handleLoadMore, handleTranslateSend } = useMessageActions()

  const addToast = useToastStore((s) => s.addToast)

  useEffect(() => {
    setConversationLoading(true)
    void apiClient.listConversations({}).then((result) => {
      setConversations(result.conversations)
      setConversationLoading(false)
    }).catch(() => {
      setConversationLoading(false)
      addToast(t('error.loadConversations'), 'error')
    })
    void apiClient.listAccounts().then(setAccounts).catch(() => {
      addToast(t('error.loadAccounts'), 'error')
    })
    void fetchTags()
  }, [setConversations, setConversationLoading, fetchTags, addToast, t])

  useEffect(() => {
    if (!currentId) {
      setMessages([])
      setAnalysis(null)
      setSuggestedReplies([])
      return
    }
    setMessageLoading(true)
    void apiClient.listMessages({ conversationId: currentId }).then((result) => {
      setMessages(result.messages)
      setHasMore(result.hasMore)
      setMessageLoading(false)
    }).catch(() => {
      setMessageLoading(false)
      addToast(t('error.loadMessages'), 'error')
    })
    void apiClient.getAnalysisSummary(currentId).then(setAnalysis).catch(() => {
      addToast(t('error.loadAnalysis'), 'error')
    })
    setSuggestedReplies(mockClient.getSuggestedReplies(currentId))
  }, [currentId, setMessages, setHasMore, setMessageLoading, addToast, t])

  const handleSuggestedReplyClick = (text: string): void => {
    setInputText(text)
  }

  const currentConversation = conversations.find((c) => c.conversationId === currentId)

  const filteredConversations = conversations.filter((c) => {
    if (platformFilter && c.platform !== platformFilter) return false
    if (chatTypeFilter !== 'all' && c.chatType !== chatTypeFilter) return false
    if (activeFilterOn) {
      if (c.lastMessageAtMs < Date.now() - ACTIVE_THRESHOLD_MS) return false
    }
    if (selectedTagIds.length > 0) {
      if (!selectedTagIds.every((tagId) => c.tags?.includes(tagId))) return false
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      if (!c.customerDisplayName.toLowerCase().includes(q)) return false
    }
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

          <div className="px-sm pt-sm pb-[6px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('workbench.searchPlaceholder')}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-low py-[7px] pl-8 pr-3 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-primary-glow"
              />
            </div>
          </div>

          <div className="flex items-center gap-[6px] border-b border-surface-container-highest px-sm py-[10px]">
            <PlatformTabs value={platformFilter} onChange={setPlatformFilter} />
          </div>

          <div className="flex items-center gap-[6px] border-b border-surface-container-highest px-sm py-[10px]">
            <ChatTypeTabs value={chatTypeFilter} onChange={setChatTypeFilter} />
          </div>

          <div className="relative">
            <TagFilterBar onOpenTagPopover={() => setTagPopoverOpen(true)} />
            <TagPopover open={tagPopoverOpen} onClose={() => setTagPopoverOpen(false)} />
          </div>

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
