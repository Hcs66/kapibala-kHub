import { create } from 'zustand'
import type { TagDTO } from '@/shared/api/types'
import { apiClient } from '@/shared/api'

interface TagState {
  tags: TagDTO[]
  loading: boolean
  fetchTags: () => Promise<void>
  createTag: (name: string, color?: string) => Promise<TagDTO>
  deleteTag: (tagId: string) => Promise<void>
}

export const useTagStore = create<TagState>((set, get) => ({
  tags: [],
  loading: false,

  fetchTags: async () => {
    set({ loading: true })
    const tags = await apiClient.listTags()
    set({ tags, loading: false })
  },

  createTag: async (name, color) => {
    const newTag = await apiClient.createTag({ name, color })
    set({ tags: [...get().tags, newTag] })
    return newTag
  },

  deleteTag: async (tagId) => {
    await apiClient.deleteTag(tagId)
    set({ tags: get().tags.filter((t) => t.tagId !== tagId) })
  },
}))
