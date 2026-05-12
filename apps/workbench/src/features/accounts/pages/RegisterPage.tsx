import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { Mail, Lock, User, Shield, Share2 } from 'lucide-react'
import { apiClient } from '@/shared/api'

export function RegisterPage(): React.ReactElement {
  const { t } = useTranslation()
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'))
      return
    }

    setLoading(true)

    try {
      const result = await apiClient.register({ username, password, displayName })
      login(result.token, result.user, false)
      navigate('/workbench', { replace: true })
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError(t('auth.registerError'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="relative flex min-h-svh items-center justify-center overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse 80% 60% at 20% 50%, rgba(79, 70, 229, 0.08), transparent 60%), radial-gradient(ellipse 60% 80% at 80% 20%, rgba(99, 102, 241, 0.05), transparent 50%), var(--color-background)',
      }}
    >
      <div className="relative z-10 w-full max-w-96 rounded-xl border border-border bg-surface-container-lowest/80 p-10 shadow-[0_8px_40px_rgba(0,0,0,0.06)] backdrop-blur-xl">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary shadow-[0_2px_8px_rgba(79,70,229,0.3)]">
            <Share2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">kHub</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{t('auth.registerTitle')}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium tracking-wide text-muted-foreground" htmlFor="reg-username">
              {t('auth.username')}
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <input
                id="reg-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-container-lowest py-2.5 pl-10 pr-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary-glow"
                placeholder={t('auth.usernamePlaceholder')}
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium tracking-wide text-muted-foreground" htmlFor="reg-displayName">
              {t('auth.displayName')}
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <input
                id="reg-displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-container-lowest py-2.5 pl-10 pr-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary-glow"
                placeholder={t('auth.displayNamePlaceholder')}
                autoComplete="name"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium tracking-wide text-muted-foreground" htmlFor="reg-password">
              {t('auth.password')}
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <input
                id="reg-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-container-lowest py-2.5 pl-10 pr-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary-glow"
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium tracking-wide text-muted-foreground" htmlFor="reg-confirmPassword">
              {t('auth.confirmPassword')}
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <input
                id="reg-confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-container-lowest py-2.5 pl-10 pr-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary-glow"
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-md bg-error-container/40 px-3 py-2 text-xs font-medium text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password || !confirmPassword || !displayName}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-[0_2px_8px_rgba(79,70,229,0.25)] transition-all hover:bg-primary-dim hover:shadow-[0_4px_12px_rgba(79,70,229,0.3)] disabled:opacity-50 disabled:shadow-none"
          >
            {loading ? t('auth.registering') : t('auth.register')}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {t('auth.hasAccount')}{' '}
          <Link to="/login" className="text-primary hover:text-primary-dim transition-colors font-medium">
            {t('auth.login')}
          </Link>
        </p>
      </div>

      <div className="absolute bottom-6 flex items-center gap-1.5 text-xs text-muted-foreground/70">
        <Shield className="h-3.5 w-3.5" />
        <span>{t('auth.dataProtected')}</span>
      </div>
    </div>
  )
}
