import type { ServerPushEvent } from './types'

export type WsConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting'

export type WsEventHandler = (event: ServerPushEvent) => void

export interface WorkbenchWs {
  connect(token: string): void
  disconnect(): void
  getStatus(): WsConnectionStatus
  onStatusChange(handler: (status: WsConnectionStatus) => void): () => void
  onEvent(handler: WsEventHandler): () => void
  send(command: string, data: unknown): void
}
