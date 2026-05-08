import { useTranslation } from 'react-i18next'
import { MessageCircle, User, Users } from 'lucide-react'

type ChatTypeFilter = 'all' | 'single' | 'group'

interface ChatTypeTabsProps {
  value: ChatTypeFilter
  onChange: (filter: ChatTypeFilter) => void
}

export function ChatTypeTabs({ value, onChange }: ChatTypeTabsProps): React.ReactElement {
  const { t } = useTranslation()

  const tabs: Array<{ key: ChatTypeFilter; label: string; icon: React.ReactElement }> = [
    { key: 'all', label: t('conversation.allTypes'), icon: <MessageCircle className="h-3.5 w-3.5" /> },
    { key: 'single', label: t('conversation.single'), icon: <User className="h-3.5 w-3.5" /> },
    { key: 'group', label: t('conversation.group'), icon: <Users className="h-3.5 w-3.5" /> },
  ]

  return (
    <div className="flex items-center gap-xs border-b border-surface-container-highest px-sm py-[8px]">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`flex items-center gap-1 rounded-full px-3 py-[5px] text-[11px] font-medium transition-colors ${
            value === tab.key
              ? 'bg-primary text-white shadow-sm [&_svg]:text-white'
              : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-foreground'
          }`}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  )
}
