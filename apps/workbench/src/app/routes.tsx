import { Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from '@/pages/LoginPage'
import { WorkbenchPage } from '@/pages/WorkbenchPage'
import { AuthGuard } from './AuthGuard'
import { AppLayout } from './AppLayout'

export function AppRoutes(): React.ReactElement {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <AuthGuard>
            <AppLayout />
          </AuthGuard>
        }
      >
        <Route path="/workbench" element={<WorkbenchPage />} />
        <Route path="/dashboard" element={<WorkbenchPage />} />
        <Route path="/leads" element={<WorkbenchPage />} />
        <Route path="/opportunities" element={<WorkbenchPage />} />
        <Route path="/accounts" element={<WorkbenchPage />} />
        <Route path="/analytics" element={<WorkbenchPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
