import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { User, LogOut, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

export function UserMenu(): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  useEffect(() => {
    function handleEscape(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('keydown', handleEscape)
    }
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open])

  const handleLogout = (): void => {
    setOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  const handleSwitchAccount = (): void => {
    setOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        title={t('layout.topbar.profile')}
        aria-expanded={open}
        aria-haspopup="menu"
        className="ml-xs flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90"
      >
        <User className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 origin-top-right rounded-lg border border-border bg-surface-container-lowest py-1 shadow-elevated animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-medium text-foreground">
              {user?.displayName ?? user?.username ?? '—'}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('layout.topbar.signedInAs')} {user?.username ?? '—'}
            </p>
          </div>

          <div className="py-1">
            <button
              type="button"
              role="menuitem"
              onClick={handleSwitchAccount}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-foreground transition-colors hover:bg-surface-container-low"
            >
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              {t('layout.topbar.switchAccount')}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-destructive transition-colors hover:bg-surface-container-low"
            >
              <LogOut className="h-4 w-4" />
              {t('layout.topbar.logout')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
