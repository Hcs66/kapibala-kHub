import { useEffect, useRef, useState } from 'react'
import { useConversationStore } from '@/stores/conversationStore'
import { useMessageStore } from '@/stores/messageStore'
import { createMockWs } from '@/shared/ws/mockWs'
import type { ServerPushEvent } from '@/shared/api/types'
import type { WsConnectionStatus } from '@/shared/ws/client'

function getWsOptions(): { simulateDisconnect?: boolean; disconnectAfterMs?: number; reconnectAfterMs?: number } {
  const params = new URLSearchParams(window.location.search)
  const scenario = params.get('scenario')
  if (scenario === 'timeout') {
    return { simulateDisconnect: true, disconnectAfterMs: 8_000, reconnectAfterMs: 3_000 }
  }
  return {}
}

export function useWorkbenchWs(): WsConnectionStatus {
  const currentId = useConversationStore((s) => s.currentConversationId)
  const appendMessage = useMessageStore((s) => s.appendMessage)
  const incrementUnread = useConversationStore((s) => s.incrementUnread)

  const wsRef = useRef(createMockWs(getWsOptions()))
  const [wsStatus, setWsStatus] = useState<WsConnectionStatus>('disconnected')

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

  return wsStatus
}
