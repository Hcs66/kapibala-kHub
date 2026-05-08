import type { ServerPushEvent, AccountStatusDTO, AnalysisSummaryDTO, MessageDTO } from '@/shared/api/types'
import type { WorkbenchWs, WsConnectionStatus, WsEventHandler } from './client'

const MOCK_INBOUND_MESSAGES: ServerPushEvent[] = [
  {
    type: 'message.received',
    payload: {
      messageId: `mock_inbound_${Date.now()}`,
      conversationId: 'telegram::100001',
      platform: 'telegram',
      accountId: 'acc_tg_01',
      direction: 'inbound',
      senderId: 'customer_100001',
      senderDisplayName: '客户 A-382',
      originalText: 'Когда вы сможете отправить образцы?',
      translatedText: '你们什么时候能寄样品？',
      language: 'ru',
      createdAtMs: Date.now(),
    },
  },
]

const MOCK_ACCOUNT_STATUS_EVENTS: ServerPushEvent[] = [
  {
    type: 'account.status_changed',
    payload: {
      accountId: 'acc_tg_01',
      platform: 'telegram',
      displayName: 'TG 销售号1',
      status: 'disconnected',
      lastActiveAtMs: Date.now(),
      errorMessage: 'Session expired',
    } satisfies AccountStatusDTO,
  },
  {
    type: 'account.status_changed',
    payload: {
      accountId: 'acc_tg_01',
      platform: 'telegram',
      displayName: 'TG 销售号1',
      status: 'connected',
      lastActiveAtMs: Date.now(),
    } satisfies AccountStatusDTO,
  },
]

const MOCK_ANALYSIS_EVENT: ServerPushEvent = {
  type: 'analysis.updated',
  payload: {
    conversationId: 'telegram::100001',
    summary: '客户对样品发货时间有明确需求，建议尽快提供物流方案。',
    stage: '需求探询',
    trust: '中等',
    concern: '交付时效',
    nextAction: '提供样品发货时间表',
    evidenceRefs: [{ messageId: 'mock_inbound_latest', quote: '你们什么时候能寄样品？' }],
    updatedAtMs: Date.now(),
  } satisfies AnalysisSummaryDTO,
}

export interface MockWsOptions {
  simulateDisconnect?: boolean
  disconnectAfterMs?: number
  reconnectAfterMs?: number
}

interface PendingSend {
  clientMessageId: string
  conversationId: string
  text: string
  accountId: string
}

export function createMockWs(options: MockWsOptions = {}): WorkbenchWs {
  let status: WsConnectionStatus = 'disconnected'
  const statusHandlers: Array<(s: WsConnectionStatus) => void> = []
  const eventHandlers: WsEventHandler[] = []
  let intervalId: ReturnType<typeof setInterval> | null = null
  let disconnectTimerId: ReturnType<typeof setTimeout> | null = null
  let reconnectTimerId: ReturnType<typeof setTimeout> | null = null
  let accountEventTimerId: ReturnType<typeof setTimeout> | null = null
  let analysisEventTimerId: ReturnType<typeof setTimeout> | null = null

  function setStatus(newStatus: WsConnectionStatus): void {
    status = newStatus
    statusHandlers.forEach((h) => h(newStatus))
  }

  function emitEvent(event: ServerPushEvent): void {
    eventHandlers.forEach((h) => h(event))
  }

  function scheduleAccountEvents(): void {
    accountEventTimerId = setTimeout(() => {
      const disconnectEvt = MOCK_ACCOUNT_STATUS_EVENTS[0]
      if (disconnectEvt) {
        const payload = disconnectEvt.payload as AccountStatusDTO
        const event: ServerPushEvent = {
          type: 'account.status_changed',
          payload: { ...payload, lastActiveAtMs: Date.now() },
        }
        emitEvent(event)
      }

      setTimeout(() => {
        const reconnectEvt = MOCK_ACCOUNT_STATUS_EVENTS[1]
        if (reconnectEvt) {
          const payload = reconnectEvt.payload as AccountStatusDTO
          const event: ServerPushEvent = {
            type: 'account.status_changed',
            payload: { ...payload, lastActiveAtMs: Date.now() },
          }
          emitEvent(event)
        }
      }, 5_000)
    }, 25_000)
  }

  function scheduleAnalysisEvent(): void {
    analysisEventTimerId = setTimeout(() => {
      const payload = MOCK_ANALYSIS_EVENT.payload as AnalysisSummaryDTO
      const event: ServerPushEvent = {
        type: 'analysis.updated',
        payload: { ...payload, updatedAtMs: Date.now() },
      }
      emitEvent(event)
    }, 20_000)
  }

  function simulateMessageSend(pending: PendingSend): void {
    const shouldFail = Math.random() < 0.2
    const delay = 1000 + Math.random() * 2000

    setTimeout(() => {
      if (shouldFail) {
        const failEvent: ServerPushEvent = {
          type: 'message.failed',
          payload: {
            clientMessageId: pending.clientMessageId,
            errorMessage: '网络超时，请重试',
          },
        }
        emitEvent(failEvent)
      } else {
        const sentMessage: MessageDTO = {
          messageId: `srv_${Date.now()}`,
          conversationId: pending.conversationId,
          platform: 'telegram',
          accountId: pending.accountId,
          direction: 'outbound',
          senderId: 'user_sales_001',
          senderDisplayName: '张三',
          originalText: pending.text,
          status: 'sent',
          createdAtMs: Date.now(),
        }
        const sentEvent: ServerPushEvent = {
          type: 'message.sent',
          payload: sentMessage,
        }
        emitEvent(sentEvent)
      }
    }, delay)
  }

  return {
    connect(_token: string): void {
      setStatus('connecting')
      setTimeout(() => {
        setStatus('connected')

        intervalId = setInterval(() => {
          const event = MOCK_INBOUND_MESSAGES[Math.floor(Math.random() * MOCK_INBOUND_MESSAGES.length)]
          if (event) {
            const payload = event.payload as MessageDTO
            const inboundEvent: ServerPushEvent = {
              type: 'message.received',
              payload: {
                ...payload,
                messageId: `mock_inbound_${Date.now()}`,
                createdAtMs: Date.now(),
              },
            }
            emitEvent(inboundEvent)
          }
        }, 15_000)

        scheduleAccountEvents()
        scheduleAnalysisEvent()

        if (options.simulateDisconnect) {
          const disconnectDelay = options.disconnectAfterMs ?? 10_000
          disconnectTimerId = setTimeout(() => {
            if (intervalId) {
              clearInterval(intervalId)
              intervalId = null
            }
            setStatus('disconnected')

            const reconnectDelay = options.reconnectAfterMs ?? 5_000
            setTimeout(() => {
              setStatus('reconnecting')
              reconnectTimerId = setTimeout(() => {
                setStatus('connected')
                intervalId = setInterval(() => {
                  const evt = MOCK_INBOUND_MESSAGES[0]
                  if (evt) {
                    const payload = evt.payload as MessageDTO
                    const inboundEvt: ServerPushEvent = {
                      type: 'message.received',
                      payload: {
                        ...payload,
                        messageId: `mock_inbound_${Date.now()}`,
                        createdAtMs: Date.now(),
                      },
                    }
                    emitEvent(inboundEvt)
                  }
                }, 15_000)
              }, 2_000)
            }, reconnectDelay)
          }, disconnectDelay)
        }
      }, 500)
    },

    disconnect(): void {
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
      if (disconnectTimerId) {
        clearTimeout(disconnectTimerId)
        disconnectTimerId = null
      }
      if (reconnectTimerId) {
        clearTimeout(reconnectTimerId)
        reconnectTimerId = null
      }
      if (accountEventTimerId) {
        clearTimeout(accountEventTimerId)
        accountEventTimerId = null
      }
      if (analysisEventTimerId) {
        clearTimeout(analysisEventTimerId)
        analysisEventTimerId = null
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

    send(command: string, data: unknown): void {
      if (command === 'message.send') {
        const payload = data as PendingSend
        simulateMessageSend(payload)
      }
    },
  }
}
