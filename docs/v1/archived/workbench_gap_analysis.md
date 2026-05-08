# Workbench Demo Gap Analysis (v2)

> 更新日期：2026-05-07（第二次分析）
> 对照文档：workbench_demo_plan.md / kHub_workbench_prd_v1.md / AGENTS.md / 协作与对接说明
> 当前代码：apps/workbench/src/（42 文件，~3500 行）

---

## 自上次分析以来的变更摘要

| 变更 | 说明 |
|------|------|
| WorkbenchPage → ConversationPage | 主页面从 `pages/WorkbenchPage.tsx` 迁移到 `features/conversations/pages/ConversationPage.tsx`，符合 AGENTS.md 路由规范 |
| Hooks 提取 | 新增 `useWorkbenchWs.ts` 和 `useMessageActions.ts`，从 God Component 中拆出 WS 和消息操作逻辑 |
| Tag 系统 | 新增完整标签功能：TagFilterBar、TagPopover、ChatTypeTabs、PlatformTabs 组件 + tagStore + API 方法 |
| Barrel exports | 所有 feature 目录（conversations/messages/analysis/translate/accounts）均已添加 `index.ts` |
| ConversationDTO 扩展 | 新增 `chatType`（single/group）、`tags` 字段 |
| WorkbenchApi 扩展 | 新增 `listTags`、`createTag`、`deleteTag`、`addTagToConversation`、`removeTagFromConversation` |
| switchConversation 修复 | 现在切换会话时自动清零 unreadCount ✅ |
| 品牌图标 | PlatformTabs 使用 `@icons-pack/react-simple-icons`（SiTelegram、SiWhatsapp），符合 AGENTS.md |
| 文档交付 | `workbench_onsite_questions.md` 和 `workbench_mock_to_real.md` 已创建 |
| ServerPushEvent 扩展 | 新增 `conversation.tag_changed` 事件类型 |
| 搜索移除 | 会话列表搜索框已移除，改为 PlatformTabs + ChatTypeTabs + TagFilterBar 组合过滤 |

---

## 已覆盖的功能

| 需求 | 来源 | 状态 |
|------|------|------|
| 三栏布局（左 300px / 中 flex / 右 320px） | Demo A.6 | ✅ |
| 登录页 + mock 登录（sales/sales） | Demo A.7 | ✅ |
| 路由守卫（未登录重定向） | Demo A.8 | ✅ |
| 会话列表（平台图标、客户名、最后消息、时间、未读角标 99+） | Demo B.2 | ✅ |
| 会话列表排序（最近活跃优先） | Demo B.3 | ✅ |
| 平台过滤（Telegram / WhatsApp / 全部） | Demo B.10 | ✅（PlatformTabs 替代下拉） |
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
| WS 断线状态横幅 | Demo D.9 | ✅ |
| API adapter 接口定义 | Demo A.4 | ✅（扩展到 12 方法） |
| WS adapter 接口定义 | Demo A.5 | ✅ |
| DTO 类型文件 | Demo A.3 | ✅（扩展了 TagDTO、chatType、tags） |
| i18n 中英双语 | AGENTS.md | ✅ |
| Design System CSS tokens | AGENTS.md | ✅ |
| Loading skeleton | Demo D.6 | ✅ |
| Empty state（无会话、无消息） | Demo D.7 | ✅ |
| 会话切换清零未读 | PRD §5.4 | ✅（已修复） |
| Feature barrel exports | AGENTS.md | ✅（所有 feature 目录已有 index.ts） |
| Feature hooks 目录 | AGENTS.md | ✅（conversations/hooks/ 已有 2 个 hook） |
| 对接问题清单文档 | Demo D.11 | ✅ |
| mock → real 切换配置说明 | Demo D.12 | ✅ |
| 品牌图标使用 @icons-pack/react-simple-icons | AGENTS.md | ✅ |
| 页面放在 feature/pages/ 下 | AGENTS.md 路由规范 | ✅ |

---

## 新增功能（超出原 Demo Plan 范围）

| 功能 | 说明 |
|------|------|
| 标签系统 | 完整的 Tag CRUD + 会话打标 + 按标签过滤 + TagPopover 管理面板 |
| 聊天类型过滤 | ChatTypeTabs（全部/单聊/群聊） |
| 活跃过滤 | TagFilterBar 中的"活跃"快捷按钮（24h 内有消息） |
| ConversationDTO.chatType | 支持 single/group 区分 |
| conversation.tag_changed 事件 | ServerPushEvent 新增标签变更事件 |

---

## 部分覆盖 / 有缺陷

| 需求 | 来源 | 当前状态 | 差距描述 |
|------|------|---------|---------|
| Mock 发送状态流转 | Demo C.2 | REST 返回 sent/failed | WS 没有推送 `message.sent` / `message.failed` 事件，只靠 REST 响应更新状态 |
| 虚拟滚动锚定 | PRD §4.2.3 | 使用数组 index | 应用 `conversation_seq` 做锚点，当前 DTO 无此字段，用 `createdAtMs` 代替 |
| 时间分组格式 | PRD §4.2.4 | Today/Yesterday/MM-DD | 缺少跨年判断（应显示 YYYY-MM-DD HH:mm） |
| Mock 数据丰富度 | Demo B.1 | 11 会话，仅 2 个有消息 | 要求"每会话 50+ 消息"，当前每会话仅 3-5 条 |
| Mock WS 事件种类 | Demo C.6 | 只模拟 `message.received` | 应模拟 6 种事件，当前只有 1 种 |
| 会话列表虚拟滚动 | PRD §4.1.5 | 普通 map 渲染 | 数千级会话时需要 @tanstack/virtual |
| 会话搜索 | Demo B.10 | 已移除搜索框 | 原 Demo Plan 要求"按客户名称本地过滤"，当前只有平台/类型/标签过滤，无文本搜索 |
| LoginPage 未走 API adapter | AGENTS.md | 直接硬编码 mock 逻辑 | LoginPage 内联了 mock 登录判断，未调用 `mockClient.login()` |

---

## 完全未覆盖

### P0（Demo 交付必须）

| # | 缺失功能 | 来源 | 说明 |
|---|---------|------|------|
| 1 | Mock WS 补全事件 | Demo C.6 | 增加 `message.sent`、`message.failed`、`account.status_changed`、`analysis.updated` 事件模拟 |
| 2 | WS 事件驱动 UI 更新 | Demo C.7/C.8/D.2/D.5 | useWorkbenchWs 只处理 `message.received`，需增加对其他事件的处理 |
| 3 | API adapter 切换机制 | 协作说明 §3.2 | 无 `shared/api/index.ts` 工厂函数，组件直接 import `mockClient` |
| 4 | 组件解耦 mockClient | AGENTS.md API 层规则 | ConversationPage、useMessageActions、TranslatePreview、conversationStore、tagStore 均直接 import mockClient |
| 5 | Error state 全局展示 | Demo D.8 | API 调用失败时无用户可见错误提示（只有 login 有错误展示） |
| 6 | 会话搜索恢复 | Demo B.10 / PRD §4.1.4 | 按客户名称文本搜索功能缺失（被标签过滤替代但不等价） |

### P1（Demo 体验提升）

| # | 缺失功能 | 来源 | 说明 |
|---|---------|------|------|
| 1 | Mock 数据扩充 | Demo B.1 | 更多会话有消息数据（当前只有 2 个有完整消息线程），每会话消息量不足 |
| 2 | 图片消息展示 | PRD §4.2.6 | V1 支持图片，至少 mock 一张图片的渲染 |
| 3 | 会话列表虚拟滚动 | PRD §4.1.5 | 会话列表也用 @tanstack/virtual |
| 4 | 时间分组跨年格式 | PRD §4.2.4 | 跨年消息显示 YYYY-MM-DD HH:mm |
| 5 | 交互 polish | Demo D.10 | 动画过渡细化 |
| 6 | read.ack 发送 | PRD §5.4 | 切换会话时通过 WS 发送 read.ack 命令 |
| 7 | visibility.changed 处理 | PRD §9.3 | 收到事件后刷新受影响的会话/消息数据 |
| 8 | 网络层 offline 检测 | Demo D.9 | 浏览器 navigator.onLine 监听 + 离线横幅 |
| 9 | 心跳机制 | PRD §7.4 | 30s ping（mock 阶段可简化为日志输出） |
| 10 | 重连后增量同步 | PRD §7.4 | 重连成功后发 sync.request |
| 11 | LoginPage 走 API adapter | AGENTS.md | LoginPage 应调用 client.login() 而非内联 mock 逻辑 |

### P2（架构规范对齐）

| # | 缺失项 | 来源 | 说明 |
|---|--------|------|------|
| 1 | 独立 store 提取 | AGENTS.md | 提取 `accountStore`、`analysisStore`、`wsStore`（当前 account/analysis 仍在 ConversationPage useState 中） |
| 2 | shared/ui 组件 | AGENTS.md | 无 shadcn/ui 组件，所有 UI 手写 Tailwind |
| 3 | shared/utils 工具函数 | AGENTS.md | 日期格式化、ID 生成等通用工具缺失 |
| 4 | Feature types.ts | AGENTS.md | 各 feature 目录无模块内类型定义文件 |
| 5 | ConversationPage 仍偏重 | AGENTS.md | 177 行，仍包含 analysis/accounts/suggestedReplies 的 useState 和数据获取逻辑 |
| 6 | Store 直接 import mockClient | AGENTS.md | conversationStore 和 tagStore 直接依赖 mockClient，应通过 adapter 层 |

---

## 架构问题

| 问题 | 严重度 | 影响 | 建议修复 |
|------|--------|------|---------|
| 6 处直接 import mockClient | 高 | 切换 real 时需改 6 个文件 | 创建 `shared/api/index.ts` 导出统一 client 实例 |
| account/analysis 状态用 useState | 中 | 无法跨组件共享，不符合 store 规范 | 提取为独立 Zustand store |
| LoginPage 内联 mock 逻辑 | 中 | 不走 adapter 层，切换 real 时需改 LoginPage | 改为调用 client.login() |
| 无全局错误处理 | 中 | API 失败时用户无感知 | 添加 toast/banner 错误展示 |
| 路由占位 | 低 | /dashboard、/leads 等路由全指向 ConversationPage | 可接受（V1 只有一个主页面），但应添加注释说明 |

---

## 已关闭的 Gap（相比 v1 分析）

| 原 Gap | 关闭原因 |
|--------|---------|
| P0-3 会话切换清零未读 | ✅ switchConversation 已实现清零 |
| P0-6 对接问题清单文档 | ✅ workbench_onsite_questions.md 已创建 |
| P0-7 mock → real 切换说明 | ✅ workbench_mock_to_real.md 已创建 |
| P2-3 Feature barrel exports | ✅ 所有 feature 目录已有 index.ts |
| P2-4 Feature hooks 目录 | ✅ conversations/hooks/ 已有 useWorkbenchWs + useMessageActions |
| P2-2 WorkbenchPage 拆分 | ✅ 部分完成（从 294 行降到 177 行，hooks 已提取） |

---

## 实施建议顺序

```
第一批（功能闭环 — 阻塞 Demo 演示质量）：
  P0-3 → API adapter 切换机制（shared/api/index.ts 工厂）
  P0-4 → 组件解耦 mockClient（6 处 import 改为统一入口）
  P0-6 → 恢复会话搜索（文本搜索 + 现有标签/平台过滤并存）
  P0-1 → Mock WS 补全事件
  P0-2 → WS 事件驱动 UI 更新（useWorkbenchWs 扩展）
  P0-5 → Error state 全局展示

第二批（体验提升）：
  P1-1 → Mock 数据扩充
  P1-4 → 时间分组跨年
  P1-11 → LoginPage 走 API adapter
  P1-2 → 图片消息
  P1-5 → 交互 polish

第三批（架构对齐）：
  P2-1 → 独立 store 提取（accountStore、analysisStore、wsStore）
  P2-5 → ConversationPage 继续瘦身
  P2-6 → Store 解耦 mockClient
  P2-2~4 → shared/ui、shared/utils、feature types.ts
```

---

## 量化进度

| 维度 | v1 分析 | v2 分析 | 变化 |
|------|---------|---------|------|
| 文件数 | 30 | 42 | +12 |
| 代码行数（估） | ~2500 | ~3500 | +1000 |
| Stores | 3 | 4 | +1（tagStore） |
| Custom hooks | 0 | 2 | +2 |
| Barrel exports | 0 | 5 | +5 |
| P0 Gap 数 | 8 | 6 | -2（已关闭 3，新增 1） |
| P1 Gap 数 | 10 | 11 | +1 |
| P2 Gap 数 | 7 | 6 | -1 |
| 文档交付 | 0/2 | 2/2 | ✅ 完成 |

**总体完成度估算：~70%**（核心功能已实现，主要缺 WS 事件完整性 + adapter 切换机制 + 全局错误处理）

---

**文档结束**
