import { create } from 'zustand'
import type { MessageDTO } from '@/shared/api/types'

interface MessageState {
  messages: MessageDTO[]
  loading: boolean
  hasMore: boolean
  loadingMore: boolean
  showTranslation: boolean
  setMessages: (messages: MessageDTO[]) => void
  prependMessages: (messages: MessageDTO[]) => void
  appendMessage: (message: MessageDTO) => void
  updateMessageStatus: (messageId: string, status: MessageDTO['status']) => void
  setLoading: (loading: boolean) => void
  setLoadingMore: (loadingMore: boolean) => void
  setHasMore: (hasMore: boolean) => void
  toggleTranslation: () => void
  clear: () => void
}

export const useMessageStore = create<MessageState>((set) => ({
  messages: [],
  loading: false,
  hasMore: false,
  loadingMore: false,
  showTranslation: true,

  setMessages: (messages) => set({ messages }),

  prependMessages: (messages) =>
    set((state) => ({ messages: [...messages, ...state.messages] })),

  appendMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  updateMessageStatus: (messageId, status) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.messageId === messageId ? { ...m, status } : m,
      ),
    })),

  setLoading: (loading) => set({ loading }),
  setLoadingMore: (loadingMore) => set({ loadingMore }),
  setHasMore: (hasMore) => set({ hasMore }),
  toggleTranslation: () => set((state) => ({ showTranslation: !state.showTranslation })),
  clear: () => set({ messages: [], loading: false, hasMore: false, loadingMore: false }),
}))
