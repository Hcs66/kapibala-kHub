export type TaskPriority = 'critical' | 'high' | 'medium' | 'low'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue'
export type TaskSource = 'manual' | 'rule_engine' | 'ai_next_action'

export type NextActionType =
  | 'reply'
  | 'send_quote'
  | 'schedule_demo'
  | 'followup'
  | 'send_sample'
  | 'request_payment'
  | 'escalate'
  | 'close_lost'
  | 'send_catalog'

export type LeadStage = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
export type OpportunityStage = 'discovery' | 'qualification' | 'demo' | 'proposal' | 'negotiation' | 'won' | 'lost'

export type MetricPeriod = 'today' | 'week' | 'month'

export type ActivityType =
  | 'message_received'
  | 'message_sent'
  | 'task_completed'
  | 'lead_stage_changed'
  | 'opportunity_stage_changed'
  | 'deal_won'
  | 'deal_lost'

// --- Task Queue ---

export interface DashboardTask {
  taskId: string
  title: string
  description?: string
  priority: TaskPriority
  status: TaskStatus
  source: TaskSource
  leadName?: string
  leadId?: string
  conversationId?: string
  dueAtMs: number
  createdAtMs: number
}

// --- Next Actions ---

export interface NextAction {
  actionId: string
  type: NextActionType
  label: string
  description: string
  confidence: number // 0-100
  leadName: string
  leadId?: string
  conversationId?: string
  reasoning: string
  createdAtMs: number
}

// --- Pipeline ---

export interface PipelineStageCount {
  stage: string
  label: string
  count: number
  value?: number // total deal value in this stage
  currency?: string
}

export interface PipelineSnapshot {
  leads: PipelineStageCount[]
  opportunities: PipelineStageCount[]
}

// --- Unread & Pending ---

export interface UnreadConversation {
  conversationId: string
  customerName: string
  platform: 'telegram' | 'whatsapp' | string
  unreadCount: number
  waitingSinceMs: number
  lastMessagePreview: string
  personId?: string
}

// --- Performance Metrics ---

export interface MetricCard {
  key: string
  labelKey: string
  value: number
  unit?: string
  trend: number // percentage change vs previous period, positive = up
  period: MetricPeriod
}

export interface PerformanceMetrics {
  metrics: MetricCard[]
  period: MetricPeriod
}

// --- Recent Activity ---

export interface ActivityEvent {
  eventId: string
  type: ActivityType
  title: string
  description?: string
  relatedName?: string
  relatedId?: string
  createdAtMs: number
}

// --- Dashboard Summary (API response) ---

export interface DashboardSummaryDTO {
  tasks: DashboardTask[]
  nextActions: NextAction[]
  pipeline: PipelineSnapshot
  unreadConversations: UnreadConversation[]
  metrics: PerformanceMetrics
  recentActivity: ActivityEvent[]
}
