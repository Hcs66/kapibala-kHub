import { useTranslation } from 'react-i18next'
import { useDashboardStore } from '@/stores/dashboardStore'
import { useState } from 'react'

type PipelineTab = 'leads' | 'opportunities'

function formatValue(value: number, currency?: string): string {
  if (!value) return ''
  if (value >= 1000) {
    return `${currency ?? '$'}${(value / 1000).toFixed(0)}k`
  }
  return `${currency ?? '$'}${value}`
}

export function PipelineSnapshot(): React.ReactElement {
  const { t } = useTranslation()
  const pipeline = useDashboardStore((s) => s.pipeline)
  const [activeTab, setActiveTab] = useState<PipelineTab>('leads')

  if (!pipeline) return <div />

  const stages = activeTab === 'leads' ? pipeline.leads : pipeline.opportunities
  const maxCount = Math.max(...stages.map((s) => s.count), 1)

  return (
    <div className="rounded-lg border border-border bg-card p-md shadow-sm">
      <div className="mb-md flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">
          {t('dashboard.pipeline.title')}
        </h2>
        <div className="flex rounded-md border border-border">
          <button
            type="button"
            onClick={() => setActiveTab('leads')}
            className={`px-2.5 py-1 text-xs font-medium transition-colors ${
              activeTab === 'leads'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            } rounded-l-md`}
          >
            {t('dashboard.pipeline.leads')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('opportunities')}
            className={`px-2.5 py-1 text-xs font-medium transition-colors ${
              activeTab === 'opportunities'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            } rounded-r-md`}
          >
            {t('dashboard.pipeline.opportunities')}
          </button>
        </div>
      </div>

      <div className="space-y-xs">
        {stages
          .filter((s) => s.stage !== 'won' && s.stage !== 'lost')
          .map((stage) => (
            <div key={stage.stage} className="flex items-center gap-sm">
              <span className="w-20 shrink-0 text-xs text-muted-foreground truncate">
                {stage.label}
              </span>
              <div className="flex-1">
                <div className="h-5 w-full rounded bg-surface-container-low">
                  <div
                    className="flex h-full items-center rounded bg-primary/20 px-1.5 transition-all"
                    style={{ width: `${Math.max((stage.count / maxCount) * 100, 8)}%` }}
                  >
                    <span className="text-[10px] font-semibold text-primary">
                      {stage.count}
                    </span>
                  </div>
                </div>
              </div>
              {activeTab === 'opportunities' && stage.value ? (
                <span className="w-12 shrink-0 text-right text-[10px] font-medium text-muted-foreground">
                  {formatValue(stage.value, stage.currency)}
                </span>
              ) : null}
            </div>
          ))}
      </div>

      <div className="mt-sm flex items-center gap-md border-t border-border pt-sm">
        {stages
          .filter((s) => s.stage === 'won' || s.stage === 'lost')
          .map((stage) => (
            <div key={stage.stage} className="flex items-center gap-xs">
              <span
                className={`h-2 w-2 rounded-full ${
                  stage.stage === 'won' ? 'bg-green-500' : 'bg-red-400'
                }`}
              />
              <span className="text-xs text-muted-foreground">
                {stage.label}: {stage.count}
              </span>
            </div>
          ))}
      </div>
    </div>
  )
}
