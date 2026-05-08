import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Brain, Sparkles, User, Clock } from 'lucide-react'
import type { AnalysisSummaryDTO, CustomerProfileDTO, IntentPredictionDTO, DealSuggestionDTO, ActionSuggestionDTO, TimelineEventDTO } from '@/shared/api/types'
import type { SuggestedReply } from '@/mocks/data'
import { InsightsPanel } from './InsightsPanel'
import { ProfilePanel } from './ProfilePanel'
import { TimelinePanel } from './TimelinePanel'

type SidebarTab = 'insights' | 'profile' | 'timeline'

interface AnalysisSidebarProps {
  analysis: AnalysisSummaryDTO | null
  loading?: boolean
  suggestedReplies?: SuggestedReply[]
  onSuggestedReplyClick?: (text: string) => void
  onActionExecute?: (action: ActionSuggestionDTO['actions'][number]) => void
  customerProfile?: CustomerProfileDTO | null
  intentPrediction?: IntentPredictionDTO | null
  dealSuggestion?: DealSuggestionDTO | null
  actionSuggestions?: ActionSuggestionDTO | null
  timelineEvents?: TimelineEventDTO[]
}

const TAB_ICONS: Record<SidebarTab, React.ReactNode> = {
  insights: <Sparkles className="h-3.5 w-3.5" />,
  profile: <User className="h-3.5 w-3.5" />,
  timeline: <Clock className="h-3.5 w-3.5" />,
}

export function AnalysisSidebar({
  analysis,
  loading,
  suggestedReplies,
  onSuggestedReplyClick,
  onActionExecute,
  customerProfile,
  intentPrediction,
  dealSuggestion,
  actionSuggestions,
  timelineEvents,
}: AnalysisSidebarProps): React.ReactElement {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<SidebarTab>('insights')

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-xs text-muted-foreground">{t('analysis.loadingAnalysis')}</p>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4">
        <Brain className="h-8 w-8 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">{t('analysis.selectToShow')}</p>
      </div>
    )
  }

  const tabs: { key: SidebarTab; label: string }[] = [
    { key: 'insights', label: t('sidebar.tabInsights') },
    { key: 'profile', label: t('sidebar.tabProfile') },
    { key: 'timeline', label: t('sidebar.tabTimeline') },
  ]

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 border-b border-outline-variant bg-surface-container-lowest rounded-t-xl">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-2.5 text-[12px] font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-b-2 border-primary text-primary'
                : 'text-on-surface-variant hover:text-foreground hover:bg-surface-container-low'
            }`}
          >
            {TAB_ICONS[tab.key]}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto overflow-x-hidden p-xs">
        {activeTab === 'insights' && (
          <InsightsPanel
            intent={intentPrediction ?? null}
            deal={dealSuggestion ?? null}
            actions={actionSuggestions ?? null}
            analysis={analysis}
            suggestedReplies={suggestedReplies}
            onSuggestedReplyClick={onSuggestedReplyClick}
            onActionExecute={onActionExecute}
          />
        )}
        {activeTab === 'profile' && (
          <ProfilePanel profile={customerProfile ?? null} />
        )}
        {activeTab === 'timeline' && (
          <TimelinePanel events={timelineEvents ?? []} />
        )}
      </div>
    </div>
  )
}
