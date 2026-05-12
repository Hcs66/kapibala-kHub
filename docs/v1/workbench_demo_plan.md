# kHub Workbench Demo 开发计划（Onsite 前）

**时间窗口：** 2026-05-05 ~ 2026-05-12（7 天）
**目标：** 交付一个可运行、可演示、可对接的 Workbench Web SPA，基于 mock contract 跑通完整前端工作流，onsite 后只需切换数据源即可接入真实后端。

**状态更新（2026-05-09）：** 所有 Phase A~D 核心任务已完成，且已超出原 demo 范围实现了多项 V1.5 级别功能（详见下方"超出 Demo 范围的已实现功能"章节）。

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
| 图标 | lucide-react + @icons-pack/react-simple-icons |
| 状态管理 | Zustand |
| 数据请求 | React Query (TanStack Query) |
| 虚拟滚动 | @tanstack/virtual |
| UI 组件 | shadcn/ui |
| 国际化 | i18next + react-i18next |
| 路由 | React Router v7 |

---

## 目录结构（实际）

```
apps/workbench/
  src/
    app/
      WorkbenchApp.tsx          # 根组件
      routes.tsx                # 路由定义（多页面）
      AppLayout.tsx             # 共享主框架布局（Sidebar + TopBar + Outlet）
      Sidebar.tsx               # 左侧导航栏（可折叠）
      TopBar.tsx                # 顶部栏（全局搜索 + 语言切换 + 通知）
      AuthGuard.tsx             # 路由鉴权守卫
    pages/
      LoginPage.tsx             # 登录页
    features/
      conversations/            # 会话模块
        pages/
          ConversationPage.tsx  # 三栏主工作台页面
        ConversationList.tsx    # 会话列表（含 Avatar、PlatformPill、TagBadge）
        PlatformTabs.tsx        # 平台过滤 Tab
        ChatTypeTabs.tsx        # 单聊/群聊过滤 Tab
        TagFilterBar.tsx        # 标签快捷过滤栏
        TagPopover.tsx          # 标签管理弹窗（CRUD）
        FilterPopover.tsx       # 高级过滤弹窗（时间范围、客户、公司）
        hooks/
          useWorkbenchWs.ts     # WebSocket 连接 + 事件分发
          useMessageActions.ts  # 消息发送/重试/加载更多
      messages/                 # 消息区模块
        MessagePanel.tsx        # 消息面板（虚拟滚动 + 新消息提示）
        MessageBubble.tsx       # 消息气泡 + 时间分隔线
        MessageInput.tsx        # 输入框
        MessageSkeleton.tsx     # 加载骨架屏
      translate/                # 翻译预览模块
        TranslatePreview.tsx
      accounts/                 # 账号状态模块
        AccountStatusBar.tsx
      analysis/                 # 分析侧栏模块（3-Tab）
        AnalysisSidebar.tsx     # 侧栏容器（Insights / Profile / Timeline）
        InsightsPanel.tsx       # AI 洞察面板（意图预测 + 成交建议 + 动作建议）
        ProfilePanel.tsx        # 客户画像面板
        TimelinePanel.tsx       # 时间线面板
      search/                   # 全局搜索模块
        GlobalSearch.tsx        # 顶部全局搜索（客户/公司/会话）
      persons/                  # 客户管理模块
        pages/
          PersonsPage.tsx       # 客户列表页
      organizations/            # 公司管理模块
        pages/
          OrganizationsPage.tsx # 公司列表页
    shared/
      api/
        client.ts               # API adapter 接口定义（扩展版）
        index.ts                # API 工厂（mock/real 切换）
        mockClient.ts           # Mock 实现（完整）
        types.ts                # DTO 类型（扩展版）
      ws/
        client.ts               # WS adapter 接口
        mockWs.ts               # Mock WS（事件回放 + 断线模拟）
      i18n/
        index.ts                # i18n 配置
        zh.ts                   # 中文翻译
        en.ts                   # 英文翻译
      ui/                       # 通用 UI 组件
      utils/                    # 工具函数
    stores/
      authStore.ts              # 登录态
      conversationStore.ts      # 会话列表 + 过滤 + 标签选择
      messageStore.ts           # 消息列表 + 发送状态机
      accountStore.ts           # 账号连接状态
      analysisStore.ts          # 分析数据
      tagStore.ts               # 标签 CRUD
      toastStore.ts             # 全局 Toast 通知
    mocks/
      data/
        index.ts                # 所有 mock 数据（含 persons、organizations、timeline 等）
      scenarios/                # Mock 场景
```

---

## 分阶段排期

### Phase A：项目骨架 + 三栏布局（5/5 ~ 5/6，2 天）✅ 已完成

| # | 任务 | 产出 | 状态 |
|---|------|------|------|
| A.1 | 初始化 Vite + React 19 + TS strict + Tailwind + shadcn/ui | 可运行空项目 | ✅ |
| A.2 | 配置 ESLint + Prettier + path alias | 开发规范就绪 | ✅ |
| A.3 | 冻结 DTO 类型文件（`shared/api/types.ts`） | 类型基线 | ✅ 已扩展 |
| A.4 | 实现 API adapter 接口定义（`WorkbenchApi` interface） | 前端契约 | ✅ 已扩展 |
| A.5 | 实现 WS adapter 接口定义（`WorkbenchWs` interface） | 实时契约 | ✅ |
| A.6 | 三栏主布局骨架（左：会话列表 240px / 中：消息区 flex / 右：分析侧栏 320px） | 布局可见 | ✅ |
| A.7 | 登录页壳（表单 + mock 登录逻辑） | 登录流程可走通 | ✅ |
| A.8 | 路由配置（/ → 登录，/workbench → 主工作台，未登录重定向） | 路由可用 | ✅ 已扩展为多页面路由 |

**出口标准：** ✅ `pnpm dev` 启动后可看到登录页，mock 登录后进入三栏布局。

---

### Phase B：会话列表 + 消息区（5/6 ~ 5/8，2 天）✅ 已完成

| # | 任务 | 产出 | 状态 |
|---|------|------|------|
| B.1 | Mock 数据准备（10+ 会话、每会话 50+ 消息、覆盖 TG/WA 双平台） | mock JSON | ✅ |
| B.2 | 会话列表组件（平台图标、客户名、最后消息预览、时间、未读角标） | 列表可渲染 | ✅ |
| B.3 | 会话列表排序（最近活跃优先，未读置顶） | 排序正确 | ✅ |
| B.4 | 会话切换交互（点击切换 → store 更新 → 消息区刷新） | 切换可用 | ✅ |
| B.5 | 消息气泡布局（入站左对齐、出站右对齐、时间分组分隔线） | 气泡可见 | ✅ |
| B.6 | 原文/译文切换（全局开关 + 单条点击临时切换） | 切换可用 | ✅ |
| B.7 | 消息状态图标（pending/sent/delivered/read/failed） | 状态可见 | ✅ |
| B.8 | 消息输入框 + 发送按钮 | 输入可用 | ✅ |
| B.9 | 虚拟滚动（@tanstack/virtual，消息列表） | 大量消息不卡 | ✅ |
| B.10 | 会话列表搜索/平台过滤 | 过滤可用 | ✅ |

**出口标准：** ✅ 可在会话间切换，消息气泡正确渲染，原文/译文可切换，输入框可输入。

---

### Phase C：发送 + 翻译预览 + 实时事件（5/8 ~ 5/10，2 天）✅ 已完成

| # | 任务 | 产出 | 状态 |
|---|------|------|------|
| C.1 | 发送消息 optimistic UI（点击发送 → 立即显示 pending 气泡） | 乐观更新 | ✅ |
| C.2 | Mock 发送成功/失败（延迟 1-3s 后随机成功或失败） | 状态流转 | ✅ |
| C.3 | 发送失败重试交互（failed 气泡显示重试按钮，点击重发） | 重试可用 | ✅ |
| C.4 | 翻译预览区（输入框下方，防抖 500ms 后显示 mock 译文） | 预览可见 | ✅ |
| C.5 | 翻译预览交互（原文 + 译文双行显示，确认发送才真正发出） | 流程完整 | ✅ |
| C.6 | Mock WS 实现（定时回放 mock 事件：新消息、状态变更） | 实时模拟 | ✅ |
| C.7 | 收到 `message.received` → 会话置顶 + 未读 +1 + 追加气泡 | 入站联动 | ✅ |
| C.8 | 收到 `message.sent` / `message.failed` → 更新气泡状态 | 出站联动 | ✅ |
| C.9 | 历史消息加载（向上滚动触发加载更早消息） | 历史可加载 | ✅ |
| C.10 | "有新消息"提示条（用户在查看历史时，新消息到达不自动滚动） | 提示可见 | ✅ |

**出口标准：** ✅ 完整的发送流程（输入 → 翻译预览 → 确认发送 → pending → sent/failed → 重试），mock 实时事件驱动 UI 更新。

---

### Phase D：账号状态 + 分析侧栏 + 状态兜底（5/10 ~ 5/12，2 天）✅ 已完成

| # | 任务 | 产出 | 状态 |
|---|------|------|------|
| D.1 | 账号状态顶部横幅（connected/disconnected/reconnecting/error） | 状态可见 | ✅ |
| D.2 | Mock 账号状态变更事件（`account.status_changed`） | 状态联动 | ✅ |
| D.3 | 分析侧栏 — 会话摘要区（stage、summary、trust、concern） | 摘要可见 | ✅ 已升级为 3-Tab |
| D.4 | 分析侧栏 — 建议回复区（卡片列表，点击插入输入框） | 建议可用 | ✅ |
| D.5 | Mock `analysis.updated` 事件 → 侧栏刷新 | 分析联动 | ✅ |
| D.6 | 全局状态兜底：loading skeleton | 加载态 | ✅ |
| D.7 | 全局状态兜底：empty state（无会话、无消息） | 空态 | ✅ |
| D.8 | 全局状态兜底：error state（API 失败） | 错误态 | ✅ |
| D.9 | 全局状态兜底：offline / reconnecting 横幅 | 断线态 | ✅ |
| D.10 | 交互 polish（动画过渡、hover 效果、键盘快捷键基础） | 体验提升 | ✅ |
| D.11 | 整理对接问题清单（onsite 需确认的 mapping 问题） | 文档 | ✅ |
| D.12 | 准备 mock → real 切换的 env 配置说明 | 文档 | ✅ |

**出口标准：** ✅ 完整可演示的 Workbench Demo，覆盖正常/空/错误/断线所有状态，对接清单就绪。

---

## 超出 Demo 范围的已实现功能

以下功能超出原始 7 天 demo 计划，属于 V1.5 Sales Workbench 方向的提前实现（UI Mock 层面）：

### 1. 多页面应用架构

- 完整的 Sidebar 导航（Dashboard / Conversations / Leads / Opportunities / Persons / Organizations / Analytics）
- 可折叠侧边栏 + TopBar + AuthGuard 路由守卫
- 多路由页面结构（部分页面暂时复用 ConversationPage 占位）

### 2. AI 洞察侧栏（3-Tab 设计）

- **Insights Tab**: 意图预测（IntentPrediction）+ 成交建议（DealSuggestion）+ 动作建议（ActionSuggestion）
- **Profile Tab**: 客户画像（联系人信息 + 公司信息 + 标签）
- **Timeline Tab**: 时间线事件（会话/线索/商机事件流）
- 置信度可视化、推理依据展开、动作执行确认

### 3. 标签系统

- 标签 CRUD（创建/删除/颜色选择）
- 会话标签分配/移除
- 标签快捷过滤栏
- 标签管理弹窗

### 4. 高级过滤

- 单聊/群聊类型过滤（ChatTypeTabs）
- 活跃度过滤（24h/3d/1w/1m 时间范围）
- 按客户（Person）过滤
- 按公司（Organization）过滤
- FilterPopover 高级过滤面板

### 5. 客户/公司管理

- PersonsPage：客户列表页（卡片布局）
- OrganizationsPage：公司列表页（卡片布局）
- Person/Organization DTO 及 mock 数据

### 6. 全局搜索

- TopBar 全局搜索组件（搜索客户/公司/会话）
- 防抖搜索 + 分类结果展示

### 7. 国际化

- 完整的 i18n 支持（中文/英文）
- 语言切换按钮 + localStorage 持久化
- 所有 UI 文本走 `t()` 调用

### 8. Toast 通知系统

- 全局 Toast store（error/success/info）
- 自动消失 + 手动关闭

### 9. 扩展的 DTO 类型

- `TagDTO`、`CustomerProfileDTO`、`IntentPredictionDTO`、`DealSuggestionDTO`
- `ActionSuggestionDTO`、`TimelineEventDTO`、`PersonDTO`、`OrganizationDTO`
- `GlobalSearchQuery`/`GlobalSearchResult`
- `conversation.tag_changed` WS 事件

---

## API Adapter 接口（实际，已扩展）

```ts
interface WorkbenchApi {
  // --- 原始 Demo 接口 ---
  login(input: LoginRequest): Promise<LoginResult>
  getCurrentUser(): Promise<CurrentUserDTO>
  listConversations(input: ConversationListQuery): Promise<ConversationListResult>
  listMessages(input: MessageHistoryQuery): Promise<MessageHistoryResult>
  sendMessage(input: SendMessageRequest): Promise<SendMessageResult>
  translatePreview(input: TranslatePreviewRequest): Promise<TranslatePreviewResult>
  getAnalysisSummary(conversationId: string): Promise<AnalysisSummaryDTO>
  listAccounts(): Promise<AccountStatusDTO[]>

  // --- 扩展接口（超出 Demo 范围） ---
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

Mock/Real 切换：

```
VITE_WORKBENCH_API_MODE=mock    # onsite 前
VITE_WORKBENCH_API_BASE=/mock

VITE_WORKBENCH_API_MODE=real    # onsite 后
VITE_WORKBENCH_API_BASE=/workbench
VITE_WORKBENCH_WS_URL=/workbench/ws
```

---

## DTO 类型定义（已扩展）

原始 CTO 给定的 DTO 类型已保留，并新增以下扩展类型：

```ts
// --- 原始 DTO（保持不变） ---
// CurrentUserDTO, ConversationDTO, MessageDTO, SendMessageRequest,
// SendMessageResult, AccountStatusDTO, AnalysisSummaryDTO,
// LoginRequest, LoginResult, ConversationListQuery, ConversationListResult,
// MessageHistoryQuery, MessageHistoryResult, TranslatePreviewRequest, TranslatePreviewResult

// --- 新增 DTO ---

export interface TagDTO {
  tagId: string
  name: string
  color?: string
  createdAtMs: number
}

export interface CustomerProfileDTO {
  conversationId: string
  person: {
    name: string
    avatar?: string
    phone?: string
    email?: string
    language?: string
    timezone?: string
    location?: string
    source?: string
    firstContactAtMs: number
  }
  company?: {
    name: string
    industry?: string
    size?: string
    website?: string
    country?: string
    annualRevenue?: string
  }
  tags: string[]
}

export interface IntentPredictionDTO {
  conversationId: string
  intent: string
  confidence: number
  reasoning: string
  relatedLeadIds?: string[]
  relatedOpportunityIds?: string[]
  updatedAtMs: number
}

export interface DealSuggestionDTO {
  conversationId: string
  predictedRange: { min: number; max: number; currency: string }
  suggestedProducts: Array<{
    productName: string
    suggestedPrice: number
    currency: string
    reason: string
  }>
  reasoning: string
  updatedAtMs: number
}

export interface ActionSuggestionDTO {
  conversationId: string
  actions: Array<{
    actionId: string
    type: 'quote' | 'convert_lead' | 'convert_opportunity' | 'transfer' | 'follow_up' | 'send_catalog' | 'other'
    label: string
    description: string
    priority: 'high' | 'medium' | 'low'
    reasoning: string
  }>
  updatedAtMs: number
}

export interface TimelineEventDTO {
  eventId: string
  conversationId: string
  type: 'conversation' | 'lead' | 'opportunity'
  title: string
  description?: string
  status?: string
  amount?: number
  currency?: string
  createdAtMs: number
  updatedAtMs?: number
  relatedId?: string
}

export interface PersonDTO {
  personId: string
  name: string
  avatar?: string
  phone?: string
  email?: string
  language?: string
  timezone?: string
  location?: string
  source?: string
  organizationId?: string
  conversationCount: number
  lastActiveAtMs: number
}

export interface OrganizationDTO {
  organizationId: string
  name: string
  industry?: string
  size?: string
  website?: string
  country?: string
  annualRevenue?: string
  personCount: number
  conversationCount: number
}

export interface GlobalSearchQuery {
  query: string
  limit?: number
}

export interface GlobalSearchResult {
  persons: PersonDTO[]
  organizations: OrganizationDTO[]
  conversations: ConversationDTO[]
}

// ConversationDTO 新增字段：
//   chatType: 'single' | 'group'
//   tags?: string[]
//   personId?: string
//   organizationId?: string

// ConversationListQuery 新增字段：
//   chatType?: 'single' | 'group'
//   tags?: string[]

// ServerPushEvent 新增事件：
//   | { type: 'conversation.tag_changed'; payload: { conversationId: string; tags: string[] } }
```

---

## Mock REST Contract

| Area | Method | Mock Path | 说明 |
|------|--------|-----------|------|
| Login | POST | `/mock/auth/login` | 返回 token + CurrentUserDTO |
| Current User | GET | `/mock/me` | 当前用户 |
| Conversations | GET | `/mock/workbench/conversations` | 会话列表（支持 chatType/tags 过滤） |
| Messages | GET | `/mock/workbench/conversations/:id/messages` | 消息历史 |
| Send | POST | `/mock/workbench/messages/send` | 发送消息 |
| Translate | POST | `/mock/workbench/translate/preview` | 输入框翻译预览 |
| Analysis | GET | `/mock/workbench/conversations/:id/analysis-summary` | 侧栏摘要 |
| Accounts | GET | `/mock/workbench/accounts` | 多账号状态 |
| Tags | GET | `/mock/workbench/tags` | 标签列表 |
| Create Tag | POST | `/mock/workbench/tags` | 创建标签 |
| Delete Tag | DELETE | `/mock/workbench/tags/:id` | 删除标签 |
| Tag Conversation | POST | `/mock/workbench/conversations/:id/tags/:tagId` | 会话添加标签 |
| Untag Conversation | DELETE | `/mock/workbench/conversations/:id/tags/:tagId` | 会话移除标签 |
| Customer Profile | GET | `/mock/workbench/conversations/:id/profile` | 客户画像 |
| Intent Prediction | GET | `/mock/workbench/conversations/:id/intent` | 意图预测 |
| Deal Suggestion | GET | `/mock/workbench/conversations/:id/deal-suggestion` | 成交建议 |
| Action Suggestions | GET | `/mock/workbench/conversations/:id/action-suggestions` | 动作建议 |
| Timeline Events | GET | `/mock/workbench/conversations/:id/timeline` | 时间线事件 |
| Persons | GET | `/mock/workbench/persons` | 客户列表 |
| Organizations | GET | `/mock/workbench/organizations` | 公司列表 |
| Global Search | GET | `/mock/workbench/search` | 全局搜索 |

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
| `conversation.tag_changed` | 会话标签变更（新增） |

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

- [x] 可运行 Workbench Web SPA（`pnpm dev` 即可启动）
- [x] Mock 登录 → 三栏工作台
- [x] 会话列表（切换、搜索、未读、平台图标）
- [x] 消息区（气泡、原文/译文、时间分组、虚拟滚动）
- [x] 发送流程（输入 → 翻译预览 → 确认 → optimistic → sent/failed/retry）
- [x] Mock 实时事件（新消息、状态变更、分析更新）
- [x] 账号状态横幅
- [x] 分析侧栏（摘要 + 建议回复）
- [x] 全状态覆盖（loading/empty/error/offline/reconnecting）
- [x] API adapter 层（mock/real 可切换）
- [x] WS adapter 层（mock 事件回放）
- [x] DTO 类型文件
- [x] 对接问题清单（onsite 带去讨论）
- [x] mock → real 切换配置说明
- [x] **额外** — 多页面路由 + Sidebar 导航
- [x] **额外** — AI 洞察侧栏（意图/成交/动作建议）
- [x] **额外** — 客户画像面板
- [x] **额外** — 时间线面板
- [x] **额外** — 标签系统（CRUD + 过滤）
- [x] **额外** — 高级过滤（类型/活跃度/客户/公司）
- [x] **额外** — 客户/公司管理页面
- [x] **额外** — 全局搜索
- [x] **额外** — 国际化（中/英）
- [x] **额外** — Toast 通知系统

---

## Onsite 当天目标（5/13）

1. 了解 talksub 后端结构 + cq connector runtime
2. 确认 BFF 放在哪个 repo
3. 确认真实 API mapping（mock endpoint → 真实 endpoint）
4. 确认 send/realtime/account 最小闭环
5. 开始把 mockClient 替换成 realClient
6. **新增** — 确认扩展接口（tags、profile、insights、timeline、persons、organizations）的后端支持计划

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

### P1：扩展接口对接

- `GET /workbench/tags` + CRUD
- `GET /workbench/conversations/:id/profile`
- `GET /workbench/conversations/:id/intent`
- `GET /workbench/conversations/:id/deal-suggestion`
- `GET /workbench/conversations/:id/action-suggestions`
- `GET /workbench/conversations/:id/timeline`
- `GET /workbench/persons`
- `GET /workbench/organizations`
- `GET /workbench/search`

### P2：真实发送闭环

- send request → connector dispatch → optimistic message → sent/failed event → DB writeback → retry

### P3：安全与权限

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
- ~~❌ 全局搜索~~ → 已实现（UI Mock）
- ❌ 离线模式

---

## 与现有文档的关系

| 文档 | 关系 |
|------|------|
| `kHub_plan_v1-2.md` | 本计划是其 §6.7（销售工作台 UI）的 onsite 前独立执行版本 |
| `kHub_workbench_prd_v1.md` | PRD 中的功能需求是本计划的功能参考，但实现范围限于 mock closed loop |
| `kHub_Workbench_协作与对接说明_2026-05-05.md` | CTO 反馈是本计划的直接输入，DTO/contract/排期均来自此文档 |
| `kHub_plan_ts_v1.md` | 技术实现细节参考，onsite 后 BFF 阶段使用 |
| `sales_workbench_plan_next.md` | V1.5 产品迭代计划，当前已提前实现部分 UI Mock（Lead Graph UI 未实现） |

---

**文档结束**
