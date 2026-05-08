import { useTranslation } from 'react-i18next'
import { Bell, Settings, User, Globe } from 'lucide-react'
import { changeLanguage } from '@/shared/i18n'
import { GlobalSearch } from '@/features/search'

export function TopBar(): React.ReactElement {
  const { t, i18n } = useTranslation()

  return (
    <header className="flex h-[56px] shrink-0 items-center justify-between border-b border-sidebar-border bg-surface-container-lowest px-lg">
      <span className="text-lg font-semibold text-primary">{t('layout.appName')} Workbench</span>

      <GlobalSearch />

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
        <button
          type="button"
          title={t('layout.topbar.profile')}
          className="ml-xs flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground"
        >
          <User className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
