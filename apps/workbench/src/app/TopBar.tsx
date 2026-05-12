import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'
import { Bell, Settings, Globe } from 'lucide-react'
import { changeLanguage } from '@/shared/i18n'
import { useConversationStore } from '@/stores/conversationStore'
import { GlobalSearch } from '@/features/search'
import { UserMenu } from './UserMenu'

export function TopBar(): React.ReactElement {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const switchConversation = useConversationStore((s) => s.switchConversation)

  const handleSelectConversation = (conversationId: string): void => {
    switchConversation(conversationId)
    if (location.pathname !== '/workbench') {
      navigate('/workbench')
    }
  }

  const handleSelectPerson = (personId: string): void => {
    navigate(`/persons?highlight=${personId}`)
  }

  const handleSelectOrganization = (organizationId: string): void => {
    navigate(`/organizations?highlight=${organizationId}`)
  }

  return (
    <header className="flex h-[56px] shrink-0 items-center justify-between border-b border-sidebar-border bg-surface-container-lowest px-lg">
      <GlobalSearch
        onSelectConversation={handleSelectConversation}
        onSelectPerson={handleSelectPerson}
        onSelectOrganization={handleSelectOrganization}
      />

      <div className="flex items-center gap-xs">
        <button
          type="button"
          onClick={() => changeLanguage(i18n.language === 'zh' ? 'en' : 'zh')}
          title={i18n.language === 'zh' ? 'Switch to English' : '切换到中文'}
          className="rounded-lg p-[8px] text-muted-foreground transition-colors hover:bg-surface-container-low hover:text-foreground"
        >
          <Globe className="h-5 w-5" />
        </button>
        <button
          type="button"
          title={t('layout.topbar.notifications')}
          className="rounded-lg p-[8px] text-muted-foreground transition-colors hover:bg-surface-container-low hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
        </button>
        <button
          type="button"
          title={t('layout.topbar.settings')}
          className="rounded-lg p-[8px] text-muted-foreground transition-colors hover:bg-surface-container-low hover:text-foreground"
        >
          <Settings className="h-5 w-5" />
        </button>
        <UserMenu />
      </div>
    </header>
  )
}
