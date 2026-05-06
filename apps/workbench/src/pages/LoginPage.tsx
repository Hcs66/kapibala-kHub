import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import type { CurrentUserDTO } from '@/shared/api/types'

export function LoginPage(): React.ReactElement {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError('')
    setLoading(true)

    await new Promise((r) => setTimeout(r, 600))

    if (username === 'sales' && password === 'sales') {
      const mockUser: CurrentUserDTO = {
        tenantId: 'tenant_001',
        userId: 'user_sales_001',
        username: 'sales',
        displayName: '张三',
        role: 'sales',
        teamIds: ['team_001'],
        capabilities: ['message.send', 'message.read'],
      }
      login('mock_jwt_token_sales_001', mockUser)
      navigate('/workbench', { replace: true })
    } else {
      setError('用户名或密码错误（试试 sales / sales）')
    }

    setLoading(false)
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-border bg-surface-container-lowest p-8 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]"
      >
        <h1 className="mb-6 text-center text-xl font-semibold">kHub 销售工作台</h1>

        <label className="mb-1 block text-xs tracking-wide text-muted-foreground" htmlFor="username">
          用户名
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mb-4 w-full rounded-md border border-border bg-surface-container-lowest px-3 py-2 text-sm outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-primary-glow"
          placeholder="sales"
          autoComplete="username"
        />

        <label className="mb-1 block text-xs tracking-wide text-muted-foreground" htmlFor="password">
          密码
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-6 w-full rounded-md border border-border bg-surface-container-lowest px-3 py-2 text-sm outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-primary-glow"
          placeholder="sales"
          autoComplete="current-password"
        />

        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={loading || !username || !password}
          className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-dim disabled:opacity-50"
        >
          {loading ? '登录中...' : '登录'}
        </button>
      </form>
    </div>
  )
}
