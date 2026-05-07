import { create } from 'zustand'
import type { TagDTO } from '@/shared/api/types'
import { mockClient } from '@/shared/api/mockClient'

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
    const tags = await mockClient.listTags()
    set({ tags, loading: false })
  },

  createTag: async (name, color) => {
    const newTag = await mockClient.createTag({ name, color })
    set({ tags: [...get().tags, newTag] })
    return newTag
  },

  deleteTag: async (tagId) => {
    await mockClient.deleteTag(tagId)
    set({ tags: get().tags.filter((t) => t.tagId !== tagId) })
  },
}))
