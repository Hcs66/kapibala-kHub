import type { ServerPushEvent } from '@/shared/api/types'
import type { WorkbenchWs, WsConnectionStatus, WsEventHandler } from './client'

const MOCK_INBOUND_MESSAGES = [
  {
    type: 'message.received' as const,
    payload: {
      messageId: `mock_inbound_${Date.now()}`,
      conversationId: 'telegram::100001',
      platform: 'telegram',
      accountId: 'acc_tg_01',
      direction: 'inbound' as const,
      senderId: 'customer_100001',
      senderDisplayName: '客户 A-382',
      originalText: 'Когда вы сможете отправить образцы?',
      translatedText: '你们什么时候能寄样品？',
      language: 'ru',
      createdAtMs: Date.now(),
    },
  },
]

export function createMockWs(): WorkbenchWs {
  let status: WsConnectionStatus = 'disconnected'
  const statusHandlers: Array<(s: WsConnectionStatus) => void> = []
  const eventHandlers: WsEventHandler[] = []
  let intervalId: ReturnType<typeof setInterval> | null = null

  function setStatus(newStatus: WsConnectionStatus): void {
    status = newStatus
    statusHandlers.forEach((h) => h(newStatus))
  }

  function emitEvent(event: ServerPushEvent): void {
    eventHandlers.forEach((h) => h(event))
  }

  return {
    connect(_token: string): void {
      setStatus('connecting')
      setTimeout(() => {
        setStatus('connected')

        intervalId = setInterval(() => {
          const event = MOCK_INBOUND_MESSAGES[Math.floor(Math.random() * MOCK_INBOUND_MESSAGES.length)]
          if (event) {
            emitEvent({
              ...event,
              payload: {
                ...event.payload,
                messageId: `mock_inbound_${Date.now()}`,
                createdAtMs: Date.now(),
              },
            })
          }
        }, 15_000)
      }, 500)
    },

    disconnect(): void {
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
      setStatus('disconnected')
    },

    getStatus(): WsConnectionStatus {
      return status
    },

    onStatusChange(handler: (s: WsConnectionStatus) => void): () => void {
      statusHandlers.push(handler)
      return () => {
        const idx = statusHandlers.indexOf(handler)
        if (idx >= 0) statusHandlers.splice(idx, 1)
      }
    },

    onEvent(handler: WsEventHandler): () => void {
      eventHandlers.push(handler)
      return () => {
        const idx = eventHandlers.indexOf(handler)
        if (idx >= 0) eventHandlers.splice(idx, 1)
      }
    },

    send(_command: string, _data: unknown): void {},
  }
}
