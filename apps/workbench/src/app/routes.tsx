import { Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from '@/pages/LoginPage'
import { ConversationPage } from '@/features/conversations'
import { PersonsPage } from '@/features/persons'
import { OrganizationsPage } from '@/features/organizations'
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
        <Route path="/workbench" element={<ConversationPage />} />
        <Route path="/dashboard" element={<ConversationPage />} />
        <Route path="/leads" element={<ConversationPage />} />
        <Route path="/opportunities" element={<ConversationPage />} />
        <Route path="/persons" element={<PersonsPage />} />
        <Route path="/organizations" element={<OrganizationsPage />} />
        <Route path="/accounts" element={<ConversationPage />} />
        <Route path="/analytics" element={<ConversationPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
