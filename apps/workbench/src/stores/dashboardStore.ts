import { create } from 'zustand'
import type {
  DashboardTask,
  NextAction,
  PipelineSnapshot,
  UnreadConversation,
  PerformanceMetrics,
  ActivityEvent,
  MetricPeriod,
} from '@/features/dashboard/types'
import { apiClient } from '@/shared/api'

interface DashboardState {
  tasks: DashboardTask[]
  nextActions: NextAction[]
  pipeline: PipelineSnapshot | null
  unreadConversations: UnreadConversation[]
  metrics: PerformanceMetrics | null
  recentActivity: ActivityEvent[]
  period: MetricPeriod
  loading: boolean
  error: string | null

  setPeriod: (period: MetricPeriod) => void
  fetchDashboard: () => Promise<void>
  completeTask: (taskId: string) => void
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  tasks: [],
  nextActions: [],
  pipeline: null,
  unreadConversations: [],
  metrics: null,
  recentActivity: [],
  period: 'week',
  loading: false,
  error: null,

  setPeriod: (period: MetricPeriod) => {
    set({ period })
    get().fetchDashboard()
  },

  fetchDashboard: async () => {
    set({ loading: true, error: null })
    try {
      const data = await apiClient.getDashboardSummary(get().period)
      set({
        tasks: data.tasks,
        nextActions: data.nextActions,
        pipeline: data.pipeline,
        unreadConversations: data.unreadConversations,
        metrics: data.metrics,
        recentActivity: data.recentActivity,
        loading: false,
      })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  completeTask: (taskId: string) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.taskId === taskId ? { ...t, status: 'completed' as const } : t
      ),
    }))
  },
}))
