# Mock → Real 切换配置说明

> 本文档说明如何将 Workbench 前端从 mock 数据源切换到真实 BFF 后端。
>
> **更新日期：** 2026-05-09
> **当前状态：** Mock 模式已完整实现（含扩展接口），API 工厂已就位，`realClient.ts` 待 onsite 后填充。

---

## 环境变量

在 `apps/workbench/.env` 中配置：

```bash
# === Mock 模式（onsite 前，默认） ===
VITE_WORKBENCH_API_MODE=mock
VITE_WORKBENCH_API_BASE=/mock
VITE_WORKBENCH_WS_URL=

# === Real 模式（onsite 后，接真实 BFF） ===
VITE_WORKBENCH_API_MODE=real
VITE_WORKBENCH_API_BASE=https://api.huidu.ai/workbench
VITE_WORKBENCH_WS_URL=wss://ws.huidu.ai/workbench/ws
```

---

## 当前架构

### API 工厂（已实现）

文件位置：`src/shared/api/index.ts`

```ts
import type { WorkbenchApi } from './client'
import { mockClient } from './mockClient'

function createClient(): WorkbenchApi {
  const mode = import.meta.env.VITE_WORKBENCH_API_MODE ?? 'mock'
  if (mode === 'real') {
    return mockClient // TODO: 替换为 realClient
  }
  return mockClient
}

export const apiClient: WorkbenchApi = createClient()
export { mockClient } from './mockClient'
```

### WorkbenchApi 接口（已扩展）

文件位置：`src/shared/api/client.ts`

当前接口已超出原始 demo 范围，包含以下方法：

```ts
interface WorkbenchApi {
  // --- P0：最小闭环（onsite 首批对接） ---
  login(input: LoginRequest): Promise<LoginResult>
  getCurrentUser(): Promise<CurrentUserDTO>
  listConversations(input: ConversationListQuery): Promise<ConversationListResult>
  listMessages(input: MessageHistoryQuery): Promise<MessageHistoryResult>
  sendMessage(input: SendMessageRequest): Promise<SendMessageResult>
  translatePreview(input: TranslatePreviewRequest): Promise<TranslatePreviewResult>
  getAnalysisSummary(conversationId: string): Promise<AnalysisSummaryDTO>
  listAccounts(): Promise<AccountStatusDTO[]>

  // --- P1：扩展接口（后续对接） ---
  listTags(): Promise<TagDTO[]>
  createTag(input: { name: string; color?: string }): Promise<TagDTO>
  deleteTag(tagId: string): Promise<void>
  addTagToConversation(conversationId: string, tagId: string): Promise<void>
  removeTagFromConversation(conversationId: string, tagId: string): Promise<void>
  getCustomerProfile(conversationId: string): Promise<CustomerProfileDTO | null>
  getIntentPrediction(conversationId: string): Promise<IntentPredictionDTO | null>
  getDealSuggestion(conversationId: string): Promise<DealSuggestionDTO | null>
  getActionSuggestions(conversationId: string): Promise<ActionSuggestionDTO | null>
  getTimelineEvents(conversationId: string): Promise<TimelineEventDTO[]>
  listPersons(): Promise<PersonDTO[]>
  listOrganizations(): Promise<OrganizationDTO[]>
  globalSearch(input: GlobalSearchQuery): Promise<GlobalSearchResult>
}
```

### WebSocket 接口（已实现）

文件位置：`src/shared/ws/client.ts`

```ts
interface WorkbenchWs {
  connect(token: string): void
  disconnect(): void
  getStatus(): WsConnectionStatus
  onStatusChange(handler: (status: WsConnectionStatus) => void): () => void
  onEvent(handler: WsEventHandler): () => void
  send(command: string, data: unknown): void
}
```

---

## 切换步骤

### 1. 创建 `.env.local`（不提交到 git）

```bash
cp .env .env.local
# 编辑 .env.local，将 API_MODE 改为 real，填入真实地址
```

### 2. 实现 `realClient.ts`

文件位置：`src/shared/api/realClient.ts`（待创建）

需实现 `WorkbenchApi` 接口的所有方法。建议分两批实现：

**第一批（P0 最小闭环）：**

```ts
import type { WorkbenchApi } from './client'

const BASE = import.meta.env.VITE_WORKBENCH_API_BASE

export const realClient: WorkbenchApi = {
  async login(input) {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error('Login failed')
    return res.json()
  },

  async getCurrentUser() {
    const res = await fetch(`${BASE}/me`, { headers: authHeaders() })
    if (res.status === 401) throw new Error('KHUB_AUTH_REQUIRED')
    return res.json()
  },

  async listConversations(input) {
    const params = new URLSearchParams()
    if (input.page) params.set('page', String(input.page))
    if (input.limit) params.set('limit', String(input.limit))
    if (input.platform) params.set('platform', input.platform)
    if (input.search) params.set('search', input.search)
    if (input.chatType) params.set('chatType', input.chatType)
    if (input.tags?.length) params.set('tags', input.tags.join(','))
    const res = await fetch(`${BASE}/conversations?${params}`, { headers: authHeaders() })
    return res.json()
  },

  async listMessages(input) {
    const params = new URLSearchParams()
    if (input.beforeSeq) params.set('beforeSeq', String(input.beforeSeq))
    if (input.limit) params.set('limit', String(input.limit))
    const res = await fetch(`${BASE}/conversations/${input.conversationId}/messages?${params}`, { headers: authHeaders() })
    return res.json()
  },

  async sendMessage(input) {
    const res = await fetch(`${BASE}/messages/send`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    return res.json()
  },

  async translatePreview(input) {
    const res = await fetch(`${BASE}/translate/preview`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    return res.json()
  },

  async getAnalysisSummary(conversationId) {
    const res = await fetch(`${BASE}/conversations/${conversationId}/analysis-summary`, { headers: authHeaders() })
    return res.json()
  },

  async listAccounts() {
    const res = await fetch(`${BASE}/accounts`, { headers: authHeaders() })
    return res.json()
  },

  // --- P1 接口：初期可返回 mock fallback 或 null ---
  async listTags() { return [] },
  async createTag(input) { throw new Error('Not implemented') },
  async deleteTag(tagId) { throw new Error('Not implemented') },
  async addTagToConversation(cid, tid) { throw new Error('Not implemented') },
  async removeTagFromConversation(cid, tid) { throw new Error('Not implemented') },
  async getCustomerProfile(cid) { return null },
  async getIntentPrediction(cid) { return null },
  async getDealSuggestion(cid) { return null },
  async getActionSuggestions(cid) { return null },
  async getTimelineEvents(cid) { return [] },
  async listPersons() { return [] },
  async listOrganizations() { return [] },
  async globalSearch(input) { return { persons: [], organizations: [], conversations: [] } },
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('workbench_token') ?? ''
  return { Authorization: `Bearer ${token}` }
}
```

### 3. 更新 API 工厂

修改 `src/shared/api/index.ts`：

```ts
import type { WorkbenchApi } from './client'
import { mockClient } from './mockClient'

function createClient(): WorkbenchApi {
  const mode = import.meta.env.VITE_WORKBENCH_API_MODE ?? 'mock'
  if (mode === 'real') {
    // 动态导入避免 mock 数据打包到 production
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { realClient } = await import('./realClient')
    return realClient
  }
  return mockClient
}

export const apiClient: WorkbenchApi = createClient()
```

> **注意：** 当前实现是同步导出 `apiClient`。如果改为动态 import，需要调整为异步初始化模式或在构建时通过条件编译处理。建议 onsite 时直接静态导入 realClient。

### 4. 实现真实 WebSocket

文件位置：`src/shared/ws/realWs.ts`（待创建）

```ts
import type { WorkbenchWs, WsConnectionStatus, WsEventHandler } from './client'
import type { ServerPushEvent } from '@/shared/api/types'

export function createRealWs(): WorkbenchWs {
  const WS_URL = import.meta.env.VITE_WORKBENCH_WS_URL
  let ws: WebSocket | null = null
  let status: WsConnectionStatus = 'disconnected'
  const statusHandlers: Array<(s: WsConnectionStatus) => void> = []
  const eventHandlers: WsEventHandler[] = []
  let pingInterval: ReturnType<typeof setInterval> | null = null
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  let reconnectAttempts = 0

  function setStatus(s: WsConnectionStatus): void {
    status = s
    statusHandlers.forEach(h => h(s))
  }

  function scheduleReconnect(): void {
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000)
    reconnectAttempts++
    setStatus('reconnecting')
    reconnectTimeout = setTimeout(() => {
      const token = localStorage.getItem('workbench_token') ?? ''
      doConnect(token)
    }, delay)
  }

  function doConnect(token: string): void {
    setStatus('connecting')
    ws = new WebSocket(`${WS_URL}?token=${token}`)
    ws.onopen = () => {
      setStatus('connected')
      reconnectAttempts = 0
      pingInterval = setInterval(() => ws?.send(JSON.stringify({ type: 'ping' })), 30000)
    }
    ws.onmessage = (e) => {
      const event = JSON.parse(e.data) as ServerPushEvent
      eventHandlers.forEach(h => h(event))
    }
    ws.onclose = () => {
      if (pingInterval) clearInterval(pingInterval)
      scheduleReconnect()
    }
    ws.onerror = () => ws?.close()
  }

  return {
    connect(token) { doConnect(token) },
    disconnect() {
      if (pingInterval) clearInterval(pingInterval)
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
      ws?.close()
      setStatus('disconnected')
    },
    getStatus() { return status },
    onStatusChange(handler) {
      statusHandlers.push(handler)
      return () => { const i = statusHandlers.indexOf(handler); if (i >= 0) statusHandlers.splice(i, 1) }
    },
    onEvent(handler) {
      eventHandlers.push(handler)
      return () => { const i = eventHandlers.indexOf(handler); if (i >= 0) eventHandlers.splice(i, 1) }
    },
    send(command, data) {
      ws?.send(JSON.stringify({ type: command, payload: data }))
    },
  }
}
```

### 5. 切换 WS 工厂

修改 `src/features/conversations/hooks/useWorkbenchWs.ts` 中的 WS 创建逻辑：

```ts
import { createMockWs } from '@/shared/ws/mockWs'
// import { createRealWs } from '@/shared/ws/realWs'  // onsite 后启用

function getWsInstance(): WorkbenchWs {
  const mode = import.meta.env.VITE_WORKBENCH_API_MODE ?? 'mock'
  if (mode === 'real') {
    // return createRealWs()
  }
  return createMockWs(getWsOptions())
}
```

---

## Mock 场景测试

通过 URL query param `?scenario=xxx` 切换 mock 场景：

| URL | 场景 | 行为 |
|-----|------|------|
| `localhost:5173/workbench` | 正常流 | 11 个会话，消息收发正常，AI 洞察/画像/时间线正常 |
| `localhost:5173/workbench?scenario=empty` | 空状态 | 无会话，无消息 |
| `localhost:5173/workbench?scenario=error` | 权限不足 | API 返回 401，触发跳转登录页 |
| `localhost:5173/workbench?scenario=timeout` | 超时/断连 | 翻译延迟 4s+，WS 8s 后断开再重连，账号显示断连 |

---

## 文件对照表

| Mock 文件 | Real 文件（onsite 后实现） | 说明 |
|-----------|--------------------------|------|
| `shared/api/mockClient.ts` | `shared/api/realClient.ts`（待创建） | HTTP API 实现（需实现全部 WorkbenchApi 方法） |
| `shared/ws/mockWs.ts` | `shared/ws/realWs.ts`（待创建） | WebSocket 实现 |
| `shared/api/index.ts` | 同文件修改 | 切换 `createClient()` 返回 realClient |
| `mocks/data/index.ts` | 不需要 | 仅 mock 模式使用 |
| `stores/tagStore.ts` | 同文件 | 已通过 apiClient 调用，无需修改 |
| `stores/toastStore.ts` | 同文件 | 通用 Toast，无需修改 |

---

## 对接优先级

### 第一批（P0 最小闭环 — onsite 当天）

| 前端方法 | 真实 Endpoint | 说明 |
|----------|--------------|------|
| `login` | `POST /auth/login` | 返回 JWT + CurrentUserDTO |
| `getCurrentUser` | `GET /me` | 验证 token 有效性 |
| `listConversations` | `GET /conversations` | 支持 platform/search/chatType/tags 过滤 |
| `listMessages` | `GET /conversations/:id/messages` | 支持 beforeSeq 分页 |
| `sendMessage` | `POST /messages/send` | 幂等发送 |
| `translatePreview` | `POST /translate/preview` | 翻译预览 |
| `getAnalysisSummary` | `GET /conversations/:id/analysis-summary` | 分析摘要 |
| `listAccounts` | `GET /accounts` | 账号状态 |
| WebSocket | `wss://...` | 实时事件推送 |

### 第二批（P1 扩展接口 — onsite 后 1-2 周）

| 前端方法 | 真实 Endpoint | 说明 |
|----------|--------------|------|
| `listTags` / `createTag` / `deleteTag` | `GET/POST/DELETE /tags` | 标签 CRUD |
| `addTagToConversation` / `removeTagFromConversation` | `POST/DELETE /conversations/:id/tags/:tagId` | 标签分配 |
| `getCustomerProfile` | `GET /conversations/:id/profile` | 客户画像 |
| `getIntentPrediction` | `GET /conversations/:id/intent` | AI 意图预测 |
| `getDealSuggestion` | `GET /conversations/:id/deal-suggestion` | AI 成交建议 |
| `getActionSuggestions` | `GET /conversations/:id/action-suggestions` | AI 动作建议 |
| `getTimelineEvents` | `GET /conversations/:id/timeline` | 时间线 |
| `listPersons` | `GET /persons` | 客户列表 |
| `listOrganizations` | `GET /organizations` | 公司列表 |
| `globalSearch` | `GET /search?query=xxx` | 全局搜索 |

---

## 注意事项

1. **不要删除 mock 文件** — 开发和演示时仍需要 mock 模式
2. **Token 存储** — mock 模式存在 Zustand（内存），real 模式需要持久化到 localStorage
3. **错误处理** — real 模式需要统一的 HTTP 错误拦截器（401 → logout，5xx → toast）。当前已有 `toastStore` 支持全局错误提示
4. **CORS** — 如果 BFF 和前端不同源，需要 BFF 配置 CORS headers
5. **环境隔离** — `.env.local` 不提交 git，每个开发者本地配置自己的 BFF 地址
6. **P1 接口降级** — real 模式下 P1 接口如果后端未就绪，可返回空数据（null/[]），前端已有空状态兜底
7. **i18n** — 错误消息已走 i18n，real 模式下后端返回的 errorMessage 可直接透传或映射到 i18n key
8. **WS 事件扩展** — 当前 mock WS 已支持 `conversation.tag_changed` 事件，real WS 需确认是否支持
