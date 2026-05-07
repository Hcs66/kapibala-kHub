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
    { key: '', label: t('common.allPlatforms'), icon: <MessageCircle className="h-4 w-4" /> },
    { key: 'telegram', label: 'Telegram', icon: <SiTelegram className="h-4 w-4" /> },
    { key: 'whatsapp', label: 'WhatsApp', icon: <SiWhatsapp className="h-4 w-4" /> },
  ]

  return (
    <div className="flex border-b border-surface-container-highest">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`flex flex-1 items-center justify-center gap-1.5 px-sm py-[10px] text-xs font-medium transition-colors ${
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
