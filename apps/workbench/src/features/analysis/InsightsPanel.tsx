import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles, Target, DollarSign, Zap, ChevronDown, ChevronUp, Info, Brain, MessageCircle, Play } from 'lucide-react'
import type { IntentPredictionDTO, DealSuggestionDTO, ActionSuggestionDTO, AnalysisSummaryDTO } from '@/shared/api/types'
import type { SuggestedReply } from '@/mocks/data'

interface InsightsPanelProps {
  intent: IntentPredictionDTO | null
  deal: DealSuggestionDTO | null
  actions: ActionSuggestionDTO | null
  analysis: AnalysisSummaryDTO | null
  suggestedReplies?: SuggestedReply[]
  onSuggestedReplyClick?: (text: string) => void
  onActionExecute?: (action: ActionSuggestionDTO['actions'][number]) => void
}

function ConfidenceBar({ value }: { value: number }): React.ReactElement {
  const percent = Math.round(value * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-surface-container-highest">
        <div
          className="h-[6px] rounded-full bg-primary transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-[11px] font-semibold text-primary">{percent}%</span>
    </div>
  )
}

function ReasoningToggle({ reasoning }: { reasoning: string }): React.ReactElement {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-sm">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary-dim transition-colors"
      >
        <Info className="h-3 w-3" />
        {t('sidebar.insights.viewReasoning')}
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {open && (
        <p className="mt-1.5 rounded-md bg-ai-tint px-2.5 py-2 text-[11px] leading-relaxed text-on-surface-variant">
          {reasoning}
        </p>
      )}
    </div>
  )
}

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-slate-50 text-slate-600 border-slate-200',
}

export function InsightsPanel({ intent, deal, actions, analysis, suggestedReplies, onSuggestedReplyClick, onActionExecute }: InsightsPanelProps): React.ReactElement {
  const { t } = useTranslation()

  if (!intent && !deal && !actions && !analysis) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4">
        <Sparkles className="h-8 w-8 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">{t('analysis.selectToShow')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-md">
      {intent && (
        <div className="ai-border rounded-xl p-md shadow-ai-glow relative">
          <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-primary-fixed-dim/30 blur-xl" />
          <div className="relative z-10">
            <div className="mb-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <h3 className="text-[13px] font-semibold text-foreground">{t('sidebar.insights.intentPrediction')}</h3>
              <Sparkles className="ml-auto h-3.5 w-3.5 text-primary" />
            </div>
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full border border-primary/20 bg-primary-fixed px-2.5 py-0.5 text-[12px] font-bold text-primary">
                {intent.intent}
              </span>
            </div>
            <div className="mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-outline">
                {t('sidebar.insights.confidence')}
              </span>
            </div>
            <ConfidenceBar value={intent.confidence} />
            {analysis && (
              <div className="mt-sm">
                <p className="text-[12px] leading-relaxed text-on-surface-variant">
                  {analysis.summary}
                </p>
                {analysis.trust && (
                  <div className="mt-1.5 flex gap-2">
                    <span className="rounded bg-surface-container px-2 py-1 text-[9px] font-semibold tracking-wide text-on-surface-variant">
                      {t('analysis.trust')}: {analysis.trust}
                    </span>
                  </div>
                )}
              </div>
            )}
            {(intent.relatedLeadIds?.length || intent.relatedOpportunityIds?.length) && (
              <div className="mt-sm flex flex-wrap gap-1.5">
                {intent.relatedLeadIds?.map((id) => (
                  <span key={id} className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                    {t('sidebar.insights.relatedLeads')}
                  </span>
                ))}
                {intent.relatedOpportunityIds?.map((id) => (
                  <span key={id} className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                    {t('sidebar.insights.relatedOpportunities')}
                  </span>
                ))}
              </div>
            )}
            <ReasoningToggle reasoning={intent.reasoning} />
          </div>
        </div>
      )}

      {!intent && analysis && (
        <div className="ai-border rounded-xl p-md shadow-ai-glow relative">
          <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-primary-fixed-dim/30 blur-xl" />
          <div className="relative z-10">
            <div className="mb-sm flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <h3 className="text-[13px] font-semibold text-foreground">{t('analysis.summary')}</h3>
              <Sparkles className="ml-auto h-3.5 w-3.5 text-primary" />
            </div>
            <p className="text-[12px] leading-relaxed text-on-surface-variant">
              {analysis.summary}
            </p>
            {analysis.trust && (
              <div className="mt-sm flex gap-2">
                <span className="rounded bg-surface-container px-2 py-1 text-[9px] font-semibold tracking-wide text-on-surface-variant">
                  {t('analysis.trust')}: {analysis.trust}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {deal && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-soft">
          <div className="mb-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-tertiary" />
            <h3 className="text-[13px] font-semibold text-foreground">{t('sidebar.insights.dealSuggestion')}</h3>
          </div>
          <div className="mb-sm">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-outline">
              {t('sidebar.insights.predictedRange')}
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-[20px] font-bold text-foreground">
                ${deal.predictedRange.min.toLocaleString()}
              </span>
              <span className="text-[13px] text-on-surface-variant">–</span>
              <span className="text-[20px] font-bold text-foreground">
                ${deal.predictedRange.max.toLocaleString()}
              </span>
              <span className="ml-1 text-[11px] text-on-surface-variant">{deal.predictedRange.currency}</span>
            </div>
          </div>
          {deal.suggestedProducts.length > 0 && (
            <div className="mt-sm">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-outline">
                {t('sidebar.insights.suggestedProducts')}
              </span>
              <div className="mt-1.5 flex flex-col gap-2">
                {deal.suggestedProducts.map((product, idx) => (
                  <div key={idx} className="rounded-lg border border-outline-variant/60 bg-surface-container-low p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-medium text-foreground">{product.productName}</span>
                      <span className="text-[11px] font-semibold text-primary">
                        {product.currency} {product.suggestedPrice}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-on-surface-variant">{product.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <ReasoningToggle reasoning={deal.reasoning} />
        </div>
      )}

      {actions && actions.actions.length > 0 && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-soft">
          <div className="mb-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-secondary" />
            <h3 className="text-[13px] font-semibold text-foreground">{t('sidebar.insights.actionSuggestion')}</h3>
          </div>
          <div className="flex flex-col gap-2">
            {actions.actions.map((action) => (
              <ActionCard key={action.actionId} action={action} onExecute={onActionExecute} />
            ))}
          </div>
        </div>
      )}

      {suggestedReplies && suggestedReplies.length > 0 && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md shadow-soft">
          <div className="mb-md flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-secondary" />
            <h3 className="text-[13px] font-semibold text-foreground">{t('analysis.suggestedReplies')}</h3>
          </div>
          <div className="flex flex-col gap-sm">
            {suggestedReplies.map((reply) => (
              <SuggestedReplyCard
                key={reply.id}
                reply={reply}
                onClickReply={onSuggestedReplyClick}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ActionCard({ action, onExecute }: { action: ActionSuggestionDTO['actions'][number]; onExecute?: (action: ActionSuggestionDTO['actions'][number]) => void }): React.ReactElement {
  const { t } = useTranslation()
  const [showReasoning, setShowReasoning] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const priorityKey = `sidebar.insights.priority${action.priority.charAt(0).toUpperCase()}${action.priority.slice(1)}` as const

  return (
    <div className="rounded-lg border border-outline-variant/60 p-2.5 transition-all hover:border-primary/30 hover:bg-surface-container-low">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-semibold text-foreground">{action.label}</span>
            <span className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold ${PRIORITY_STYLES[action.priority]}`}>
              {t(priorityKey)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-on-surface-variant">{action.description}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowReasoning(!showReasoning)}
          className="shrink-0 rounded p-1 text-muted-foreground hover:bg-surface-container-highest hover:text-primary transition-colors"
          title={t('sidebar.insights.viewReasoning')}
        >
          <Info className="h-3 w-3" />
        </button>
      </div>
      {showReasoning && (
        <p className="mt-1.5 rounded-md bg-ai-tint px-2 py-1.5 text-[10px] leading-relaxed text-on-surface-variant">
          {action.reasoning}
        </p>
      )}
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-primary-dim"
        >
          <Play className="h-3 w-3" />
          {t('sidebar.insights.execute')}
        </button>
      </div>
      {confirmOpen && (
        <div className="mt-2 rounded-lg border border-outline-variant bg-surface-container-low p-2.5">
          <p className="mb-2 text-[11px] text-foreground">
            {t('sidebar.insights.confirmExecute', { action: action.label })}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onExecute?.(action)
                setConfirmOpen(false)
              }}
              className="rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-primary-dim"
            >
              {t('common.confirm')}
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="rounded-md border border-outline-variant px-2.5 py-1 text-[11px] font-medium text-on-surface-variant transition-colors hover:bg-surface-container-highest"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SuggestedReplyCard({ reply, onClickReply }: { reply: SuggestedReply; onClickReply?: (text: string) => void }): React.ReactElement {
  const { t } = useTranslation()
  const [showEvidence, setShowEvidence] = useState(false)

  return (
    <div className="group rounded-lg border border-outline-variant/60 p-sm text-left transition-all hover:border-primary hover:bg-surface-container-low">
      <div className="flex items-start justify-between gap-1.5">
        <button
          type="button"
          onClick={() => onClickReply?.(reply.text)}
          className="flex flex-1 flex-col gap-1 text-left"
        >
          <span className="text-[11px] font-medium text-primary group-hover:text-primary-dim">
            {t('analysis.suggestion')}
          </span>
          <span className="line-clamp-2 text-[12px] text-on-surface-variant">
            {reply.text}
          </span>
        </button>
        {reply.evidence && (
          <button
            type="button"
            onClick={() => setShowEvidence(!showEvidence)}
            className="shrink-0 rounded p-1 text-muted-foreground hover:bg-surface-container-highest hover:text-primary transition-colors"
            title={t('analysis.evidence')}
          >
            <Info className="h-3 w-3" />
          </button>
        )}
      </div>
      {showEvidence && reply.evidence && (
        <p className="mt-1.5 rounded-md bg-ai-tint px-2 py-1.5 text-[10px] italic leading-relaxed text-on-surface-variant">
          {reply.evidence}
        </p>
      )}
    </div>
  )
}
