import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, WifiOff, X } from 'lucide-react'
import { useConversationStore } from '@/stores/conversationStore'
import { useTagStore } from '@/stores/tagStore'
import { useMessageStore } from '@/stores/messageStore'
import { useToastStore } from '@/stores/toastStore'
import { useAccountStore } from '@/stores/accountStore'
import { useAnalysisStore } from '@/stores/analysisStore'
import { ConversationList } from '@/features/conversations/ConversationList'
import { PlatformTabs } from '@/features/conversations/PlatformTabs'
import { FilterPopover, FilterTrigger } from '@/features/conversations/FilterPopover'
import { useWorkbenchWs } from '@/features/conversations/hooks/useWorkbenchWs'
import { useMessageActions } from '@/features/conversations/hooks/useMessageActions'
import { MessagePanel, MessageInput, ConversationSkeleton } from '@/features/messages'
import { AnalysisSidebar } from '@/features/analysis'
import { AccountStatusBar } from '@/features/accounts'
import { TranslatePreview } from '@/features/translate'
import { apiClient, mockClient } from '@/shared/api'
import type { SuggestedReply } from '@/mocks/data'
import type {
  CustomerProfileDTO,
  IntentPredictionDTO,
  DealSuggestionDTO,
  ActionSuggestionDTO,
  TimelineEventDTO,
  PersonDTO,
  OrganizationDTO,
} from '@/shared/api/types'

const ACTIVE_THRESHOLD_MS = 24 * 60 * 60 * 1000

const RANGE_TO_MS: Record<string, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '3d': 3 * 24 * 60 * 60 * 1000,
  '1w': 7 * 24 * 60 * 60 * 1000,
  '1m': 30 * 24 * 60 * 60 * 1000,
}

export function ConversationPage(): React.ReactElement {
  const { t } = useTranslation()
  const conversations = useConversationStore((s) => s.conversations)
  const currentId = useConversationStore((s) => s.currentConversationId)
  const conversationLoading = useConversationStore((s) => s.loading)
  const setConversations = useConversationStore((s) => s.setConversations)
  const switchConversation = useConversationStore((s) => s.switchConversation)
  const setConversationLoading = useConversationStore((s) => s.setLoading)
  const activeFilterOn = useConversationStore((s) => s.activeFilterOn)
  const activeFilterRange = useConversationStore((s) => s.activeFilterRange)
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

  const accounts = useAccountStore((s) => s.accounts)
  const fetchAccounts = useAccountStore((s) => s.fetchAccounts)
  const updateAccountStatus = useAccountStore((s) => s.updateAccountStatus)

  const analysis = useAnalysisStore((s) => s.analysis)
  const fetchAnalysis = useAnalysisStore((s) => s.fetchAnalysis)
  const updateAnalysis = useAnalysisStore((s) => s.updateAnalysis)
  const clearAnalysis = useAnalysisStore((s) => s.clear)

  const [platformFilter, setPlatformFilter] = useState<string>('')
  const [suggestedReplies, setSuggestedReplies] = useState<SuggestedReply[]>([])
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [customerProfile, setCustomerProfile] = useState<CustomerProfileDTO | null>(null)
  const [intentPrediction, setIntentPrediction] = useState<IntentPredictionDTO | null>(null)
  const [dealSuggestion, setDealSuggestion] = useState<DealSuggestionDTO | null>(null)
  const [actionSuggestions, setActionSuggestions] = useState<ActionSuggestionDTO | null>(null)
  const [timelineEvents, setTimelineEvents] = useState<TimelineEventDTO[]>([])
  const [persons, setPersons] = useState<PersonDTO[]>([])
  const [organizations, setOrganizations] = useState<OrganizationDTO[]>([])
  const [personFilter, setPersonFilter] = useState<string>('')
  const [orgFilter, setOrgFilter] = useState<string>('')
  useEffect(() => {
    const handleOnline = (): void => setIsOffline(false)
    const handleOffline = (): void => setIsOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleAccountStatusChanged = updateAccountStatus

  const handleAnalysisUpdated = updateAnalysis

  const wsStatus = useWorkbenchWs({
    onAccountStatusChanged: handleAccountStatusChanged,
    onAnalysisUpdated: handleAnalysisUpdated,
  })
  const { inputText, setInputText, handleSend, handleRetry, handleLoadMore, handleTranslateSend } =
    useMessageActions()

  const addToast = useToastStore((s) => s.addToast)

  useEffect(() => {
    setConversationLoading(true)
    void apiClient
      .listConversations({})
      .then((result) => {
        setConversations(result.conversations)
        setConversationLoading(false)
      })
      .catch(() => {
        setConversationLoading(false)
        addToast(t('error.loadConversations'), 'error')
      })
    void fetchAccounts().catch(() => {
      addToast(t('error.loadAccounts'), 'error')
    })
    void fetchTags()
    void apiClient.listPersons().then(setPersons)
    void apiClient.listOrganizations().then(setOrganizations)
  }, [setConversations, setConversationLoading, fetchTags, fetchAccounts, addToast, t])

  useEffect(() => {
    if (!currentId) {
      setMessages([])
      clearAnalysis()
      setSuggestedReplies([])
      setCustomerProfile(null)
      setIntentPrediction(null)
      setDealSuggestion(null)
      setActionSuggestions(null)
      setTimelineEvents([])
      return
    }
    setMessageLoading(true)
    void apiClient
      .listMessages({ conversationId: currentId })
      .then((result) => {
        setMessages(result.messages)
        setHasMore(result.hasMore)
        setMessageLoading(false)
      })
      .catch(() => {
        setMessageLoading(false)
        addToast(t('error.loadMessages'), 'error')
      })
    void fetchAnalysis(currentId).catch(() => {
      addToast(t('error.loadAnalysis'), 'error')
    })
    setSuggestedReplies(mockClient.getSuggestedReplies(currentId))
    void apiClient.getCustomerProfile(currentId).then(setCustomerProfile)
    void apiClient.getIntentPrediction(currentId).then(setIntentPrediction)
    void apiClient.getDealSuggestion(currentId).then(setDealSuggestion)
    void apiClient.getActionSuggestions(currentId).then(setActionSuggestions)
    void apiClient.getTimelineEvents(currentId).then(setTimelineEvents)
  }, [
    currentId,
    setMessages,
    setHasMore,
    setMessageLoading,
    fetchAnalysis,
    clearAnalysis,
    addToast,
    t,
  ])

  const handleSuggestedReplyClick = (text: string): void => {
    setInputText(text)
  }

  const handleActionExecute = (action: ActionSuggestionDTO['actions'][number]): void => {
    addToast(`${action.label}`, 'success')
  }

  const currentConversation = conversations.find((c) => c.conversationId === currentId)

  const filteredConversations = conversations.filter((c) => {
    if (platformFilter && c.platform !== platformFilter) return false
    if (activeFilterOn && activeFilterRange !== 'all') {
      const thresholdMs = RANGE_TO_MS[activeFilterRange] ?? ACTIVE_THRESHOLD_MS
      if (c.lastMessageAtMs < Date.now() - thresholdMs) return false
    }
    if (selectedTagIds.length > 0) {
      if (!selectedTagIds.every((tagId) => c.tags?.includes(tagId))) return false
    }
    if (personFilter && c.personId !== personFilter) return false
    if (orgFilter && c.organizationId !== orgFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      if (!c.customerDisplayName.toLowerCase().includes(q)) return false
    }
    return true
  })

  const tags = useTagStore((s) => s.tags)
  const activeFilterCount = [
    activeFilterOn,
    selectedTagIds.length > 0,
    personFilter !== '',
    orgFilter !== '',
  ].filter(Boolean).length

  const clearAllFilters = (): void => {
    useConversationStore.getState().setActiveFilterRange('all')
    useConversationStore.getState().setSelectedTags([])
    setPersonFilter('')
    setOrgFilter('')
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {isOffline && (
        <div className="flex items-center justify-center gap-1.5 bg-amber-100 px-4 py-1.5 text-xs font-medium text-amber-900">
          <WifiOff className="h-3.5 w-3.5" />
          {t('ws.offline')}
        </div>
      )}
      {!isOffline && wsStatus !== 'connected' && (
        <div className="flex items-center justify-center bg-error-container px-4 py-1.5 text-xs text-on-error-container">
          {wsStatus === 'connecting' && t('ws.connecting')}
          {wsStatus === 'disconnected' && t('ws.disconnected')}
          {wsStatus === 'reconnecting' && t('ws.reconnecting')}
        </div>
      )}
      <AccountStatusBar accounts={accounts} />

      <div className="flex flex-1 gap-md overflow-hidden p-md">
        <aside className="hidden w-[300px] shrink-0 flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-soft md:flex">
          <div className="flex items-center gap-[6px] border-b border-surface-container-highest bg-surface-bright px-sm py-sm">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('workbench.searchPlaceholder')}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-low py-[6px] pl-8 pr-3 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-primary-glow"
              />
            </div>
            <FilterTrigger activeCount={activeFilterCount} onClick={() => setFilterPopoverOpen(!filterPopoverOpen)} />
          </div>

          <div className="relative flex items-center gap-[6px] border-b border-surface-container-highest px-sm py-[8px]">
            <PlatformTabs value={platformFilter} onChange={setPlatformFilter} />
            <FilterPopover
              open={filterPopoverOpen}
              onClose={() => setFilterPopoverOpen(false)}
              persons={persons}
              organizations={organizations}
              personFilter={personFilter}
              orgFilter={orgFilter}
              onPersonFilterChange={setPersonFilter}
              onOrgFilterChange={setOrgFilter}
            />
          </div>

          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-[4px] border-b border-surface-container-highest px-sm py-[6px]">
              {activeFilterOn && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-[2px] text-[10px] font-medium text-emerald-700">
                  {t(`filter.range${activeFilterRange.toUpperCase()}`)}
                  <button type="button" onClick={() => useConversationStore.getState().setActiveFilterRange('all')} className="hover:text-emerald-900">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              )}
              {selectedTagIds.map((tagId) => {
                const tag = tags.find((t) => t.tagId === tagId)
                if (!tag) return null
                return (
                  <span
                    key={tagId}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[10px] font-medium"
                    style={{ backgroundColor: `${tag.color}14`, color: tag.color }}
                  >
                    {tag.name}
                    <button type="button" onClick={() => useConversationStore.getState().toggleTag(tagId)} className="hover:opacity-70">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                )
              })}
              {personFilter && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/8 px-2 py-[2px] text-[10px] font-medium text-primary">
                  {persons.find((p) => p.personId === personFilter)?.name}
                  <button type="button" onClick={() => setPersonFilter('')} className="hover:opacity-70">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              )}
              {orgFilter && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/8 px-2 py-[2px] text-[10px] font-medium text-primary">
                  {organizations.find((o) => o.organizationId === orgFilter)?.name}
                  <button type="button" onClick={() => setOrgFilter('')} className="hover:opacity-70">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              )}
              <button
                type="button"
                onClick={clearAllFilters}
                className="ml-auto text-[10px] text-muted-foreground hover:text-foreground"
              >
                {t('common.cancel')}
              </button>
            </div>
          )}

          <div className="custom-scrollbar flex-1 overflow-y-auto p-xs">
            {conversationLoading ? (
              <ConversationSkeleton count={6} />
            ) : (
              <ConversationList
                conversations={filteredConversations}
                currentId={currentId}
                onSelect={switchConversation}
                persons={persons}
                organizations={organizations}
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
            onActionExecute={handleActionExecute}
            customerProfile={customerProfile}
            intentPrediction={intentPrediction}
            dealSuggestion={dealSuggestion}
            actionSuggestions={actionSuggestions}
            timelineEvents={timelineEvents}
          />
        </aside>
      </div>
    </div>
  )
}
