import type { AccountStatusDTO } from '@/shared/api/types'
import { Wifi, WifiOff, Loader2, AlertCircle } from 'lucide-react'

interface AccountStatusBarProps {
  accounts: AccountStatusDTO[]
}

export function AccountStatusBar({ accounts }: AccountStatusBarProps): React.ReactElement | null {
  const disconnected = accounts.filter((a) => a.status !== 'connected')
  if (disconnected.length === 0) return null

  return (
    <div className="flex items-center gap-2 border-b border-border bg-error-container px-4 py-2">
      {disconnected.map((account) => (
        <div key={account.accountId} className="flex items-center gap-1.5 text-xs">
          <StatusIcon status={account.status} />
          <span className="font-medium text-on-error-container">{account.displayName}</span>
          <span className="text-on-error-container/70">
            {account.status === 'disconnected' && '已断连'}
            {account.status === 'reconnecting' && '重连中...'}
            {account.status === 'error' && (account.errorMessage ?? '连接错误')}
          </span>
        </div>
      ))}
    </div>
  )
}

function StatusIcon({ status }: { status: AccountStatusDTO['status'] }): React.ReactElement {
  switch (status) {
    case 'connected':
      return <Wifi className="h-3.5 w-3.5 text-green-500" />
    case 'disconnected':
      return <WifiOff className="h-3.5 w-3.5 text-destructive" />
    case 'reconnecting':
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
    case 'error':
      return <AlertCircle className="h-3.5 w-3.5 text-destructive" />
  }
}
