import { create } from 'zustand'
import type { ConversationDTO } from '@/shared/api/types'
import { mockClient } from '@/shared/api/mockClient'

type ChatTypeFilter = 'all' | 'single' | 'group'

interface ConversationState {
  conversations: ConversationDTO[]
  currentConversationId: string | null
  loading: boolean
  chatTypeFilter: ChatTypeFilter
  activeFilterOn: boolean
  selectedTagIds: string[]
  setConversations: (conversations: ConversationDTO[]) => void
  switchConversation: (id: string) => void
  clearUnread: (id: string) => void
  incrementUnread: (id: string) => void
  setLoading: (loading: boolean) => void
  setChatTypeFilter: (filter: ChatTypeFilter) => void
  setActiveFilter: (on: boolean) => void
  setSelectedTags: (tagIds: string[]) => void
  toggleTag: (tagId: string) => void
  addTagToConversation: (conversationId: string, tagId: string) => Promise<void>
  removeTagFromConversation: (conversationId: string, tagId: string) => Promise<void>
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  loading: false,
  chatTypeFilter: 'all',
  activeFilterOn: false,
  selectedTagIds: [],

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

  setChatTypeFilter: (chatTypeFilter) => set({ chatTypeFilter }),

  setActiveFilter: (activeFilterOn) => {
    if (activeFilterOn) {
      set({ activeFilterOn, selectedTagIds: [] })
    } else {
      set({ activeFilterOn })
    }
  },

  setSelectedTags: (selectedTagIds) => set({ selectedTagIds, activeFilterOn: false }),

  toggleTag: (tagId) => {
    const { selectedTagIds } = get()
    const next = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId]
    set({ selectedTagIds: next, activeFilterOn: false })
  },

  addTagToConversation: async (conversationId, tagId) => {
    await mockClient.addTagToConversation(conversationId, tagId)
    set((state) => ({
      conversations: state.conversations.map((c) => {
        if (c.conversationId !== conversationId) return c
        const tags = c.tags ? [...c.tags] : []
        if (!tags.includes(tagId)) tags.push(tagId)
        return { ...c, tags }
      }),
    }))
  },

  removeTagFromConversation: async (conversationId, tagId) => {
    await mockClient.removeTagFromConversation(conversationId, tagId)
    set((state) => ({
      conversations: state.conversations.map((c) => {
        if (c.conversationId !== conversationId) return c
        return { ...c, tags: (c.tags ?? []).filter((t) => t !== tagId) }
      }),
    }))
  },
}))
