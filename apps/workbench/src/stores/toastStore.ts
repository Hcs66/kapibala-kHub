import { create } from 'zustand'

export interface Toast {
  id: string
  message: string
  type: 'error' | 'success' | 'info'
  createdAt: number
}

interface ToastState {
  toasts: Toast[]
  addToast: (message: string, type: Toast['type']) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (message, type) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const toast: Toast = { id, message, type, createdAt: Date.now() }
    set({ toasts: [...get().toasts, toast] })

    setTimeout(() => {
      set({ toasts: get().toasts.filter((t) => t.id !== id) })
    }, 5000)
  },

  removeToast: (id) => {
    set({ toasts: get().toasts.filter((t) => t.id !== id) })
  },
}))
