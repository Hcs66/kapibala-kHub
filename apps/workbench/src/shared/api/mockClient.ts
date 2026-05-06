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
import { mockConversations, mockMessages, mockAccounts, mockAnalysis } from '@/mocks/data'

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export const mockClient: WorkbenchApi = {
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
    await delay(400)
    const messages = mockMessages[input.conversationId] ?? []
    return {
      messages,
      hasMore: false,
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
    await delay(800)
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
    await delay(200)
    return mockAccounts
  },
}
