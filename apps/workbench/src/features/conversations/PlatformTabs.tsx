import { useTranslation } from 'react-i18next'
import { MessageCircle } from 'lucide-react'
import { SiTelegram, SiWhatsapp } from '@icons-pack/react-simple-icons'

interface PlatformTabsProps {
  value: string
  onChange: (platform: string) => void
}

export function PlatformTabs({ value, onChange }: PlatformTabsProps): React.ReactElement {
  const { t } = useTranslation()

  const tabs = [
    { key: '', label: t('common.allPlatforms'), icon: <MessageCircle className="h-3.5 w-3.5" /> },
    { key: 'telegram', label: 'TG', icon: <SiTelegram className="h-3.5 w-3.5" /> },
    { key: 'whatsapp', label: 'WA', icon: <SiWhatsapp className="h-3.5 w-3.5" /> },
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
