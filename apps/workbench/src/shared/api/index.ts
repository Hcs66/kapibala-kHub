import type { WorkbenchApi } from './client'
import { mockClient } from './mockClient'

function createClient(): WorkbenchApi {
  const mode = import.meta.env.VITE_WORKBENCH_API_MODE ?? 'mock'
  if (mode === 'real') {
    return mockClient
  }
  return mockClient
}

export const apiClient: WorkbenchApi = createClient()

export { mockClient } from './mockClient'
export type { MockClientExtended } from './mockClient'
