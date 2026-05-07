import { useTranslation } from 'react-i18next'
import { User, Users } from 'lucide-react'

type ChatTypeFilter = 'all' | 'single' | 'group'

interface ChatTypeTabsProps {
  value: ChatTypeFilter
  onChange: (filter: ChatTypeFilter) => void
}

export function ChatTypeTabs({ value, onChange }: ChatTypeTabsProps): React.ReactElement {
  const { t } = useTranslation()

  const tabs: Array<{ key: ChatTypeFilter; label: string; icon: React.ReactElement }> = [
    { key: 'all', label: t('conversation.allTypes'), icon: <User className="h-3.5 w-3.5" /> },
    { key: 'single', label: t('conversation.single'), icon: <User className="h-3.5 w-3.5" /> },
    { key: 'group', label: t('conversation.group'), icon: <Users className="h-3.5 w-3.5" /> },
  ]

  return (
    <div className="flex border-b border-surface-container-highest">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`flex flex-1 items-center justify-center gap-1 px-sm py-[8px] text-[11px] font-medium transition-colors ${
            value === tab.key
              ? 'border-b-2 border-primary text-primary'
              : 'text-on-surface-variant hover:bg-surface-container-low hover:text-foreground'
          }`}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  )
}
