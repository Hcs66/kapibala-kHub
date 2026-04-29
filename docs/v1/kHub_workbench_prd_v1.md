# kHub 销售工作台产品需求文档 V1

---

## 目录

- [1. 文档信息](#1-文档信息)
- [2. 产品概述](#2-产品概述)
- [3. 功能大纲](#3-功能大纲)
- [4. 核心模块详细说明](#4-核心模块详细说明)
- [5. 工作流说明](#5-工作流说明)
- [6. 数据源映射](#6-数据源映射)
- [7. 实时性要求](#7-实时性要求)
- [8. 状态管理](#8-状态管理)
- [9. 可见性控制对前端的影响](#9-可见性控制对前端的影响)
- [10. 非功能需求](#10-非功能需求)
- [11. V1 明确不做](#11-v1-明确不做)
- [12. 与 Tracy Admin SPA 的边界](#12-与-tracy-admin-spa-的边界)

---

## 1. 文档信息

| 项目 | 内容 |
|------|------|
| 文档标题 | kHub 销售工作台产品需求文档 V1 |
| 版本 | v1.0 |
| 日期 | 2026-04-29 |
| 状态 | 初稿 |
| 关联文档 | kHub_plan_v1-2.md（实施计划）、kHub_data_model_v1.md（数据模型）、kHub_plan_ts_v1.md（技术实现） |

---

## 2. 产品概述

### 2.1 产品定位

kHub 销售工作台是一个独立的 Web SPA，部署在 `workbench.huidu.ai`，为销售员提供跨平台即时消息的收发、翻译预览和 AI 分析查看能力。

它是 kHub 项目的核心前端产品。kHub 的整体定位是"IM 平台壳层 + 销售工作台"：把多平台 IM Connector 接入进来，经过 Tracy 已有的翻译和分析管道处理，最终通过这个实时 Web 工作台呈现给销售员。所有数据中台能力（存储、翻译、分析、客户管理）由 Tracy Core API 提供，工作台本身不存储任何业务数据。

### 2.2 目标用户

**唯一用户角色：销售员（sales）。**

Tracy 现有 4 档角色模型（boss、supervisor、lead、sales），kHub 销售工作台只允许 `role === 'sales'` 的用户登录。boss、supervisor、lead 三种角色继续使用 Tracy Admin SPA（`admin.huidu.ai`），不能进入销售工作台。

这个定位是明确的：工作台是销售员日常工作的主阵地，一个工作日内可能持续使用数小时。Admin SPA 则是管理者按需查看的监控和配置工具。

### 2.3 核心价值

用一句话概括：**让销售员在一个页面里完成多平台客户的实时沟通。**

具体来说：

- 跨平台消息统一收发。V1 接入 Telegram 和 WhatsApp，后续版本再扩展其他平台。
- 入站消息自动翻译成中文，出站消息提供翻译预览后再发送。销售员全程用中文工作。
- Tracy 的 AI 分析结果（意图识别、情感判断、销售阶段）实时展示在侧栏，帮助销售员快速理解客户状态。
- AI 建议回复可直接插入输入框，减少销售员的思考成本。

---

## 3. 功能大纲

| 模块 | 功能点 | 优先级 | 说明 |
|------|--------|--------|------|
| 会话列表 | 客户会话展示、未读角标、平台图标、排序、搜索过滤 | P0 | 工作台的入口，必须第一个做好 |
| 对话详情 | 消息气泡布局、原文/译文切换、时间分组、状态指示、媒体展示 | P0 | 核心交互区域 |
| 出站消息 | 输入框、翻译预览、确认发送、状态追踪 | P0 | 闭环必备 |
| AI 分析侧栏 | 意图/情感/阶段展示、会话摘要、实时 WS 更新 | P0 | 差异化能力 |
| 建议回复 | Tracy 建议展示、一键插入、编辑后发送 | P1 | 提效工具 |
| 消息回放 | 接入 Tracy /replay API、历史消息加载、滚动加载 | P1 | 历史追溯 |
| 实时推送 | WebSocket 连接、心跳保活、断线重连、增量同步 | P0 | 基础设施 |
| 可见性脱敏 | anonymized_alias 展示、未授权字段遮蔽 | P0 | 合规要求 |
| 账号状态指示 | Connector 连接状态、断连顶部横幅提示 | P1 | 运维感知 |
| 登录/鉴权 | JWT 登录、token 过期处理 | P0 | 入口 |

---

## 4. 核心模块详细说明

### 4.1 会话列表

会话列表占据工作台左侧栏，是销售员选择对话的入口。

#### 4.1.1 数据来源

列表数据来自 Tracy `GET /v22/leads/list` 接口，通过 kHub 后端代理（经 ViewProjector 脱敏后）返回给前端。

#### 4.1.2 列表项展示

每个会话项展示以下信息：

- **平台图标**：区分 Telegram 和 WhatsApp。图标放在会话项左侧。
- **客户名称**：经过 ViewProjector 处理后显示 `anonymized_alias` 或真实名称（取决于可见性授权状态）。
- **最后一条消息预览**：截取最近一条消息的前 N 个字符。
- **时间**：最后一条消息的相对时间（如"3 分钟前"、"昨天"）。
- **未读角标**：该会话的未读消息数，角标数字超过 99 时显示"99+"。未读数为 0 时不显示角标。

#### 4.1.3 排序

默认按最后消息时间倒序排列（最近活跃的会话排在最前面）。有未读消息的会话优先于同时间的已读会话。

#### 4.1.4 搜索与过滤

- **搜索**：支持按客户名称（anonymized_alias 或已授权的真实名称）本地过滤已加载的会话列表。V1 不做服务端全文搜索，搜索范围限于前端已拉取的数据。
- **平台过滤**：提供下拉选项，可按平台筛选会话（全部 / Telegram / WhatsApp）。

#### 4.1.5 虚拟滚动

会话列表使用 `@tanstack/virtual` 实现虚拟滚动。当会话数量较大时（预期 V1 可达数千级），只渲染可视区域内的列表项，保证滚动流畅。

#### 4.1.6 实时更新

当收到 WebSocket 的 `message.new` 事件时，对应会话自动置顶，未读角标 +1。当用户点击进入某个会话后，该会话的未读数清零。

---

### 4.2 对话详情

对话详情是工作台的核心区域，占据中间主面板。

#### 4.2.1 消息气泡布局

采用经典的聊天气泡布局：

- **入站消息**（客户发来的）：左对齐气泡。
- **出站消息**（销售员发出的）：右对齐气泡。
- 每条气泡内显示：发送者标识、消息内容、发送时间。
- 连续同一发送者的消息，后续气泡不重复显示发送者标识，通过时间分组区分。

#### 4.2.2 原文/译文切换

这是工作台的核心交互之一。

- **默认行为**：入站消息默认显示中文译文（Tracy 自动翻译的结果）。
- **切换机制**：提供全局切换开关（"查看原文"/"查看译文"），一键切换当前会话所有消息的显示语言。
- **单条切换**：点击单条消息可临时查看该条消息的原文（译文悬浮提示），不影响全局设置。
- **翻译状态**：如果某条消息尚未完成翻译，气泡内显示翻译中状态（loading 指示器），翻译完成后自动替换为译文。

#### 4.2.3 虚拟滚动与 conversation_seq 锚定

消息列表使用 `@tanstack/virtual` 实现虚拟滚动，锚定键为 `conversation_seq`。

- **conversation_seq** 是 Tracy ingest 路由分配的全局单调递增序列号，是消息排序的唯一权威依据。
- **向下滚动**：新消息到达后，如果用户已滚动到底部，自动跟随最新消息。如果用户在查看历史消息，则不自动滚动，但在底部显示"有新消息"提示条，点击可跳转到底部。
- **向上滚动加载历史**：当用户滚动到消息列表顶部时，自动调用 Tracy `GET /replay` 接口加载更早的历史消息。请求参数使用当前最早一条消息的 `conversation_seq` 作为 `before_seq`。

#### 4.2.4 时间分组

消息按时间分组显示分隔线：

- 当天：显示"HH:mm"。
- 昨天：显示"昨天 HH:mm"。
- 更早：显示"MM-DD HH:mm"。
- 跨年：显示"YYYY-MM-DD HH:mm"。

同一条分隔线下方的消息间隔超过 5 分钟时，再次插入时间分隔线。

#### 4.2.5 消息状态指示

出站消息在气泡右下角显示发送状态图标：

| 状态 | 图标 | 说明 |
|------|------|------|
| pending | ⏳（灰色旋转） | 消息已提交，等待发送 |
| sent | ✅（单勾，灰色） | 消息已发送到外部平台 |
| delivered | ✅✅（双勾，灰色） | 消息已送达对方设备 |
| read | ✅✅（双勾，蓝色） | 对方已读 |
| failed | ❌（红色） | 发送失败，可点击重试 |
| timeout | ⚠️（黄色） | 发送超时 |

V1 注意：delivered 和 read 状态依赖各平台的回执机制，Telegram 可能支持，WhatsApp V1 暂不保证。

#### 4.2.6 媒体展示

V1 仅支持图片消息（JPG/PNG/GIF）。

- **入站图片**：Connector 下载后上传至 MinIO，工作台显示缩略图，点击可查看原图。
- **出站图片**：前端上传图片后，先显示本地预览，确认发送后上传至 kHub 后端存 MinIO。
- 图片加载使用懒加载，只加载可视区域内的图片。
- 图片消息不支持 V1 翻译（只展示图片本身）。

---

### 4.3 AI 分析侧栏

AI 分析侧栏占据工作台右侧，为销售员提供当前会话的客户分析信息。

#### 4.3.1 数据来源

分析数据来自 Tracy 的两个接口：

- **GET /analysis_pack**：单条消息的详细分析结果（意图、情感等）。
- **GET /state_digest**：当前会话的汇总摘要（销售阶段、客户状态等）。

这些数据由 kHub 后端代理获取，经过 ViewProjector 脱敏后返回给前端。

#### 4.3.2 展示内容

侧栏从上到下分为三个区域：

**会话摘要（state_digest）：**
- 当前销售阶段（如"初次接触"、"需求探询"、"报价阶段"、"成交"等）。
- 客户整体情感倾向（正面/中性/负面）。
- 关键摘要文字（Tracy 生成的 1-2 句会话总结）。

**最新分析（analysis_pack）：**
- 最新一条已分析消息的意图识别结果。
- 情感判断（具体情感标签 + 置信度）。
- 提取的关键实体（产品名、数量、价格等）。

**建议回复区：**
来自 Tracy `GET /select_action` 的建议回复列表。详见 §4.4。

#### 4.3.3 实时更新机制

- 入站消息到达后，kHub 后端自动触发 Tracy 分析链路。
- 后端轮询 `GET /analysis_pack`（间隔 5 秒），当 status 变为 completed 时，通过 WS 推送 `message.analyzed` 事件给前端。
- 前端收到 `message.analyzed` 事件后，更新侧栏的展示内容。
- `state_digest` 在每次分析完成后自动刷新。

---

### 4.4 建议回复区

建议回复区嵌入在 AI 分析侧栏的底部。

#### 4.4.1 数据来源

建议回复来自 Tracy `GET /select_action` 接口。这是 Tracy 分析管道的输出之一，根据当前会话上下文生成回复建议。

#### 4.4.2 交互流程

1. Tracy 完成消息分析后生成建议回复。
2. 建议以列表形式展示，每条建议显示为可点击的卡片。
3. **一键插入**：点击某条建议，自动将建议内容填入中间面板的输入框中。
4. **编辑后发送**：填入输入框后，销售员可以修改内容，修改后的内容会重新触发翻译预览。
5. 如果有多个建议，按 Tracy 返回的优先级排序展示。

---

### 4.5 消息回放入口

消息回放功能让销售员查看某个会话的完整历史消息记录。

#### 4.5.1 数据来源

历史消息通过 Tracy `GET /replay` 接口获取：

```
GET /replay?conversation_id=xxx&before_seq=100&limit=50
```

#### 4.5.2 交互方式

- 消息回放不是独立页面，而是在对话详情中向上滚动触发的加载行为。
- 当用户滚动到当前已加载消息的顶部时，自动调用 `/replay` 接口，以最早可见消息的 `conversation_seq` 作为 `before_seq`，加载更早的消息。
- 加载过程中显示 loading 指示器。加载完成后，新历史消息插入到列表顶部，滚动位置保持不变（不会跳到顶部）。
- 当没有更多历史消息时，显示"没有更早的消息了"提示。

#### 4.5.3 与 Tracy 高级 Replay 的关系

V1 只做基础的"滚动加载历史消息"能力。Tracy 已有的 `/replay` API 提供了完整的历史消息查询，对 V1 来说足够。高级 Replay 播放器（速度控制、分析叠加、时间轴标记）放到 V2。

---

## 5. 工作流说明

### 5.1 入站消息工作流

从外部客户发消息到销售员在工作台看到，完整链路如下：

```
外部 IM 平台（TG/WA 客户发消息）
  → Connector（TDLib / Go:9800）
  → kHub ConnectorAdapter（转换为标准 InboundMessageEvent）
  → kHub 写 khub_raw_events（原始事件存档）
  → kHub POST Tracy /ingest/message_raw
    → Tracy 分配 conversation_seq 并返回
    → Tracy 自动触发翻译链路
    → Tracy 自动触发分析链路
  → kHub WS 推送 message.new（含 conversation_seq，经 ViewProjector 脱敏）
  → 前端收到 WS 事件：
    → 更新会话列表（会话置顶、未读 +1）
    → 如果当前正在查看该会话，将新消息追加到对话详情
    → 如果当前不在该会话，仅更新列表未读角标
  → Tracy 翻译完成后
  → kHub WS 推送 message.translated
  → 前端收到后更新对应消息气泡的译文
  → Tracy 分析完成后（轮询 /analysis_pack，间隔 5s）
  → kHub WS 推送 message.analyzed
  → 前端收到后更新 AI 分析侧栏
```

### 5.2 出站消息工作流

销售员发送消息的完整链路：

```
销售员在输入框输入中文消息
  → 前端展示翻译预览（调用 Tracy POST /translate）
    → 请求：{ text, src: 'zh-CN', tgt: customerLang }
    → 响应：返回翻译后的目标语言文本
  → 输入框区域同时显示原文和译文预览
  → 销售员点击"发送"确认
  → 前端通过 WS 发送 message.send 命令
  → kHub POST Tracy /ingest/message_raw（direction=out, status=pending）
  → Tracy 返回 conversation_seq
  → kHub WS 推送 message.sent_pending（经 ViewProjector）
  → 前端收到后，在对话详情显示 pending 状态的消息气泡
  → kHub ConnectorAdapter.sendMessage()（发送到外部平台）
  → 成功：更新 status=sent → WS 推 message.sent
    → 前端更新气泡状态为 sent
  → 失败：更新 status=failed → WS 推 message.failed
    → 前端更新气泡状态为 failed，显示重试按钮
```

### 5.3 翻译预览工作流

翻译预览是出站消息流程的核心环节，确保销售员发出的内容是经过翻译确认的：

```
销售员在输入框输入中文
  → 防抖 500ms 后，调用 Tracy POST /translate
  → 请求参数：{ text: 用户输入, src: 'zh-CN', tgt: 当前客户的语言 }
  → 客户语言从会话信息中获取（language 字段）
  → 返回译文后，在输入框下方显示预览区域：
    [原文] 用户输入的中文
    [译文] Tracy 翻译后的目标语言文本
  → 销售员可以继续修改原文，修改后自动重新翻译
  → 点击"发送"后，以原文 + 译文一起提交发送
  → 发送后预览区域清空，输入框清空
```

**关键约束**：翻译预览不会自动发送消息。只有销售员明确点击"发送"后才会真正发出。这是设计上的刻意选择，避免翻译错误导致误发。

### 5.4 会话切换工作流

销售员在左侧列表切换会话时的行为：

```
销售员点击左侧会话列表中的另一个会话
  → 前端 Zustand store 更新 currentConversationId
  → 中间面板切换到新会话的消息视图
  → 如果新会话有缓存的历史消息，直接从缓存渲染
  → 如果没有缓存，调用 Tracy GET /replay 加载最近 50 条消息
  → 同时更新 AI 分析侧栏（调用 GET /state_digest）
  → 将旧会话的未读数清零（如果是从未读状态点入的）
  → WebSocket 连接不变，不重连
  → 只改变前端订阅的消息范围（store 状态变化）
```

**关键点**：切换会话不需要重新建立 WebSocket 连接。WS 连接是全局唯一的，切换会话只是改变前端 store 中当前活跃会话的标识，所有 WS 事件在客户端根据 `conversation_id` 过滤后路由到正确的 UI 组件。

---

## 6. 数据源映射

工作台前端不直接连接任何数据库或外部服务，所有数据通过以下三个通道获取：

| 数据类别 | 数据内容 | 来源 | 调用方式 |
|---------|---------|------|---------|
| 客户列表 | 会话列表、客户基本信息 | Tracy `GET /v22/leads/list` | kHub REST 代理 |
| 历史消息 | 对话历史记录 | Tracy `GET /replay` | kHub REST 代理 |
| 翻译结果 | 入站译文、出站预览 | Tracy `POST /translate` | kHub REST 代理 |
| 分析结果 | 意图、情感、销售阶段 | Tracy `GET /analysis_pack` | kHub 后端轮询 → WS 推送 |
| 会话摘要 | 销售阶段、客户状态 | Tracy `GET /state_digest` | kHub REST 代理 |
| 建议回复 | AI 生成的回复建议 | Tracy `GET /select_action` | kHub REST 代理 |
| 客户画像 | 详细资料 | Tracy `GET /profile` | kHub REST 代理 |
| 实时事件 | 新消息、状态变更、可见性变更 | kHub WebSocket Gateway | WS 推送 |
| 数据脱敏 | 字段过滤、别名替换 | kHub ViewProjector | 中间件自动处理 |
| 客户打标 | 标记客户状态 | Tracy `POST /v22/leads/mark` | kHub REST 代理 |
| 改备注 | 修改客户备注名 | Tracy `POST /v22/leads/display_name` | kHub REST 代理 |

**前端直连的服务：**

| 服务 | 地址 | 用途 |
|------|------|------|
| kHub REST API | `api.huidu.ai` | 所有 HTTP 请求 |
| kHub WebSocket | `wss://ws.huidu.ai` | 实时推送 |

前端不直接调用 Tracy API，所有请求通过 kHub 后端代理。这样做的原因：kHub 后端需要在响应中注入 ViewProjector 脱敏处理，并且统一管理鉴权和 trace_id。

---

## 7. 实时性要求

### 7.1 WebSocket 事件清单

前端需要监听以下 WS 事件：

| 事件类型 | 方向 | 说明 | 前端处理 |
|---------|------|------|---------|
| `message.new` | 服务端 → 客户端 | 新入站消息 | 更新会话列表、追加消息气泡 |
| `message.translated` | 服务端 → 客户端 | 翻译完成 | 更新气泡译文内容 |
| `message.analyzed` | 服务端 → 客户端 | 分析完成 | 更新 AI 分析侧栏 |
| `message.sent_pending` | 服务端 → 客户端 | 出站发送中 | 显示 pending 状态气泡 |
| `message.sent` | 服务端 → 客户端 | 出站发送成功 | 更新气泡状态为 sent |
| `message.status` | 服务端 → 客户端 | 状态变更（delivered/read） | 更新气泡状态图标 |
| `message.failed` | 服务端 → 客户端 | 发送失败 | 更新气泡状态为 failed，显示重试 |
| `visibility.changed` | 服务端 → 客户端 | 可见性策略变更 | 刷新受影响字段（名称等） |
| `account.status_changed` | 服务端 → 客户端 | 账号连接状态变更 | 更新顶部账号状态指示器 |
| `sync` | 服务端 → 客户端 | 增量同步数据 | 合并增量消息到本地状态 |

### 7.2 客户端命令

前端向服务端发送以下 WS 命令：

| 命令类型 | 说明 | 参数 |
|---------|------|------|
| `message.send` | 发送消息 | conversation_id, text, media_url? |
| `read.ack` | 已读回执 | conversation_id, last_seq |
| `sync.request` | 请求增量同步 | { conversations: [{ id, last_sync_seq }] } |
| `ping` | 心跳 | 无 |

### 7.3 延迟目标

| 环节 | 目标延迟 | 说明 |
|------|---------|------|
| WS 消息推送（服务端到客户端） | < 500ms | 从 kHub 事件触发到前端收到 |
| 翻译结果返回 | < 5s（P95） | 取决于 Tracy 翻译引擎 |
| 分析结果返回 | < 10s（P99） | 取决于 Tracy 分析链路 |
| 可见性策略生效 | < 3s | 从策略变更到前端感知 |
| UI 响应（交互操作） | < 100ms | 本地交互，不涉及网络 |

### 7.4 连接保活机制

- **心跳**：客户端每 30 秒发送 `ping`，服务端回复 `pong`。
- **断连判定**：连续 3 次 ping 无响应（即 90 秒无任何响应），判定为断连。
- **重连策略**：指数退避重连，间隔从 1 秒开始，每次翻倍，上限 30 秒。重连成功后发送 `sync.request` 拉取断线期间的消息增量。
- **增量同步**：基于 per-conversation 的 `last_sync_seq`，只拉取断线期间新增的消息。如果落后超过 1000 条，服务端返回摘要 + 最近 100 条。

---

## 8. 状态管理

前端使用 Zustand 管理全局状态。以下列出主要 store 的大纲结构：

### 8.1 authStore

管理用户认证状态。

- `jwt: string | null` — 当前 JWT token
- `user: { id, role, display_name } | null` — 当前用户信息
- `isAuthenticated: boolean` — 认证状态
- `login(username, password)` — 登录，调用 Tracy `/auth/login`
- `logout()` — 清除 token，跳转登录页

### 8.2 conversationStore

管理会话列表和当前活跃会话。

- `conversations: Conversation[]` — 已加载的会话列表
- `currentConversationId: string | null` — 当前查看的会话 ID
- `unreadCounts: Map<string, number>` — 各会话未读数
- `loading: boolean` — 列表加载状态
- `fetchConversations()` — 拉取会话列表
- `switchConversation(id)` — 切换当前会话
- `handleMessageNew(event)` — 处理 message.new 事件
- `handleReadAck(conversationId)` — 处理已读回执

### 8.3 messageStore

管理当前会话的消息列表。

- `messages: Message[]` — 当前会话已加载的消息
- `loadingMore: boolean` — 加载更多历史消息的状态
- `hasMore: boolean` — 是否还有更早的历史消息
- `showTranslation: boolean` — 全局原文/译文切换
- `fetchMessages(beforeSeq?)` — 拉取消息（初始加载或加载更多）
- `handleMessageNew(event)` — 追加新消息
- `handleMessageTranslated(event)` — 更新译文
- `handleMessageStatus(event)` — 更新出站状态
- `toggleTranslation()` — 切换原文/译文

### 8.4 analysisStore

管理 AI 分析数据。

- `stateDigest: StateDigest | null` — 当前会话摘要
- `analysisResults: Map<string, AnalysisPack>` — 按消息 ID 索引的分析结果
- `suggestedReplies: SuggestedReply[]` — 建议回复列表
- `fetchStateDigest(conversationId)` — 拉取会话摘要
- `fetchSuggestedReplies(conversationId)` — 拉取建议回复
- `handleMessageAnalyzed(event)` — 处理分析完成事件

### 8.5 wsStore

管理 WebSocket 连接状态。

- `connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'reconnecting'` — 连接状态
- `lastPingTime: number` — 最近一次 ping 时间
- `reconnectAttempts: number` — 重连次数
- `connect()` — 建立连接
- `disconnect()` — 断开连接
- `send(event, data)` — 发送命令

### 8.6 visibilityStore

管理可见性相关状态。

- `policies: VisibilityPolicy[]` — 当前生效的可见性策略
- `handleVisibilityChanged(event)` — 处理可见性变更事件
- `getFieldVisibility(fieldName)` — 判断某字段是否可见

---

## 9. 可见性控制对前端的影响

### 9.1 机制概述

可见性控制（Visibility Control）是 kHub 的合规能力。所有从 kHub 后端返回给前端的数据（无论 REST 还是 WS）都经过 ViewProjector 中间件处理。前端不需要自己做脱敏逻辑，只需要根据返回的数据正确渲染。

### 9.2 字段可见性规则

**默认可见（所有 sales 都能看到）：**
- `conversation_id` — 会话标识
- `anonymized_alias` — 脱敏后的客户别名（如"客户 A-382"）
- `lead_status` — 客户状态
- 消息内容 — 消息文本
- 时间 — 消息时间戳
- `language` — 客户语言
- `platform_kind` — 平台类型（telegram/whatsapp）

**默认不可见（需要 supervisor/boss 授权才能看到）：**
- `real_name` — 客户真实姓名
- `phone` — 电话号码
- `email` — 邮箱
- `platform_username` — 平台用户名
- `avatar_url` — 头像
- `platform_user_id` — 平台用户 ID

### 9.3 前端处理规则

1. **显示名称**：会话列表和对话详情中，如果 `real_name` 字段缺失或为空（被 ViewProjector 过滤），则显示 `anonymized_alias`。
2. **头像**：如果 `avatar_url` 被过滤，显示平台对应的默认头像图标。
3. **脱敏指示**：当某个字段因可见性策略而不可用时，前端不需要额外提示。被过滤的字段直接不在响应数据中出现，前端按"没有这个数据"来渲染即可。
4. **实时变更**：当收到 `visibility.changed` WS 事件时，需要刷新受影响的会话和消息数据，以反映最新的可见性策略。例如 supervisor 授予了某销售员查看某客户真实姓名的权限，前端收到事件后应重新拉取该会话数据，使真实姓名显示出来。

---

## 10. 非功能需求

### 10.1 性能目标

| 指标 | 目标 | 说明 |
|------|------|------|
| 首屏加载时间 | < 2s（FCP） | 从打开页面到会话列表可交互 |
| 会话列表渲染 | 1000 条会话流畅滚动 | 虚拟滚动，帧率 > 30fps |
| 消息列表渲染 | 10000 条消息流畅滚动 | 虚拟滚动，帧率 > 30fps |
| WS 消息处理延迟 | < 100ms | 从收到 WS 事件到 UI 更新完成 |
| 输入响应延迟 | < 50ms | 输入框打字无感知卡顿 |
| 翻译预览延迟 | < 1s（UI 反馈） | 从输入完成到开始显示 loading |
| 内存占用 | < 500MB（长时间使用） | 数小时连续使用不显著增长 |

### 10.2 浏览器支持

| 浏览器 | 最低版本 | 说明 |
|--------|---------|------|
| Chrome | 90+ | 主要目标浏览器 |
| Edge | 90+ | Chromium 内核，与 Chrome 一致 |
| Firefox | 90+ | 兼容支持 |
| Safari | 15+ | 兼容支持 |

不支持 IE。不支持移动端浏览器。

### 10.3 无障碍基础要求

V1 阶段只覆盖基础无障碍要求：

- 所有可交互元素支持键盘操作（Tab 导航、Enter/Space 触发）。
- 图片消息提供 `alt` 文本。
- 颜色对比度满足 WCAG AA 标准。
- 使用语义化 HTML 标签。

完整的无障碍支持（ARIA 属性、屏幕阅读器完整适配）放到后续版本。

### 10.4 技术栈

| 层级 | 选型 |
|------|------|
| 框架 | React 19 + TypeScript |
| 状态管理 | Zustand |
| UI 组件库 | shadcn/ui |
| 样式方案 | Tailwind CSS |
| 构建工具 | Vite |
| 虚拟滚动 | @tanstack/virtual |

---

## 11. V1 明确不做

以下功能明确不在 V1 范围内，列出以免范围蔓延：

| 序号 | 不做的内容 | 计划版本 | 理由 |
|------|----------|---------|------|
| 1 | 全局搜索（跨会话/跨平台） | V2 | V1 不引入 ES，只做前端本地过滤 |
| 2 | 视频/音频/文件消息 | V1.5 | V1 只支持文本 + 图片 |
| 3 | 消息撤回和编辑 | V1.5 | 非核心闭环 |
| 4 | 已读回执（双向） | V1.5 | 依赖平台能力 |
| 5 | LINE / Zalo Connector | V2 | V1 只做 TG + WA |
| 6 | Tauri 桌面客户端 | V2 | V1 只做 Web SPA |
| 7 | 移动端 / PWA | V2+ | 待业务验证 |
| 8 | 多语言界面（英文等） | V2+ | V1 只做简体中文 |
| 9 | 离线模式 | V2+ | 非核心 |
| 10 | 全局快捷键 | V2 | 非核心 |
| 11 | 高级 Replay 播放器 | V2 | 速度控制、分析叠加等 |
| 12 | 客户画像 LLM | V2+ | AI 推断 + 自动更新 |
| 13 | 训练数据导出 | V2 | 非核心 |
| 14 | Glossary 术语表管理 | V2+ | Tracy 侧负责 |
| 15 | 群聊消息 | 待定 | V1 专注一对一客服场景 |
| 16 | 消息转发 | V2+ | 非核心 |
| 17 | 富文本编辑器 | V2+ | V1 输入框只支持纯文本 |
| 18 | 表情/贴纸 | V2+ | 非核心 |

---

## 12. 与 Tracy Admin SPA 的边界

### 12.1 核心区别

kHub 销售工作台和 Tracy Admin SPA 是两个完全独立的产品，服务不同的角色，覆盖不同的场景。

| 维度 | Tracy Admin SPA | kHub 销售工作台 |
|------|----------------|----------------|
| 部署域名 | `admin.huidu.ai` | `workbench.huidu.ai` |
| 目标用户 | boss / supervisor / lead | sales（唯一允许登录的角色） |
| 代码规模 | 32K 行，17 个 Page | 新建 SPA，预估 ~8000 行 TSX |
| 主功能 | 看板、监控、配置、回放、团队管理 | 实时收发消息、翻译预览、AI 分析查看 |
| 实时性 | 拉数据 + SSE 告警流 | WebSocket 双向，毫秒级实时 |
| 视角 | 全局 / 团队聚合 | 单业务员 + 单会话 |
| 使用时长 | 数分钟（看完关掉） | 数小时（一天工作时间） |
| 交互深度 | 查看、配置、审批 | 高频交互（打字、点击、切换） |

### 12.2 Admin SPA 已有页面清单

以下是 Tracy Admin SPA 中已存在的 17+ 个页面，kHub 不需要重复实现：

| 页面 | 文件 | 功能 |
|------|------|------|
| 运营驾驶舱 | CockpitPage.tsx | 账号状态总览 |
| 团队热力图 | HeatmapPage.tsx | 团队活跃度可视化 |
| 实时监控 | RealtimePage.tsx | 实时会话监控 |
| 会话回放 | ReplayPage.tsx | 会话回放查看 |
| v22 入口 | V22EntryPage.tsx | v22 功能总入口 |
| 客户管理 | V223CustomersPage.tsx | 客户列表管理 |
| 销售客户列表 | SalesCustomersPage.tsx | 销售视角客户列表 |
| 团队成员 | V223TeamMembersPage.tsx | 团队管理 |
| 组织管理 | OrgManagementPage.tsx | 组织架构管理 |
| 个人画像 | ProfilesPage.tsx | 客户画像 |
| 权限管理 | CapabilitiesPage.tsx | RBAC 能力管理 |
| 告警中心 | AlertsPage.tsx | 告警查看 |
| 事件中心 | IncidentsPage.tsx | 事件查看 |
| 工时审计 | TimeAuditPage.tsx | 工时统计 |
| 数据分析 | AnalyticsPage.tsx | 数据报表 |
| Dashboard | DashboardPage.tsx | 综合看板 |
| 插件设置 | PluginSettingsPage.tsx | 插件配置管理 |
| 设置 | SettingsPage.tsx | 系统设置 |
| 上帝模式 | GodModePage.tsx | 调试工具 |
| 用户反馈 | FeedbackSurveyPage.tsx | 反馈调查 |

### 12.3 Admin SPA 新增页面（不属于工作台）

根据 kHub V1 的需求，Tracy Admin SPA 需要新增 2 个页面。这些页面在 Admin SPA 中实现，不在销售工作台中：

| 新增页面 | 功能 | 实施方 |
|---------|------|--------|
| 可见性管理 | Visibility 策略的 CRUD、审批、审计日志查看 | Tracy |
| 账号健康 | 多平台多账号的 IM 连接状态、健康检查、告警 | Tracy |

### 12.4 工作台独占功能

以下功能只在 kHub 销售工作台中实现，Admin SPA 不涉及：

- 实时消息收发（WebSocket 双向通信）
- 消息气泡布局和虚拟滚动
- 原文/译文切换
- 出站消息翻译预览
- AI 分析侧栏（意图/情感/阶段的实时展示）
- AI 建议回复的一键插入
- 消息输入和发送
- 出站消息状态追踪（pending → sent → delivered → read / failed）
- 断线重连和增量同步

### 12.5 总结

**一句话**：Admin 是"管理者的监控台"，工作台是"销售员的操作台"。两者职责完全不重叠，数据通过 Tracy API 共享，通过 ViewProjector 控制可见性，但 UI 上各自独立，不做功能交叉。

---

**文档结束**
