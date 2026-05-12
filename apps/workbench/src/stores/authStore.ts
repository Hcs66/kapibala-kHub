import { create } from 'zustand'
import type { CurrentUserDTO } from '@/shared/api/types'

const AUTH_STORAGE_KEY = 'workbench_auth'
const REMEMBER_ME_KEY = 'workbench_remember_me'
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

interface StoredAuth {
  token: string
  user: CurrentUserDTO
  expiresAt: number
}

function loadStoredAuth(): { token: string; user: CurrentUserDTO } | null {
  const remembered = localStorage.getItem(REMEMBER_ME_KEY) === 'true'
  const storage = remembered ? localStorage : sessionStorage
  const raw = storage.getItem(AUTH_STORAGE_KEY)
  if (!raw) return null

  try {
    const stored: StoredAuth = JSON.parse(raw)
    if (stored.expiresAt < Date.now()) {
      storage.removeItem(AUTH_STORAGE_KEY)
      localStorage.removeItem(REMEMBER_ME_KEY)
      return null
    }
    return { token: stored.token, user: stored.user }
  } catch {
    storage.removeItem(AUTH_STORAGE_KEY)
    localStorage.removeItem(REMEMBER_ME_KEY)
    return null
  }
}

function persistAuth(token: string, user: CurrentUserDTO, rememberMe: boolean): void {
  const stored: StoredAuth = {
    token,
    user,
    expiresAt: rememberMe ? Date.now() + THIRTY_DAYS_MS : Date.now() + 24 * 60 * 60 * 1000,
  }
  if (rememberMe) {
    localStorage.setItem(REMEMBER_ME_KEY, 'true')
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(stored))
    sessionStorage.removeItem(AUTH_STORAGE_KEY)
  } else {
    localStorage.removeItem(REMEMBER_ME_KEY)
    localStorage.removeItem(AUTH_STORAGE_KEY)
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(stored))
  }
}

function clearStoredAuth(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY)
  localStorage.removeItem(REMEMBER_ME_KEY)
  sessionStorage.removeItem(AUTH_STORAGE_KEY)
}

const initialAuth = loadStoredAuth()

interface AuthState {
  token: string | null
  user: CurrentUserDTO | null
  isAuthenticated: boolean
  login: (token: string, user: CurrentUserDTO, rememberMe: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: initialAuth?.token ?? null,
  user: initialAuth?.user ?? null,
  isAuthenticated: initialAuth !== null,
  login: (token, user, rememberMe) => {
    persistAuth(token, user, rememberMe)
    set({ token, user, isAuthenticated: true })
  },
  logout: () => {
    clearStoredAuth()
    set({ token: null, user: null, isAuthenticated: false })
  },
}))
