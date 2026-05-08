import { create } from 'zustand'
import type { AnalysisSummaryDTO } from '@/shared/api/types'
import { apiClient } from '@/shared/api'

interface AnalysisState {
  analysis: AnalysisSummaryDTO | null
  loading: boolean
  fetchAnalysis: (conversationId: string) => Promise<void>
  updateAnalysis: (analysis: AnalysisSummaryDTO) => void
  clear: () => void
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  analysis: null,
  loading: false,

  fetchAnalysis: async (conversationId) => {
    set({ loading: true })
    const analysis = await apiClient.getAnalysisSummary(conversationId)
    set({ analysis, loading: false })
  },

  updateAnalysis: (analysis) => {
    const current = get().analysis
    if (current && current.conversationId === analysis.conversationId) {
      set({ analysis })
    }
  },

  clear: () => set({ analysis: null, loading: false }),
}))
