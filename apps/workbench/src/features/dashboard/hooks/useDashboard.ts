import { useEffect } from 'react'
import { useDashboardStore } from '@/stores/dashboardStore'

export function useDashboard(): void {
  const fetchDashboard = useDashboardStore((s) => s.fetchDashboard)

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])
}
