import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  MessageSquare,

  Building2,
  BarChart3,
  HelpCircle,
  PanelLeftClose,
  PanelLeftOpen,
  DollarSign,
  Lightbulb
} from 'lucide-react'

interface NavItem {
  key: string
  icon: React.ReactNode
  labelKey: string
  path: string
}

const NAV_ITEMS: NavItem[] = [
  {
    key: 'dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
    labelKey: 'layout.sidebar.dashboard',
    path: '/dashboard',
  },
  {
    key: 'conversations',
    icon: <MessageSquare className="h-5 w-5" />,
    labelKey: 'layout.sidebar.conversations',
    path: '/workbench',
  },
  {
    key: 'leads',
    icon: <Lightbulb className="h-5 w-5" />,
    labelKey: 'layout.sidebar.leads',
    path: '/leads',
  },
  {
    key: 'opportunities',
    icon: <DollarSign className="h-5 w-5" />,
    labelKey: 'layout.sidebar.opportunities',
    path: '/opportunities',
  },
  {
    key: 'persons',
    icon: <Users className="h-5 w-5" />,
    labelKey: 'layout.sidebar.persons',
    path: '/persons',
  },

  {
    key: 'organizations',
    icon: <Building2 className="h-5 w-5" />,
    labelKey: 'layout.sidebar.organizations',
    path: '/organizations',
  },
  {
    key: 'analytics',
    icon: <BarChart3 className="h-5 w-5" />,
    labelKey: 'layout.sidebar.analytics',
    path: '/analytics',
  },
]

export function Sidebar(): React.ReactElement {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const isActive = (path: string): boolean => location.pathname === path

  return (
    <aside
      className={`flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ${
        collapsed ? 'w-[68px]' : 'w-[240px]'
      }`}
    >
      <div
        className={`flex items-center gap-sm border-b border-sidebar-border px-md h-[56px] ${collapsed ? 'justify-center' : ''}`}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <span className="text-sm font-bold">K</span>
        </div>
        {!collapsed && (
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-[15px] font-semibold text-primary">
              {t('layout.appName')}
            </span>
            <span className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Sales Workbench
            </span>
          </div>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-xs">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path)
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => navigate(item.path)}
              title={collapsed ? t(item.labelKey) : undefined}
              className={`relative flex items-center gap-sm rounded-lg px-sm py-[10px] text-sm font-medium transition-colors ${
                active
                  ? 'bg-accent text-primary'
                  : 'text-muted-foreground hover:bg-surface-container-low hover:text-foreground'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
              )}
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
            </button>
          )
        })}
      </nav>

      <div className="flex flex-col gap-1 border-t border-sidebar-border p-xs">
        <button
          type="button"
          title={collapsed ? t('layout.sidebar.help') : undefined}
          className={`flex items-center gap-sm rounded-lg px-sm py-[10px] text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-container-low hover:text-foreground ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <HelpCircle className="h-5 w-5 shrink-0" />
          {!collapsed && <span className="truncate">{t('layout.sidebar.help')}</span>}
        </button>

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? t('layout.sidebar.expand') : t('layout.sidebar.collapse')}
          className={`flex items-center gap-sm rounded-lg px-sm py-[10px] text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-container-low hover:text-foreground ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-5 w-5 shrink-0" />
          ) : (
            <PanelLeftClose className="h-5 w-5 shrink-0" />
          )}
          {!collapsed && <span className="truncate">{t('layout.sidebar.collapse')}</span>}
        </button>
      </div>
    </aside>
  )
}
