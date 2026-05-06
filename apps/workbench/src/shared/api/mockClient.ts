import type { WorkbenchApi } from './client'
import type {
  LoginRequest,
  LoginResult,
  ConversationListQuery,
  ConversationListResult,
  MessageHistoryQuery,
  MessageHistoryResult,
  SendMessageRequest,
  SendMessageResult,
  TranslatePreviewRequest,
  TranslatePreviewResult,
  AnalysisSummaryDTO,
  AccountStatusDTO,
  CurrentUserDTO,
} from './types'
import { mockConversations, mockMessages, mockAccounts, mockAccountsDisconnected, mockAnalysis, mockHistoryMessages, mockSuggestedReplies } from '@/mocks/data'
import type { SuggestedReply, MockScenario } from '@/mocks/data'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function getScenario(): MockScenario {
  const params = new URLSearchParams(window.location.search)
  return (params.get('scenario') as MockScenario) ?? 'normal'
}

export interface MockClientExtended extends WorkbenchApi {
  getSuggestedReplies(conversationId: string): SuggestedReply[]
}

export const mockClient: MockClientExtended = {
  async login(input: LoginRequest): Promise<LoginResult> {
    await delay(500)
    if (input.username === 'sales' && input.password === 'sales') {
      return {
        token: 'mock_jwt_token_sales_001',
        user: {
          tenantId: 'tenant_001',
          userId: 'user_sales_001',
          username: 'sales',
          displayName: '张三',
          role: 'sales',
          teamIds: ['team_001'],
          capabilities: ['message.send', 'message.read'],
        },
      }
    }
    throw new Error('用户名或密码错误')
  },

  async getCurrentUser(): Promise<CurrentUserDTO> {
    const scenario = getScenario()
    if (scenario === 'error') {
      await delay(200)
      throw new Error('KHUB_AUTH_REQUIRED')
    }
    await delay(200)
    return {
      tenantId: 'tenant_001',
      userId: 'user_sales_001',
      username: 'sales',
      displayName: '张三',
      role: 'sales',
      teamIds: ['team_001'],
      capabilities: ['message.send', 'message.read'],
    }
  },

  async listConversations(input: ConversationListQuery): Promise<ConversationListResult> {
    const scenario = getScenario()
    if (scenario === 'empty') {
      await delay(300)
      return { conversations: [], total: 0, hasMore: false }
    }
    if (scenario === 'error') {
      await delay(300)
      throw new Error('KHUB_AUTH_REQUIRED')
    }
    await delay(300)
    let filtered = [...mockConversations]

    if (input.platform) {
      filtered = filtered.filter((c) => c.platform === input.platform)
    }
    if (input.search) {
      const q = input.search.toLowerCase()
      filtered = filtered.filter((c) => c.customerDisplayName.toLowerCase().includes(q))
    }

    return {
      conversations: filtered,
      total: filtered.length,
      hasMore: false,
    }
  },

  async listMessages(input: MessageHistoryQuery): Promise<MessageHistoryResult> {
    const scenario = getScenario()
    if (scenario === 'empty') {
      await delay(400)
      return { messages: [], hasMore: false }
    }
    await delay(400)
    const messages = mockMessages[input.conversationId] ?? []
    if (input.beforeSeq) {
      const history = mockHistoryMessages[input.conversationId] ?? []
      return {
        messages: history,
        hasMore: false,
      }
    }
    return {
      messages,
      hasMore: Boolean(mockHistoryMessages[input.conversationId]?.length),
    }
  },

  async sendMessage(input: SendMessageRequest): Promise<SendMessageResult> {
    await delay(1000 + Math.random() * 2000)
    const shouldFail = Math.random() < 0.2
    if (shouldFail) {
      return {
        clientMessageId: input.idempotencyKey,
        status: 'failed',
        errorMessage: '网络超时，请重试',
      }
    }
    return {
      clientMessageId: input.idempotencyKey,
      serverMessageId: `srv_${Date.now()}`,
      status: 'sent',
    }
  },

  async translatePreview(input: TranslatePreviewRequest): Promise<TranslatePreviewResult> {
    const scenario = getScenario()
    const translateDelay = scenario === 'timeout' ? 4000 : 800
    await delay(translateDelay)
    if (scenario === 'timeout' && Math.random() < 0.3) {
      throw new Error('翻译服务超时，请稍后重试')
    }
    const fakeTranslations: Record<string, string> = {
      ru: `[RU] ${input.text}`,
      en: `[EN] ${input.text}`,
      es: `[ES] ${input.text}`,
    }
    return {
      translatedText: fakeTranslations[input.targetLang] ?? `[${input.targetLang}] ${input.text}`,
      detectedLang: input.sourceLang,
    }
  },

  async getAnalysisSummary(conversationId: string): Promise<AnalysisSummaryDTO> {
    await delay(300)
    const analysis = mockAnalysis[conversationId]
    if (analysis) return analysis
    return {
      conversationId,
      summary: '暂无分析数据',
      evidenceRefs: [],
      updatedAtMs: Date.now(),
    }
  },

  async listAccounts(): Promise<AccountStatusDTO[]> {
    const scenario = getScenario()
    await delay(200)
    if (scenario === 'timeout') {
      return mockAccountsDisconnected
    }
    return mockAccounts
  },

  getSuggestedReplies(conversationId: string): SuggestedReply[] {
    return mockSuggestedReplies[conversationId] ?? []
  },
}
