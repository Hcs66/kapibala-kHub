import { useEffect, useState, useCallback } from 'react'
import { Search, Filter } from 'lucide-react'
import { useConversationStore } from '@/stores/conversationStore'
import { useMessageStore } from '@/stores/messageStore'
import { ConversationList } from '@/features/conversations/ConversationList'
import { MessagePanel } from '@/features/messages/MessagePanel'
import { MessageInput } from '@/features/messages/MessageInput'
import { AnalysisSidebar } from '@/features/analysis/AnalysisSidebar'
import { mockClient } from '@/shared/api/mockClient'
import type { MessageDTO, AnalysisSummaryDTO } from '@/shared/api/types'

export function WorkbenchPage(): React.ReactElement {
  const conversations = useConversationStore((s) => s.conversations)
  const currentId = useConversationStore((s) => s.currentConversationId)
  const setConversations = useConversationStore((s) => s.setConversations)
  const switchConversation = useConversationStore((s) => s.switchConversation)

  const messages = useMessageStore((s) => s.messages)
  const showTranslation = useMessageStore((s) => s.showTranslation)
  const setMessages = useMessageStore((s) => s.setMessages)
  const appendMessage = useMessageStore((s) => s.appendMessage)
  const updateMessageStatus = useMessageStore((s) => s.updateMessageStatus)
  const toggleTranslation = useMessageStore((s) => s.toggleTranslation)

  const [analysis, setAnalysis] = useState<AnalysisSummaryDTO | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [platformFilter, setPlatformFilter] = useState<string>('')

  useEffect(() => {
    void mockClient.listConversations({}).then((result) => {
      setConversations(result.conversations)
    })
  }, [setConversations])

  useEffect(() => {
    if (!currentId) {
      setMessages([])
      setAnalysis(null)
      return
    }
    void mockClient.listMessages({ conversationId: currentId }).then((result) => {
      setMessages(result.messages)
    })
    void mockClient.getAnalysisSummary(currentId).then(setAnalysis)
  }, [currentId, setMessages])

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

      void mockClient
        .sendMessage({ conversationId: currentId, accountId: pendingMessage.accountId, text, idempotencyKey })
        .then((result) => {
          updateMessageStatus(idempotencyKey, result.status === 'sent' ? 'sent' : 'failed')
        })
    },
    [currentId, conversations, appendMessage, updateMessageStatus],
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
    <div className="flex h-svh">
      <aside className="flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex h-12 items-center border-b border-sidebar-border px-3">
          <span className="text-sm font-semibold">kHub 工作台</span>
        </div>

        <div className="flex flex-col gap-2 border-b border-sidebar-border p-2">
          <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索会话..."
              className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs outline-none"
            >
              <option value="">全部平台</option>
              <option value="telegram">Telegram</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-1.5">
          <ConversationList
            conversations={filteredConversations}
            currentId={currentId}
            onSelect={switchConversation}
          />
        </div>
      </aside>

      <main className="flex flex-1 flex-col">
        <MessagePanel
          messages={messages}
          showTranslation={showTranslation}
          onToggleTranslation={toggleTranslation}
          conversationName={currentConversation?.customerDisplayName}
        />
        <MessageInput disabled={!currentId} onSend={handleSend} />
      </main>

      <aside className="flex w-80 shrink-0 flex-col border-l border-sidebar-border bg-sidebar">
        <div className="flex h-12 items-center border-b border-sidebar-border px-4">
          <span className="text-sm font-semibold">AI 分析</span>
        </div>
        <AnalysisSidebar analysis={analysis} />
      </aside>
    </div>
  )
}
