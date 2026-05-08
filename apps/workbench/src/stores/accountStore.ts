import { create } from 'zustand'
import type { AccountStatusDTO } from '@/shared/api/types'
import { apiClient } from '@/shared/api'

interface AccountState {
  accounts: AccountStatusDTO[]
  loading: boolean
  fetchAccounts: () => Promise<void>
  updateAccountStatus: (account: AccountStatusDTO) => void
}

export const useAccountStore = create<AccountState>((set, get) => ({
  accounts: [],
  loading: false,

  fetchAccounts: async () => {
    set({ loading: true })
    const accounts = await apiClient.listAccounts()
    set({ accounts, loading: false })
  },

  updateAccountStatus: (account) => {
    set({
      accounts: get().accounts.map((a) =>
        a.accountId === account.accountId ? account : a,
      ),
    })
  },
}))
