import { useTranslation } from 'react-i18next'
import { useDashboardStore } from '@/stores/dashboardStore'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { MetricPeriod } from '../types'

const PERIOD_OPTIONS: MetricPeriod[] = ['today', 'week', 'month']

function getTrendIcon(trend: number): React.ReactNode {
  if (trend > 0) return <TrendingUp className="h-3.5 w-3.5 text-green-600" />
  if (trend < 0) return <TrendingDown className="h-3.5 w-3.5 text-red-500" />
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />
}

function getTrendColor(trend: number, key: string): string {
  const invertedKeys = ['avg_response_time']
  const isInverted = invertedKeys.includes(key)
  if (trend === 0) return 'text-muted-foreground'
  if (isInverted) {
    return trend < 0 ? 'text-green-600' : 'text-red-500'
  }
  return trend > 0 ? 'text-green-600' : 'text-red-500'
}

export function PerformanceMetrics(): React.ReactElement {
  const { t } = useTranslation()
  const metrics = useDashboardStore((s) => s.metrics)
  const period = useDashboardStore((s) => s.period)
  const setPeriod = useDashboardStore((s) => s.setPeriod)

  if (!metrics) return <div />

  return (
    <div className="rounded-lg border border-border bg-card p-md shadow-sm">
      <div className="mb-md flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">
          {t('dashboard.metrics.title')}
        </h2>
        <div className="flex rounded-md border border-border">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setPeriod(opt)}
              className={`px-2.5 py-1 text-xs font-medium transition-colors first:rounded-l-md last:rounded-r-md ${
                period === opt
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t(`dashboard.metrics.period.${opt}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-sm lg:grid-cols-4">
        {metrics.metrics.map((metric) => (
          <div
            key={metric.key}
            className="rounded-md border border-border bg-surface-container-lowest p-sm"
          >
            <p className="mb-xs text-xs text-muted-foreground">
              {t(metric.labelKey)}
            </p>
            <div className="flex items-end justify-between">
              <span className="text-xl font-bold text-foreground">
                {metric.value}
                {metric.unit && (
                  <span className="ml-0.5 text-sm font-normal text-muted-foreground">
                    {metric.unit}
                  </span>
                )}
              </span>
              <div className="flex items-center gap-0.5">
                {getTrendIcon(metric.trend)}
                <span className={`text-xs font-medium ${getTrendColor(metric.trend, metric.key)}`}>
                  {Math.abs(metric.trend)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
