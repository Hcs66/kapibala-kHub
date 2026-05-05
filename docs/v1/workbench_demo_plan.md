# kHub Workbench Demo 开发计划（Onsite 前）

**时间窗口：** 2026-05-05 ~ 2026-05-12（7 天）
**目标：** 交付一个可运行、可演示、可对接的 Workbench Web SPA，基于 mock contract 跑通完整前端工作流，onsite 后只需切换数据源即可接入真实后端。

---

## 核心原则

1. **不建后端** — talksub + cq connector runtime 已有主链路，onsite 后做 BFF adapter
2. **不写死真实 API** — 所有数据访问走 adapter 层，mock/real 通过 env 切换
3. **不改 Admin SPA** — 新建 `apps/workbench`，独立项目
4. **交互优先** — 验证前端工作流和状态机，不是做静态页面
5. **基于 CTO 给定的 DTO** — 使用协作说明中的 mock contract 和类型定义

---

## 技术栈

| 层级 | 选型 |
|------|------|
| 框架 | React 19 + TypeScript (strict) |
| 构建 | Vite |
| 样式 | Tailwind CSS |
| 图标 | lucide-react |
| 状态管理 | Zustand |
| 数据请求 | React Query (TanStack Query) |
| 虚拟滚动 | @tanstack/virtual |
| UI 组件 | shadcn/ui |

---

## 目录结构

```
apps/workbench/
  src/
    app/
      WorkbenchApp.tsx          # 根组件
      routes.tsx                # 路由定义
      providers.tsx             # Context providers
    pages/
      LoginPage.tsx             # 登录页
      WorkbenchPage.tsx         # 三栏主工作台
    features/
      conversations/            # 会话列表模块
        ConversationList.tsx
        ConversationItem.tsx
        useConversations.ts
      messages/                 # 消息区模块
        MessagePanel.tsx
        MessageBubble.tsx
        MessageInput.tsx
        useMessages.ts
      translate/                # 翻译预览模块
        TranslatePreview.tsx
        useTranslate.ts
      accounts/                 # 账号状态模块
        AccountStatusBar.tsx
        useAccounts.ts
      analysis/                 # 分析侧栏模块
        AnalysisSidebar.tsx
        useAnalysis.ts
    shared/
      api/
        client.ts               # API adapter 接口定义
        mockClient.ts           # Mock 实现
        realClient.ts           # 真实实现（onsite 后填充）
        types.ts                # DTO 类型（CTO 给定）
      ws/
        client.ts               # WS adapter 接口
        mockWs.ts               # Mock WS（事件回放）
        types.ts                # ServerPushEvent 类型
      ui/                       # 通用 UI 组件
    stores/
      authStore.ts              # 登录态
      conversationStore.ts      # 会话列表 + 当前会话
      messageStore.ts           # 消息列表 + 发送状态机
      accountStore.ts           # 账号连接状态
      analysisStore.ts          # 分析数据
      wsStore.ts                # WS 连接状态
    mocks/
      data/                     # Mock JSON 数据
        conversations.json
        messages.json
        accounts.json
        analysis.json
      scenarios/                # Mock 场景（正常/空/错误/断线）
```

---

## 分阶段排期

### Phase A：项目骨架 + 三栏布局（5/5 ~ 5/6，2 天）

| # | 任务 | 产出 | 优先级 |
|---|------|------|--------|
| A.1 | 初始化 Vite + React 19 + TS strict + Tailwind + shadcn/ui | 可运行空项目 | P0 |
| A.2 | 配置 ESLint + Prettier + path alias | 开发规范就绪 | P0 |
| A.3 | 冻结 DTO 类型文件（`shared/api/types.ts`）— 直接使用 CTO 给定的类型 | 类型基线 | P0 |
| A.4 | 实现 API adapter 接口定义（`WorkbenchApi` interface） | 前端契约 | P0 |
| A.5 | 实现 WS adapter 接口定义（`WorkbenchWs` interface） | 实时契约 | P0 |
| A.6 | 三栏主布局骨架（左：会话列表 240px / 中：消息区 flex / 右：分析侧栏 320px） | 布局可见 | P0 |
| A.7 | 登录页壳（表单 + mock 登录逻辑） | 登录流程可走通 | P0 |
| A.8 | 路由配置（/ → 登录，/workbench → 主工作台，未登录重定向） | 路由可用 | P0 |

**出口标准：** `pnpm dev` 启动后可看到登录页，mock 登录后进入三栏布局。

---

### Phase B：会话列表 + 消息区（5/6 ~ 5/8，2 天）

| # | 任务 | 产出 | 优先级 |
|---|------|------|--------|
| B.1 | Mock 数据准备（10+ 会话、每会话 50+ 消息、覆盖 TG/WA 双平台） | mock JSON | P0 |
| B.2 | 会话列表组件（平台图标、客户名、最后消息预览、时间、未读角标） | 列表可渲染 | P0 |
| B.3 | 会话列表排序（最近活跃优先，未读置顶） | 排序正确 | P0 |
| B.4 | 会话切换交互（点击切换 → store 更新 → 消息区刷新） | 切换可用 | P0 |
| B.5 | 消息气泡布局（入站左对齐、出站右对齐、时间分组分隔线） | 气泡可见 | P0 |
| B.6 | 原文/译文切换（全局开关 + 单条点击临时切换） | 切换可用 | P0 |
| B.7 | 消息状态图标（pending/sent/delivered/read/failed） | 状态可见 | P1 |
| B.8 | 消息输入框 + 发送按钮 | 输入可用 | P0 |
| B.9 | 虚拟滚动（@tanstack/virtual，消息列表） | 大量消息不卡 | P1 |
| B.10 | 会话列表搜索/平台过滤 | 过滤可用 | P1 |

**出口标准：** 可在会话间切换，消息气泡正确渲染，原文/译文可切换，输入框可输入。

---

### Phase C：发送 + 翻译预览 + 实时事件（5/8 ~ 5/10，2 天）

| # | 任务 | 产出 | 优先级 |
|---|------|------|--------|
| C.1 | 发送消息 optimistic UI（点击发送 → 立即显示 pending 气泡） | 乐观更新 | P0 |
| C.2 | Mock 发送成功/失败（延迟 1-3s 后随机成功或失败） | 状态流转 | P0 |
| C.3 | 发送失败重试交互（failed 气泡显示重试按钮，点击重发） | 重试可用 | P0 |
| C.4 | 翻译预览区（输入框下方，防抖 500ms 后显示 mock 译文） | 预览可见 | P0 |
| C.5 | 翻译预览交互（原文 + 译文双行显示，确认发送才真正发出） | 流程完整 | P0 |
| C.6 | Mock WS 实现（定时回放 mock 事件：新消息、状态变更） | 实时模拟 | P0 |
| C.7 | 收到 `message.received` → 会话置顶 + 未读 +1 + 追加气泡 | 入站联动 | P0 |
| C.8 | 收到 `message.sent` / `message.failed` → 更新气泡状态 | 出站联动 | P0 |
| C.9 | 历史消息加载（向上滚动触发加载更早消息） | 历史可加载 | P1 |
| C.10 | "有新消息"提示条（用户在查看历史时，新消息到达不自动滚动） | 提示可见 | P1 |

**出口标准：** 完整的发送流程（输入 → 翻译预览 → 确认发送 → pending → sent/failed → 重试），mock 实时事件驱动 UI 更新。

---

### Phase D：账号状态 + 分析侧栏 + 状态兜底（5/10 ~ 5/12，2 天）

| # | 任务 | 产出 | 优先级 |
|---|------|------|--------|
| D.1 | 账号状态顶部横幅（connected/disconnected/reconnecting/error） | 状态可见 | P0 |
| D.2 | Mock 账号状态变更事件（`account.status_changed`） | 状态联动 | P0 |
| D.3 | 分析侧栏 — 会话摘要区（stage、summary、trust、concern） | 摘要可见 | P0 |
| D.4 | 分析侧栏 — 建议回复区（卡片列表，点击插入输入框） | 建议可用 | P1 |
| D.5 | Mock `analysis.updated` 事件 → 侧栏刷新 | 分析联动 | P1 |
| D.6 | 全局状态兜底：loading skeleton | 加载态 | P0 |
| D.7 | 全局状态兜底：empty state（无会话、无消息） | 空态 | P0 |
| D.8 | 全局状态兜底：error state（API 失败） | 错误态 | P0 |
| D.9 | 全局状态兜底：offline / reconnecting 横幅 | 断线态 | P0 |
| D.10 | 交互 polish（动画过渡、hover 效果、键盘快捷键基础） | 体验提升 | P1 |
| D.11 | 整理对接问题清单（onsite 需确认的 mapping 问题） | 文档 | P0 |
| D.12 | 准备 mock → real 切换的 env 配置说明 | 文档 | P0 |

**出口标准：** 完整可演示的 Workbench Demo，覆盖正常/空/错误/断线所有状态，对接清单就绪。

---

## API Adapter 接口（CTO 给定）

```ts
interface WorkbenchApi {
  login(input: LoginRequest): Promise<LoginResult>;
  getCurrentUser(): Promise<CurrentUserDTO>;
  listConversations(input: ConversationListQuery): Promise<ConversationListResult>;
  listMessages(input: MessageHistoryQuery): Promise<MessageHistoryResult>;
  sendMessage(input: SendMessageRequest): Promise<SendMessageResult>;
  translatePreview(input: TranslatePreviewRequest): Promise<TranslatePreviewResult>;
  getAnalysisSummary(conversationId: string): Promise<AnalysisSummaryDTO>;
  listAccounts(): Promise<AccountStatusDTO[]>;
}
```

Mock/Real 切换：

```
VITE_WORKBENCH_API_MODE=mock    # onsite 前
VITE_WORKBENCH_API_BASE=/mock

VITE_WORKBENCH_API_MODE=real    # onsite 后
VITE_WORKBENCH_API_BASE=/workbench
VITE_WORKBENCH_WS_URL=/workbench/ws
```

---

## DTO 类型定义（CTO 给定，直接使用）

```ts
export type Role = 'sales' | 'lead' | 'supervisor' | 'boss';

export interface CurrentUserDTO {
  tenantId: string;
  userId: string;
  username: string;
  displayName: string;
  role: Role;
  teamIds: string[];
  capabilities: string[];
}

export interface ConversationDTO {
  conversationId: string;
  platform: 'telegram' | 'whatsapp' | 'line' | 'zalo' | string;
  accountId: string;
  accountDisplayName: string;
  customerDisplayName: string;
  assignedSalesId: string;
  lastMessageText: string;
  lastMessageAtMs: number;
  unreadCount: number;
  stage?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'unknown';
  analysisSummary?: string;
}

export interface MessageDTO {
  messageId: string;
  conversationId: string;
  platform: string;
  accountId: string;
  direction: 'inbound' | 'outbound';
  senderId: string;
  senderDisplayName: string;
  originalText: string;
  translatedText?: string;
  language?: string;
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  createdAtMs: number;
}

export interface SendMessageRequest {
  conversationId: string;
  accountId: string;
  text: string;
  translatedText?: string;
  idempotencyKey: string;
}

export interface SendMessageResult {
  clientMessageId: string;
  serverMessageId?: string;
  status: 'pending' | 'sent' | 'failed';
  errorMessage?: string;
}

export interface AccountStatusDTO {
  accountId: string;
  platform: 'telegram' | 'whatsapp' | string;
  displayName: string;
  status: 'connected' | 'disconnected' | 'reconnecting' | 'error';
  lastActiveAtMs?: number;
  errorMessage?: string;
}

export interface AnalysisSummaryDTO {
  conversationId: string;
  summary: string;
  stage?: string;
  trust?: string;
  concern?: string;
  nextAction?: string;
  evidenceRefs: Array<{
    messageId: string;
    quote?: string;
  }>;
  updatedAtMs: number;
}

export type ServerPushEvent =
  | { type: 'message.received'; payload: MessageDTO }
  | { type: 'message.sent'; payload: MessageDTO }
  | { type: 'message.failed'; payload: { clientMessageId: string; errorMessage: string } }
  | { type: 'account.status_changed'; payload: AccountStatusDTO }
  | { type: 'analysis.updated'; payload: AnalysisSummaryDTO }
  | { type: 'visibility.changed'; payload: { scope: string; version: string } };
```

---

## Mock REST Contract

| Area | Method | Mock Path | 说明 |
|------|--------|-----------|------|
| Login | POST | `/mock/auth/login` | 返回 token + CurrentUserDTO |
| Current User | GET | `/mock/me` | 当前用户 |
| Conversations | GET | `/mock/workbench/conversations` | 会话列表 |
| Messages | GET | `/mock/workbench/conversations/:id/messages` | 消息历史 |
| Send | POST | `/mock/workbench/messages/send` | 发送消息 |
| Translate | POST | `/mock/workbench/translate/preview` | 输入框翻译预览 |
| Analysis | GET | `/mock/workbench/conversations/:id/analysis-summary` | 侧栏摘要 |
| Accounts | GET | `/mock/workbench/accounts` | 多账号状态 |

---

## Mock Realtime Events

| Event | 用途 |
|-------|------|
| `message.received` | 收到新消息 |
| `message.sent` | 发送成功 |
| `message.failed` | 发送失败 |
| `account.status_changed` | 账号连接状态变化 |
| `analysis.updated` | 分析结果刷新 |
| `visibility.changed` | 权限/字段可见性变化 |

---

## Mock 覆盖场景

| 场景 | 说明 |
|------|------|
| 正常流 | 10+ 会话，消息收发正常，翻译正常 |
| 空状态 | 无会话、无消息 |
| 发送失败 | 随机 20% 概率失败，可重试 |
| 翻译超时 | 翻译预览延迟 3s+ |
| 账号断连 | 模拟 TG 账号断开 → reconnecting → 恢复 |
| 权限不足 | 401 → 跳登录页 |
| 网络断线 | WS 断开 → offline 横幅 → 重连 |

---

## 交付物清单（5/12 前）

- [ ] 可运行 Workbench Web SPA（`pnpm dev` 即可启动）
- [ ] Mock 登录 → 三栏工作台
- [ ] 会话列表（切换、搜索、未读、平台图标）
- [ ] 消息区（气泡、原文/译文、时间分组、虚拟滚动）
- [ ] 发送流程（输入 → 翻译预览 → 确认 → optimistic → sent/failed/retry）
- [ ] Mock 实时事件（新消息、状态变更、分析更新）
- [ ] 账号状态横幅
- [ ] 分析侧栏（摘要 + 建议回复）
- [ ] 全状态覆盖（loading/empty/error/offline/reconnecting）
- [ ] API adapter 层（mock/real 可切换）
- [ ] WS adapter 层（mock 事件回放）
- [ ] DTO 类型文件
- [ ] 对接问题清单（onsite 带去讨论）
- [ ] mock → real 切换配置说明

---

## Onsite 当天目标（5/13）

1. 了解 talksub 后端结构 + cq connector runtime
2. 确认 BFF 放在哪个 repo
3. 确认真实 API mapping（mock endpoint → 真实 endpoint）
4. 确认 send/realtime/account 最小闭环
5. 开始把 mockClient 替换成 realClient

---

## Onsite 后优先级

### P0：Workbench BFF 最小闭环

- `GET /workbench/me`
- `GET /workbench/conversations`
- `GET /workbench/conversations/:id/messages`
- `POST /workbench/messages/send`
- `POST /workbench/translate/preview`
- `GET /workbench/conversations/:id/analysis-summary`
- `GET /workbench/accounts`
- `/workbench/ws`

### P1：真实发送闭环

- send request → connector dispatch → optimistic message → sent/failed event → DB writeback → retry

### P2：安全与权限

- sales scope
- visibility projection
- audit log
- REST 与 realtime 同投影逻辑

---

## 明确不做（Onsite 前）

- ❌ 新建 kHub 后端
- ❌ 设计数据库
- ❌ 实现 Connector（TDLib/Baileys）
- ❌ 实现 Auth/RBAC
- ❌ 写死真实 API 路径或字段名
- ❌ 改造 Admin SPA
- ❌ 移动端适配（基础 responsive 除外）
- ❌ 视频/音频/文件消息
- ❌ 全局搜索
- ❌ 离线模式

---

## 与现有文档的关系

| 文档 | 关系 |
|------|------|
| `kHub_plan_v1-2.md` | 本计划是其 §6.7（销售工作台 UI）的 onsite 前独立执行版本 |
| `kHub_workbench_prd_v1.md` | PRD 中的功能需求是本计划的功能参考，但实现范围限于 mock closed loop |
| `kHub_Workbench_协作与对接说明_2026-05-05.md` | CTO 反馈是本计划的直接输入，DTO/contract/排期均来自此文档 |
| `kHub_plan_ts_v1.md` | 技术实现细节参考，onsite 后 BFF 阶段使用 |

---

**文档结束**
