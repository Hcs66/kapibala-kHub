import { useEffect, useRef, useState, useCallback } from 'react'
import { useConversationStore } from '@/stores/conversationStore'
import { useMessageStore } from '@/stores/messageStore'
import { createMockWs } from '@/shared/ws/mockWs'
import type { ServerPushEvent, AccountStatusDTO, AnalysisSummaryDTO } from '@/shared/api/types'
import type { WsConnectionStatus, WorkbenchWs } from '@/shared/ws/client'

const PING_INTERVAL_MS = 30_000

function getWsOptions(): { simulateDisconnect?: boolean; disconnectAfterMs?: number; reconnectAfterMs?: number } {
  const params = new URLSearchParams(window.location.search)
  const scenario = params.get('scenario')
  if (scenario === 'timeout') {
    return { simulateDisconnect: true, disconnectAfterMs: 8_000, reconnectAfterMs: 3_000 }
  }
  return {}
}

export interface WsEventCallbacks {
  onAccountStatusChanged?: (account: AccountStatusDTO) => void
  onAnalysisUpdated?: (analysis: AnalysisSummaryDTO) => void
}

export function useWorkbenchWs(callbacks?: WsEventCallbacks): WsConnectionStatus {
  const currentId = useConversationStore((s) => s.currentConversationId)
  const appendMessage = useMessageStore((s) => s.appendMessage)
  const updateMessageStatus = useMessageStore((s) => s.updateMessageStatus)
  const incrementUnread = useConversationStore((s) => s.incrementUnread)

  const wsRef = useRef<WorkbenchWs>(createMockWs(getWsOptions()))
  const [wsStatus, setWsStatus] = useState<WsConnectionStatus>('disconnected')
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

  const currentIdRef = useRef(currentId)
  currentIdRef.current = currentId

  const prevCurrentIdRef = useRef<string | null>(null)

  useEffect(() => {
    const ws = wsRef.current
    if (currentId && currentId !== prevCurrentIdRef.current) {
      ws.send('read.ack', { conversationId: currentId })
    }
    prevCurrentIdRef.current = currentId
  }, [currentId])

  const handleEvent = useCallback(
    (event: ServerPushEvent) => {
      switch (event.type) {
        case 'message.received': {
          const msg = event.payload
          if (msg.conversationId === currentIdRef.current) {
            appendMessage(msg)
          } else {
            incrementUnread(msg.conversationId)
          }
          break
        }
        case 'message.sent': {
          const sentMsg = event.payload
          updateMessageStatus(sentMsg.messageId, 'sent')
          break
        }
        case 'message.failed': {
          const { clientMessageId } = event.payload
          updateMessageStatus(clientMessageId, 'failed')
          break
        }
        case 'account.status_changed': {
          callbacksRef.current?.onAccountStatusChanged?.(event.payload)
          break
        }
        case 'analysis.updated': {
          callbacksRef.current?.onAnalysisUpdated?.(event.payload)
          break
        }
        default:
          break
      }
    },
    [appendMessage, incrementUnread, updateMessageStatus],
  )

  useEffect(() => {
    const ws = wsRef.current
    ws.connect('mock_token')

    const unsubStatus = ws.onStatusChange((newStatus) => {
      setWsStatus((prev) => {
        if (prev !== 'connected' && newStatus === 'connected' && prev === 'reconnecting') {
          ws.send('sync.request', { since: Date.now() - 60_000 })
        }
        return newStatus
      })
    })
    const unsubEvent = ws.onEvent(handleEvent)

    const pingInterval = setInterval(() => {
      if (ws.getStatus() === 'connected') {
        ws.send('ping', {})
      }
    }, PING_INTERVAL_MS)

    return () => {
      unsubStatus()
      unsubEvent()
      clearInterval(pingInterval)
      ws.disconnect()
    }
  }, [handleEvent])

  return wsStatus
}
