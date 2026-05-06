# Mock → Real 切换配置说明

> 本文档说明如何将 Workbench 前端从 mock 数据源切换到真实 BFF 后端。

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

## 切换步骤

### 1. 创建 `.env.local`（不提交到 git）

```bash
cp .env .env.local
# 编辑 .env.local，将 API_MODE 改为 real，填入真实地址
```

### 2. 实现 `realClient.ts`

文件位置：`src/shared/api/realClient.ts`

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
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('workbench_token') ?? ''
  return { Authorization: `Bearer ${token}` }
}
```

### 3. 创建 API 工厂

文件位置：`src/shared/api/index.ts`

```ts
import type { WorkbenchApi } from './client'
import { mockClient } from './mockClient'

export function getApiClient(): WorkbenchApi {
  if (import.meta.env.VITE_WORKBENCH_API_MODE === 'real') {
    // 动态导入避免 mock 数据打包到 production
    return import('./realClient').then(m => m.realClient)
  }
  return mockClient
}
```

### 4. 实现真实 WebSocket

文件位置：`src/shared/ws/realWs.ts`

```ts
import type { WorkbenchWs, WsConnectionStatus, WsEventHandler } from './client'
import type { ServerPushEvent } from '@/shared/api/types'

export function createRealWs(): WorkbenchWs {
  const WS_URL = import.meta.env.VITE_WORKBENCH_WS_URL
  let ws: WebSocket | null = null
  let status: WsConnectionStatus = 'disconnected'
  // ... 实现 connect/disconnect/heartbeat/reconnect
}
```

---

## Mock 场景测试

通过 URL query param `?scenario=xxx` 切换 mock 场景：

| URL | 场景 | 行为 |
|-----|------|------|
| `localhost:5173/workbench` | 正常流 | 11 个会话，消息收发正常 |
| `localhost:5173/workbench?scenario=empty` | 空状态 | 无会话，无消息 |
| `localhost:5173/workbench?scenario=error` | 权限不足 | API 返回 401，触发跳转登录页 |
| `localhost:5173/workbench?scenario=timeout` | 超时/断连 | 翻译延迟 4s+，WS 10s 后断开再重连，账号显示断连 |

---

## 文件对照表

| Mock 文件 | Real 文件（onsite 后实现） | 说明 |
|-----------|--------------------------|------|
| `shared/api/mockClient.ts` | `shared/api/realClient.ts` | HTTP API 实现 |
| `shared/ws/mockWs.ts` | `shared/ws/realWs.ts` | WebSocket 实现 |
| `mocks/data/index.ts` | 不需要 | 仅 mock 模式使用 |

---

## 注意事项

1. **不要删除 mock 文件** — 开发和演示时仍需要 mock 模式
2. **Token 存储** — mock 模式存在 Zustand（内存），real 模式需要持久化到 localStorage
3. **错误处理** — real 模式需要统一的 HTTP 错误拦截器（401 → logout，5xx → toast）
4. **CORS** — 如果 BFF 和前端不同源，需要 BFF 配置 CORS headers
5. **环境隔离** — `.env.local` 不提交 git，每个开发者本地配置自己的 BFF 地址
