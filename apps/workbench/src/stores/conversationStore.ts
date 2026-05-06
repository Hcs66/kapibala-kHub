import { create } from 'zustand'
import type { ConversationDTO } from '@/shared/api/types'

interface ConversationState {
  conversations: ConversationDTO[]
  currentConversationId: string | null
  loading: boolean
  setConversations: (conversations: ConversationDTO[]) => void
  switchConversation: (id: string) => void
  clearUnread: (id: string) => void
  incrementUnread: (id: string) => void
  setLoading: (loading: boolean) => void
}

export const useConversationStore = create<ConversationState>((set) => ({
  conversations: [],
  currentConversationId: null,
  loading: false,

  setConversations: (conversations) => set({ conversations }),

  switchConversation: (id) =>
    set((state) => ({
      currentConversationId: id,
      conversations: state.conversations.map((c) =>
        c.conversationId === id ? { ...c, unreadCount: 0 } : c,
      ),
    })),

  clearUnread: (id) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.conversationId === id ? { ...c, unreadCount: 0 } : c,
      ),
    })),

  incrementUnread: (id) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.conversationId === id ? { ...c, unreadCount: c.unreadCount + 1 } : c,
      ),
    })),

  setLoading: (loading) => set({ loading }),
}))
