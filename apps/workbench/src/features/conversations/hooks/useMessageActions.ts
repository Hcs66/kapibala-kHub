import { useCallback, useState } from 'react'
import { useConversationStore } from '@/stores/conversationStore'
import { useMessageStore } from '@/stores/messageStore'
import { apiClient } from '@/shared/api'
import type { MessageDTO } from '@/shared/api/types'

interface UseMessageActionsResult {
  inputText: string
  setInputText: (text: string) => void
  handleSend: (text: string) => void
  handleRetry: (messageId: string) => void
  handleLoadMore: () => void
  handleTranslateSend: (originalText: string, translatedText: string) => void
}

export function useMessageActions(): UseMessageActionsResult {
  const conversations = useConversationStore((s) => s.conversations)
  const currentId = useConversationStore((s) => s.currentConversationId)

  const messages = useMessageStore((s) => s.messages)
  const hasMore = useMessageStore((s) => s.hasMore)
  const loadingMore = useMessageStore((s) => s.loadingMore)
  const appendMessage = useMessageStore((s) => s.appendMessage)
  const prependMessages = useMessageStore((s) => s.prependMessages)
  const updateMessageStatus = useMessageStore((s) => s.updateMessageStatus)
  const setHasMore = useMessageStore((s) => s.setHasMore)
  const setLoadingMore = useMessageStore((s) => s.setLoadingMore)

  const [inputText, setInputText] = useState('')

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

      void apiClient
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

      void apiClient
        .sendMessage({ conversationId: currentId, accountId: msg.accountId, text: msg.originalText, idempotencyKey })
        .then((result) => {
          updateMessageStatus(messageId, result.status === 'sent' ? 'sent' : 'failed')
        })
    },
    [currentId, messages, updateMessageStatus],
  )

  const handleLoadMore = useCallback(() => {
    if (!currentId || loadingMore || !hasMore) return
    setLoadingMore(true)
    const oldestMessage = messages[0]
    void apiClient
      .listMessages({ conversationId: currentId, beforeSeq: oldestMessage?.createdAtMs })
      .then((result) => {
        prependMessages(result.messages)
        setHasMore(result.hasMore)
        setLoadingMore(false)
      })
  }, [currentId, loadingMore, hasMore, messages, prependMessages, setHasMore, setLoadingMore])

  const handleTranslateSend = useCallback(
    (_originalText: string, _translatedText: string) => {
      handleSend(_originalText)
    },
    [handleSend],
  )

  return {
    inputText,
    setInputText,
    handleSend,
    handleRetry,
    handleLoadMore,
    handleTranslateSend,
  }
}
