export type Role = 'sales' | 'lead' | 'supervisor' | 'boss'

export interface CurrentUserDTO {
  tenantId: string
  userId: string
  username: string
  displayName: string
  role: Role
  teamIds: string[]
  capabilities: string[]
}

export interface ConversationDTO {
  conversationId: string
  platform: 'telegram' | 'whatsapp' | 'line' | 'zalo' | string
  chatType: 'single' | 'group'
  accountId: string
  accountDisplayName: string
  customerDisplayName: string
  assignedSalesId: string
  lastMessageText: string
  lastMessageAtMs: number
  unreadCount: number
  tags?: string[]
  stage?: string
  riskLevel?: 'low' | 'medium' | 'high' | 'unknown'
  analysisSummary?: string
}

export interface TagDTO {
  tagId: string
  name: string
  color?: string
  createdAtMs: number
}

export interface MessageDTO {
  messageId: string
  conversationId: string
  platform: string
  accountId: string
  direction: 'inbound' | 'outbound'
  senderId: string
  senderDisplayName: string
  originalText: string
  translatedText?: string
  language?: string
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  imageUrl?: string
  createdAtMs: number
}

export interface SendMessageRequest {
  conversationId: string
  accountId: string
  text: string
  translatedText?: string
  idempotencyKey: string
}

export interface SendMessageResult {
  clientMessageId: string
  serverMessageId?: string
  status: 'pending' | 'sent' | 'failed'
  errorMessage?: string
}

export interface AccountStatusDTO {
  accountId: string
  platform: 'telegram' | 'whatsapp' | string
  displayName: string
  status: 'connected' | 'disconnected' | 'reconnecting' | 'error'
  lastActiveAtMs?: number
  errorMessage?: string
}

export interface AnalysisSummaryDTO {
  conversationId: string
  summary: string
  stage?: string
  trust?: string
  concern?: string
  nextAction?: string
  evidenceRefs: Array<{
    messageId: string
    quote?: string
  }>
  updatedAtMs: number
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResult {
  token: string
  user: CurrentUserDTO
}

export interface ConversationListQuery {
  page?: number
  limit?: number
  platform?: string
  search?: string
  chatType?: 'single' | 'group'
  tags?: string[]
}

export interface ConversationListResult {
  conversations: ConversationDTO[]
  total: number
  hasMore: boolean
}

export interface MessageHistoryQuery {
  conversationId: string
  beforeSeq?: number
  limit?: number
}

export interface MessageHistoryResult {
  messages: MessageDTO[]
  hasMore: boolean
}

export interface TranslatePreviewRequest {
  text: string
  sourceLang: string
  targetLang: string
}

export interface TranslatePreviewResult {
  translatedText: string
  detectedLang?: string
}

export type ServerPushEvent =
  | { type: 'message.received'; payload: MessageDTO }
  | { type: 'message.sent'; payload: MessageDTO }
  | { type: 'message.failed'; payload: { clientMessageId: string; errorMessage: string } }
  | { type: 'account.status_changed'; payload: AccountStatusDTO }
  | { type: 'analysis.updated'; payload: AnalysisSummaryDTO }
  | { type: 'visibility.changed'; payload: { scope: string; version: string } }
  | { type: 'conversation.tag_changed'; payload: { conversationId: string; tags: string[] } }
