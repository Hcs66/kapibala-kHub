# AGENTS.md

## Project Overview

kHub 是一个 monorepo 项目，核心产品是**销售工作台（Workbench）**——一个面向销售员的跨平台即时消息实时工作台。

本仓库当前只负责实现 **Workbench Web SPA**（`apps/workbench`）。后端由 talksub（业务主后端）和 cq connector runtime（TG/WA 连接器）提供，不在本仓库范围内。

---

## Architecture

```
kapibala-kHub/                  # monorepo root
├── apps/
│   └── workbench/              # 销售工作台 Web SPA（本项目唯一实施目标）
├── packages/                   # 共享包（未来扩展）
├── docs/v1/                    # 产品文档、技术方案、开发计划
└── ai_input/                   # AI 辅助输入资料
```

### Workbench 定位

- 独立 Web SPA，三栏布局（会话列表 / 消息区 / 分析侧栏）
- 唯一用户角色：`sales`（销售员）
- 所有数据通过 API adapter 层获取，不直连任何数据库
- Mock/Real 数据源通过环境变量切换

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 19 + TypeScript (strict) |
| Build | Vite |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| Icons | lucide-react |
| State Management | Zustand |
| Data Fetching | TanStack Query (React Query) |
| Virtual Scroll | @tanstack/virtual |
| Routing | React Router v7 |
| i18n | i18next + react-i18next |
| WebSocket | Native WebSocket + custom reconnect |
| Package Manager | pnpm |

---

## Code Conventions

### TypeScript

- `strict: true`，不允许 `any`、`@ts-ignore`、`@ts-expect-error`
- 优先使用 `interface` 定义对象类型，`type` 用于联合/交叉/工具类型
- 所有导出函数和组件必须有显式返回类型
- 使用 barrel exports（`index.ts`）组织模块公开 API

### React

- 函数组件 + hooks，不使用 class 组件
- 组件文件使用 PascalCase（`MessageBubble.tsx`）
- Hook 文件使用 camelCase（`useMessages.ts`）
- 每个 feature 目录自包含：组件、hooks、类型
- Props 接口命名：`{ComponentName}Props`
- 避免 prop drilling，跨层数据走 Zustand store

### State Management (Zustand)

- 每个领域一个独立 store（auth、conversation、message、account、analysis、ws）
- Store 文件放在 `src/stores/`
- 不在 store 中存放派生数据，用 selector 或 computed
- 异步操作在 store action 中完成，组件只调用 action

### Styling (Tailwind + Intelligence Layer Design System)

- Design system 定义在 `docs/design/design.md`（"Intelligence Layer"）
- 所有颜色、圆角、间距通过 CSS 变量定义在 `src/index.css` 的 `@theme` 块中
- 字体：Inter（全局），通过 Google Fonts 或本地引入
- 视觉风格：Modern Minimalism + Glassmorphism（半透明 + backdrop-blur）
- 主色：Indigo（`--color-primary: #4f46e5`），背景：off-white slate（`--color-background: #f7f9fb`）
- 圆角基线：8px（`--radius-DEFAULT`），大容器 16px（`--radius-lg`）
- 间距基线：4px rhythm，内边距 MD(16px) / LG(24px)
- 卡片：白底 + 1px border `#e2e8f0` + soft shadow `0 4px 20px rgba(0,0,0,0.04)`
- AI 洞察区域：5% Indigo 背景色 + 2px gradient border
- Glass 效果：`backdrop-filter: blur(16px)` + 70-80% opacity white fill
- 输入框 focus：border 变 Indigo + 4px indigo glow
- 列表 hover：light indigo tint `#eef2ff`
- 不写自定义 CSS 文件，除非 Tailwind 无法表达（如 keyframes）
- 响应式断点：`sm:640px` / `md:768px` / `lg:1024px` / `xl:1280px`

### i18n (i18next + react-i18next)

- 配置入口：`src/shared/i18n/index.ts`，在 `main.tsx` 中 import 初始化
- 翻译资源：`src/shared/i18n/zh.ts`（默认）、`src/shared/i18n/en.ts`
- 语言切换：`changeLanguage(lang)` 函数，同时持久化到 `localStorage('workbench_lang')`
- 组件中使用：`const { t } = useTranslation()` + `t('namespace.key')`
- 翻译 key 结构按功能域划分：`common`、`auth`、`workbench`、`conversation`、`message`、`translate`、`analysis`、`account`、`ws`
- 插值语法：`{{count}}`（如 `t('message.newMessages', { count: 5 })`）
- **规则：**
  - 所有面向用户的文本必须走 `t()` 调用，不允许硬编码中文/英文字符串
  - 新增功能时同步更新 `zh.ts` 和 `en.ts`
  - Mock 数据中的展示文本（如用户名 `'张三'`）不需要 i18n 化

### File Organization

```
src/
  app/              # 应用入口、路由、providers、共享主框架布局（Layout）
  features/         # 功能模块（自包含，每个模块拥有独立页面）
    {feature}/
      pages/        # 模块独立页面（对应路由，由主框架 Layout 包裹）
      components/   # 模块内组件（如有多个）
      hooks/        # 模块内 hooks
      types.ts      # 模块内类型
      index.ts      # 模块公开 API
  shared/
    api/            # API adapter 层（mock/real 切换）
    ws/             # WebSocket adapter 层
    i18n/           # 国际化配置与翻译资源
    ui/             # 通用 UI 组件
    utils/          # 工具函数
  stores/           # Zustand stores
  mocks/            # Mock 数据和场景
```

### 页面与路由规范

- **主框架布局（Layout）** 定义在 `src/app/` 中，所有模块页面共享同一个顶层 Layout（如导航栏、侧边栏骨架）
- **每个独立功能模块在自己的 feature 目录下拥有独立的 `pages/` 子目录**，存放该模块对应的页面级组件
- 路由配置统一在 `src/app/` 中注册，引用各 feature 的页面组件，通过嵌套路由实现 Layout 共享
- 模块页面通过 React Router 的 `<Outlet />` 嵌套在主框架 Layout 内渲染
- **禁止**在 `src/app/` 中直接编写业务页面逻辑——`app/` 只负责路由声明和 Layout 骨架
- 各模块页面之间保持解耦，跨模块通信走 Zustand store 或 URL 参数，不允许直接 import 其他 feature 的内部组件

**示例路由结构：**

```
src/app/routes.tsx          # 路由注册（引用各 feature 页面）
src/app/Layout.tsx          # 共享主框架（导航、侧边栏骨架）

src/features/conversation/
  pages/
    ConversationPage.tsx    # 会话主页面
  components/
    ConversationList.tsx
    MessageArea.tsx
  hooks/
    useConversations.ts

src/features/account/
  pages/
    AccountPage.tsx         # 账号管理页面
  components/
    AccountStatusCard.tsx

src/features/analysis/
  pages/
    AnalysisPage.tsx        # 分析侧栏页面（或面板）
  components/
    AnalysisSummary.tsx
```

### Naming

- 文件/目录：组件 PascalCase，其余 camelCase，目录 kebab-case
- 变量/函数：camelCase
- 类型/接口：PascalCase
- 常量：UPPER_SNAKE_CASE
- 事件类型：`dot.separated`（如 `message.received`）

---

## API Layer Rules

所有数据访问必须通过 `shared/api/client.ts` 定义的 adapter 接口：

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

**规则：**

- 组件中不允许直接拼 URL 或调用 fetch
- Mock 和 Real 实现通过 `VITE_WORKBENCH_API_MODE` 环境变量切换
- WebSocket 事件同样走 adapter 层（`shared/ws/client.ts`）
- DTO 类型定义在 `shared/api/types.ts`，是前后端契约，不随意修改

---

## WebSocket Events

### Server → Client

| Event | Description |
|-------|-------------|
| `message.received` | 新入站消息 |
| `message.sent` | 出站发送成功 |
| `message.failed` | 出站发送失败 |
| `account.status_changed` | 账号连接状态变化 |
| `analysis.updated` | 分析结果刷新 |
| `visibility.changed` | 可见性策略变更 |

### Client → Server

| Command | Description |
|---------|-------------|
| `message.send` | 发送消息 |
| `read.ack` | 已读回执 |
| `sync.request` | 增量同步请求 |
| `ping` | 心跳（30s 间隔） |

---

## Key Behaviors

| Behavior | Implementation |
|----------|---------------|
| 会话切换 | 不重连 WS，只更新 store 中 currentConversationId |
| 翻译预览 | 输入防抖 500ms → 调翻译 API → 显示预览 → 用户确认才发送 |
| Optimistic Send | 点击发送立即显示 pending 气泡，成功/失败后更新状态 |
| 虚拟滚动 | 消息列表使用 @tanstack/virtual，锚定 conversation_seq |
| 断线重连 | 指数退避 1s→2s→4s→8s→16s→30s，重连后发 sync.request |
| 未读管理 | 新消息 +1，进入会话后清零并发 read.ack |
| 数据脱敏 | 服务端 ViewProjector 处理，前端按"字段不存在"渲染 |

---

## Environment Variables

```bash
# API 模式切换
VITE_WORKBENCH_API_MODE=mock|real
VITE_WORKBENCH_API_BASE=/mock          # mock 模式
VITE_WORKBENCH_API_BASE=/workbench     # real 模式
VITE_WORKBENCH_WS_URL=/workbench/ws    # real 模式 WebSocket
```

---

## Testing

- 单元测试：Vitest
- 组件测试：Testing Library
- Mock 场景覆盖：正常流、空状态、发送失败、翻译超时、账号断连、权限不足、网络断线

---

## What This Repo Does NOT Do

- ❌ 后端服务（talksub 负责）
- ❌ Connector 实现（cq runtime 负责）
- ❌ 数据库设计或迁移
- ❌ Auth/RBAC 实现（调用后端 API）
- ❌ Admin SPA（独立项目，不在本仓库）
- ❌ 移动端原生应用
- ❌ 视频/音频/文件消息（V1 只支持文本 + 图片）

---

## Reference Documents

| Document | Purpose |
|----------|---------|
| `docs/design/design.md` | Design System 定义（Intelligence Layer） |
| `docs/v1/workbench_demo_plan.md` | Onsite 前开发计划（当前执行） |
| `docs/v1/kHub_workbench_prd_v1.md` | 销售工作台产品需求文档 |
| `docs/v1/kHub_plan_v1-2.md` | kHub V1.2 完整实施计划 |
| `docs/v1/kHub_plan_ts_v1.md` | 技术实现规格（接口定义、Store 设计） |
| `docs/v1/kHub_data_model_v1.md` | 数据模型定义 |
| `docs/v1/workbench_onsite_questions.md` | Onsite 对接问题清单 |
| `docs/v1/workbench_mock_to_real.md` | Mock → Real 切换配置说明 |
| `ai_input/resources/kHub_Workbench_协作与对接说明_2026-05-05.md` | CTO 协作说明（DTO、mock contract） |
