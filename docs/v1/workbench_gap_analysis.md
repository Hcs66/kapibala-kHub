# Workbench Demo Gap Analysis

> 日期：2026-05-07
> 对照文档：workbench_demo_plan.md / kHub_workbench_prd_v1.md / AGENTS.md / 协作与对接说明
> 当前代码：apps/workbench/src/（30 文件，~2500 行）

---

## 已覆盖的功能

| 需求 | 来源 | 状态 |
|------|------|------|
| 三栏布局（左 300px / 中 flex / 右 320px） | Demo A.6 | ✅ |
| 登录页 + mock 登录（sales/sales） | Demo A.7 | ✅ |
| 路由守卫（未登录重定向） | Demo A.8 | ✅ |
| 会话列表（平台图标、客户名、最后消息、时间、未读角标 99+） | Demo B.2 | ✅ |
| 会话列表排序（最近活跃优先） | Demo B.3 | ✅ |
| 会话搜索 + 平台过滤 | Demo B.10 | ✅ |
| 消息气泡（入站左/出站右、时间分组 5min 间隔） | Demo B.5 | ✅ |
| 原文/译文全局切换 + 单条点击切换 | Demo B.6 | ✅ |
| 消息状态图标（pending/sent/delivered/read/failed） | Demo B.7 | ✅ |
| 发送失败重试按钮 | Demo C.3 | ✅ |
| Optimistic Send（点击发送立即显示 pending 气泡） | Demo C.1 | ✅ |
| 翻译预览（500ms 防抖、原文+译文双行、确认发送） | Demo C.4/C.5 | ✅ |
| 虚拟滚动（@tanstack/virtual，消息列表） | Demo B.9 | ✅ |
| 历史消息加载（向上滚动触发） | Demo C.9 | ✅ |
| "有新消息"提示条（不自动滚动时显示） | Demo C.10 | ✅ |
| 账号状态横幅（disconnected/reconnecting/error） | Demo D.1 | ✅ |
| 分析侧栏（stage、sentiment、summary、trust、concern、evidence） | Demo D.3 | ✅ |
| 建议回复（卡片列表、点击插入输入框） | Demo D.4 | ✅ |
| Mock WS（定时回放 message.received + 断连/重连模拟） | Demo C.6 | ✅（部分） |
| Mock API（正常/空/错误/超时场景） | Demo Plan | ✅ |
| WS 断线状态横幅 | Demo D.9 | ✅（WS 层面） |
| API adapter 接口定义（WorkbenchApi 8 方法） | Demo A.4 | ✅ |
| WS adapter 接口定义 | Demo A.5 | ✅ |
| DTO 类型文件（完整匹配 CTO 给定） | Demo A.3 | ✅ |
| i18n 中英双语 | AGENTS.md | ✅（超出 demo plan 要求） |
| Design System CSS tokens（Intelligence Layer） | AGENTS.md | ✅ |
| Loading skeleton | Demo D.6 | ✅ |
| Empty state（无会话、无消息） | Demo D.7 | ✅ |

---

## 部分覆盖 / 有缺陷

| 需求 | 来源 | 当前状态 | 差距描述 |
|------|------|---------|---------|
| Mock 发送状态流转 | Demo C.2 | REST 返回 sent/failed | WS 没有推送 `message.sent` / `message.failed` 事件，只靠 REST 响应更新状态 |
| 会话切换清零未读 | PRD §5.4 | `switchConversation` 只更新 currentId | 没有清零被点入会话的 unreadCount |
| 虚拟滚动锚定 | PRD §4.2.3 | 使用数组 index | 应用 `conversation_seq` 做锚点，当前 DTO 无此字段，用 `createdAtMs` 代替 |
| 时间分组格式 | PRD §4.2.4 | Today/Yesterday/MM-DD | 缺少跨年判断（应显示 YYYY-MM-DD HH:mm） |
| Mock 数据丰富度 | Demo B.1 | 11 会话，仅 2 个有消息 | 要求"10+ 会话、每会话 50+ 消息"，大部分会话无消息数据 |
| Mock WS 事件种类 | Demo C.6 | 只模拟 `message.received` | 应模拟 6 种事件，当前只有 1 种 |
| 会话列表虚拟滚动 | PRD §4.1.5 | 普通 map 渲染 | 数千级会话时需要 @tanstack/virtual |

---

## 完全未覆盖

### P0（Demo 交付必须）

| # | 缺失功能 | 来源 | 说明 |
|---|---------|------|------|
| 1 | Mock WS 补全事件 | Demo C.6 | 增加 `message.sent`、`message.failed`、`account.status_changed`、`analysis.updated` 事件模拟 |
| 2 | WS 事件驱动 UI 更新 | Demo C.7/C.8/D.2/D.5 | 收到 WS 事件后更新气泡状态、账号状态、分析侧栏 |
| 3 | 会话切换清零未读 | PRD §5.4 | switchConversation 时将该会话 unreadCount 置 0 |
| 4 | API adapter 切换机制 | 协作说明 §3.2 | 通过 `VITE_WORKBENCH_API_MODE` env 变量选择 mock/real client |
| 5 | 组件解耦 mockClient | AGENTS.md API 层规则 | 组件不直接 import `mockClient`，改为通过统一入口获取 client 实例 |
| 6 | 对接问题清单文档 | Demo D.11 | `docs/v1/workbench_onsite_questions.md` |
| 7 | mock → real 切换配置说明 | Demo D.12 | `docs/v1/workbench_mock_to_real.md` |
| 8 | Error state 全局展示 | Demo D.8 | API 调用失败时的用户可见错误提示（非 console） |

### P1（Demo 体验提升）

| # | 缺失功能 | 来源 | 说明 |
|---|---------|------|------|
| 1 | Mock 数据扩充 | Demo B.1 | 更多会话有消息数据（当前只有 2 个有完整消息线程） |
| 2 | 图片消息展示 | PRD §4.2.6 | 至少 mock 一张图片的渲染（缩略图 + 点击查看原图） |
| 3 | 会话列表虚拟滚动 | PRD §4.1.5 | 会话列表也用 @tanstack/virtual |
| 4 | 时间分组跨年格式 | PRD §4.2.4 | 跨年消息显示 YYYY-MM-DD HH:mm |
| 5 | 交互 polish | Demo D.10 | 动画过渡、hover 效果细化 |
| 6 | read.ack 发送 | PRD §5.4 | 切换会话时通过 WS 发送 read.ack 命令 |
| 7 | visibility.changed 处理 | PRD §9.3 | 收到事件后刷新受影响的会话/消息数据 |
| 8 | 网络层 offline 检测 | Demo D.9 | 浏览器 navigator.onLine 监听 + 离线横幅 |
| 9 | 心跳机制 | PRD §7.4 | 30s ping（mock 阶段可简化为日志输出） |
| 10 | 重连后增量同步 | PRD §7.4 | 重连成功后发 sync.request |

### P2（架构规范对齐）

| # | 缺失项 | 来源 | 说明 |
|---|--------|------|------|
| 1 | 独立 store 提取 | AGENTS.md | 提取 `accountStore`、`analysisStore`、`wsStore`（当前散落在 WorkbenchPage useState） |
| 2 | WorkbenchPage 拆分 | AGENTS.md | 294 行 God Component → 拆分为 `useConversations`、`useMessages`、`useWebSocket`、`useTranslate` 等 hooks |
| 3 | Feature barrel exports | AGENTS.md | 各 feature 目录添加 `index.ts` |
| 4 | Feature hooks 目录 | AGENTS.md | 各 feature 添加 `hooks/` 子目录 |
| 5 | shared/ui 组件 | AGENTS.md | 引入 shadcn/ui 基础组件（Button、Input、Avatar 等） |
| 6 | shared/utils 工具函数 | AGENTS.md | 日期格式化、ID 生成、防抖等通用工具 |
| 7 | Feature types.ts | AGENTS.md | 各 feature 目录添加模块内类型定义 |

---

## 架构问题

| 问题 | 影响 | 建议修复方式 |
|------|------|------------|
| WorkbenchPage 是 294 行 God Component | 所有数据获取、WS 管理、状态协调集中在一个文件，可维护性差 | 拆分为自定义 hooks，每个 feature 一个 hook |
| 组件直接 import mockClient | TranslatePreview.tsx 和 WorkbenchPage.tsx 直接依赖 mock 实现，切换 real 时需改组件代码 | 创建 `shared/api/index.ts` 统一导出，根据 env 选择实现 |
| account/analysis/ws 状态用 useState | 违反"每个领域一个独立 store"规范，状态无法跨组件共享 | 提取为独立 Zustand store |
| mocks/scenarios/ 目录为空 | 场景切换逻辑内联在 mockClient 中（URL param），不够清晰 | 可保持现状（URL param 方式可接受），或提取为独立场景文件 |

---

## 实施建议顺序

```
第一批（功能闭环）：
  P0-4 → API adapter 切换机制
  P0-5 → 组件解耦 mockClient
  P0-3 → 会话切换清零未读
  P0-1 → Mock WS 补全事件
  P0-2 → WS 事件驱动 UI 更新
  P0-8 → Error state 全局展示

第二批（文档交付）：
  P0-6 → 对接问题清单
  P0-7 → mock → real 切换说明

第三批（体验提升）：
  P1-1 → Mock 数据扩充
  P1-4 → 时间分组跨年
  P1-2 → 图片消息
  P1-5 → 交互 polish

第四批（架构对齐）：
  P2-1 → 独立 store 提取
  P2-2 → WorkbenchPage 拆分
  P2-3~7 → 目录结构规范化
```

---

**文档结束**
