import { useTranslation } from 'react-i18next'
import { useDashboard } from '../hooks/useDashboard'
import { useDashboardStore } from '@/stores/dashboardStore'
import { TodayFocus } from '../components/TodayFocus'
import { NextActions } from '../components/NextActions'
import { PipelineSnapshot } from '../components/PipelineSnapshot'
import { UnreadPending } from '../components/UnreadPending'
import { PerformanceMetrics } from '../components/PerformanceMetrics'
import { RecentActivity } from '../components/RecentActivity'
import { Loader2 } from 'lucide-react'

export function DashboardPage(): React.ReactElement {
  const { t } = useTranslation()
  const loading = useDashboardStore((s) => s.loading)
  const error = useDashboardStore((s) => s.error)

  useDashboard()

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-destructive">{t('dashboard.loadError')}</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-lg">
      <div className="mx-auto max-w-[1400px] space-y-lg">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t('dashboard.title')}
        </h1>

        <div className="grid grid-cols-1 gap-lg lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TodayFocus />
          </div>
          <div className="lg:col-span-1">
            <NextActions />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-lg lg:grid-cols-3">
          <div className="lg:col-span-2">
            <UnreadPending />
          </div>
          <div className="lg:col-span-1">
            <PipelineSnapshot />
          </div>
        </div>

        <PerformanceMetrics />

        <RecentActivity />
      </div>
    </div>
  )
}
