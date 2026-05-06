import { create } from 'zustand'
import type { CurrentUserDTO } from '@/shared/api/types'

interface AuthState {
  token: string | null
  user: CurrentUserDTO | null
  isAuthenticated: boolean
  login: (token: string, user: CurrentUserDTO) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  login: (token, user) => set({ token, user, isAuthenticated: true }),
  logout: () => set({ token: null, user: null, isAuthenticated: false }),
}))
