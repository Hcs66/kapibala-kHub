import type { AnalysisSummaryDTO } from '@/shared/api/types'
import { Brain, TrendingUp, Sparkles, MessageCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { SuggestedReply } from '@/mocks/data'

interface AnalysisSidebarProps {
  analysis: AnalysisSummaryDTO | null
  loading?: boolean
  suggestedReplies?: SuggestedReply[]
  onSuggestedReplyClick?: (text: string) => void
}

export function AnalysisSidebar({ analysis, loading, suggestedReplies, onSuggestedReplyClick }: AnalysisSidebarProps): React.ReactElement {
  const { t } = useTranslation()
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

  return (
    <div className="flex flex-1 flex-col gap-md overflow-y-auto custom-scrollbar pb-md">
      {analysis.stage && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-soft">
          <div className="mb-sm flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-tertiary" />
            <h3 className="text-[14px] font-semibold text-foreground">{t('analysis.stage')}</h3>
          </div>
          <div className="flex items-center justify-between">
            <span className="rounded-full border border-primary/20 bg-primary-fixed px-3 py-1 text-[12px] font-bold text-primary">
              {analysis.stage}
            </span>
            <span className="text-[11px] font-semibold tracking-wide text-on-surface-variant">
              {t('analysis.probability')}: 75%
            </span>
          </div>
          <div className="mt-md h-[6px] w-full overflow-hidden rounded-full bg-surface-container-highest">
            <div className="h-[6px] rounded-full bg-primary" style={{ width: '75%' }} />
          </div>
        </div>
      )}

      <div className="ai-border rounded-xl p-md shadow-ai-glow relative">
        <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-primary-fixed-dim/30 blur-xl" />
        <div className="relative z-10 mb-sm flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h3 className="text-[14px] font-semibold text-foreground">{t('analysis.sentiment')}</h3>
          </div>
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="relative z-10 mb-2 flex items-end gap-2">
          <span className="text-[28px] font-bold leading-none text-foreground">82%</span>
          <span className="mb-1 text-sm font-medium text-green-600">{t('analysis.positive')}</span>
        </div>
        <p className="relative z-10 text-[12px] leading-relaxed text-on-surface-variant">
          {analysis.summary}
        </p>
        {analysis.trust && (
          <div className="relative z-10 mt-sm flex gap-2">
            <span className="rounded bg-surface-container px-2 py-1 text-[9px] font-semibold tracking-wide text-on-surface-variant">
              {analysis.trust}
            </span>
          </div>
        )}
      </div>

      {suggestedReplies && suggestedReplies.length > 0 && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-soft flex-1">
          <div className="mb-md flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-secondary" />
            <h3 className="text-[14px] font-semibold text-foreground">{t('analysis.suggestedReplies')}</h3>
          </div>
          <div className="flex flex-col gap-sm">
            {suggestedReplies.map((reply) => (
              <button
                key={reply.id}
                type="button"
                onClick={() => onSuggestedReplyClick?.(reply.text)}
                className="group flex flex-col gap-1 rounded-lg border border-outline-variant/60 p-sm text-left transition-all hover:border-primary hover:bg-surface-container-low"
              >
                <span className="text-[11px] font-medium text-primary group-hover:text-primary-dim">
                  {t('analysis.suggestion')}
                </span>
                <span className="line-clamp-2 text-[12px] text-on-surface-variant">
                  {reply.text}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {analysis.concern && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-soft">
          <h3 className="mb-sm text-[10px] font-semibold uppercase tracking-wider text-outline">
            {t('analysis.accountOverview')}
          </h3>
          <ul className="flex flex-col gap-2">
            <li className="flex items-center justify-between">
              <span className="text-[12px] text-on-surface-variant">{t('analysis.concern')}</span>
              <span className="text-[12px] font-medium text-foreground">{analysis.concern}</span>
            </li>
            {analysis.nextAction && (
              <li className="flex items-center justify-between">
                <span className="text-[12px] text-on-surface-variant">{t('analysis.nextAction')}</span>
                <span className="text-[12px] font-medium text-foreground">{analysis.nextAction}</span>
              </li>
            )}
          </ul>
        </div>
      )}

      {analysis.evidenceRefs.length > 0 && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-soft">
          <p className="mb-sm text-[10px] font-semibold uppercase tracking-wider text-outline">{t('analysis.evidence')}</p>
          <div className="flex flex-col gap-1.5">
            {analysis.evidenceRefs.map((ref) => (
              <div key={ref.messageId} className="rounded-md border border-outline-variant/40 bg-surface-container-low px-2.5 py-1.5">
                <p className="text-xs italic text-muted-foreground">"{ref.quote}"</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
