import { create } from 'zustand'
import type { MessageDTO } from '@/shared/api/types'

interface MessageState {
  messages: MessageDTO[]
  loading: boolean
  hasMore: boolean
  showTranslation: boolean
  setMessages: (messages: MessageDTO[]) => void
  appendMessage: (message: MessageDTO) => void
  updateMessageStatus: (messageId: string, status: MessageDTO['status']) => void
  setLoading: (loading: boolean) => void
  setHasMore: (hasMore: boolean) => void
  toggleTranslation: () => void
  clear: () => void
}

export const useMessageStore = create<MessageState>((set) => ({
  messages: [],
  loading: false,
  hasMore: false,
  showTranslation: true,

  setMessages: (messages) => set({ messages }),

  appendMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  updateMessageStatus: (messageId, status) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.messageId === messageId ? { ...m, status } : m,
      ),
    })),

  setLoading: (loading) => set({ loading }),
  setHasMore: (hasMore) => set({ hasMore }),
  toggleTranslation: () => set((state) => ({ showTranslation: !state.showTranslation })),
  clear: () => set({ messages: [], loading: false, hasMore: false }),
}))
