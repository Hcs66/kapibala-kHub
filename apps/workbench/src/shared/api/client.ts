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
  TagDTO,
} from './types'

export interface WorkbenchApi {
  login(input: LoginRequest): Promise<LoginResult>
  getCurrentUser(): Promise<CurrentUserDTO>
  listConversations(input: ConversationListQuery): Promise<ConversationListResult>
  listMessages(input: MessageHistoryQuery): Promise<MessageHistoryResult>
  sendMessage(input: SendMessageRequest): Promise<SendMessageResult>
  translatePreview(input: TranslatePreviewRequest): Promise<TranslatePreviewResult>
  getAnalysisSummary(conversationId: string): Promise<AnalysisSummaryDTO>
  listAccounts(): Promise<AccountStatusDTO[]>
  listTags(): Promise<TagDTO[]>
  createTag(input: { name: string; color?: string }): Promise<TagDTO>
  deleteTag(tagId: string): Promise<void>
  addTagToConversation(conversationId: string, tagId: string): Promise<void>
  removeTagFromConversation(conversationId: string, tagId: string): Promise<void>
}

export type { WorkbenchApi as default }
