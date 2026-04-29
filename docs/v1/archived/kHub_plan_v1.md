# kHub V1 实施计划

---

## 1. 文档信息

| 项目 | 内容 |
|------|------|
| 文档标题 | kHub V1 实施计划 |
| 版本 | v1.1 |
| 日期 | 2026-04-24 |
| 状态 | 修订（Matrix 底座方案） |
| 依据文档 | kHub_tdr_v1.md（产品规划与技术选型报告）、requirment.md（新成员 Onboarding） |

---

## 2. 项目定位

kHub 是面向业务系统和开发者的 IM 数据中台，解决"消息从哪来、怎么存、如何用"。

**核心用户：**
- **销售员**：在工作台中处理跨平台会话，看翻译后的消息和分析结果
- **管理员**：监控账号、审计会话、导出数据、分配任务

**V1 核心目标：** 跑通最小闭环 — 消息收发 → 存储 → 翻译 → 工作台展示。

---

## 3. 关键技术决策确认

### 3.1 IM 框架策略：基于 Matrix 作为 IM Core 底座

**决策：IM Core 基于 Matrix Homeserver 作为底座，利用其成熟的生态和完整的 SDK 支持。已有 Connector（TG/WA）通过 Adapter 实现注册、适配到 Matrix。**

**核心架构：**

```
┌──────────────────────────────────────────────────────────┐
│                  外部 IM 平台（TG / WA）                   │
└────────────────────────┬─────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼                             ▼
┌──────────────────┐          ┌──────────────────┐
│  TG Connector    │          │  WA Connector    │
│  (TDLib, 已有)   │          │  (Go:9800, 在建) │
└────────┬─────────┘          └────────┬─────────┘
         │                              │
         │  ┌──────────────────────────┘
         │  │  Connector Adapter 层
         │  │  - 将 UnifiedActionAPI v5 适配为 Matrix AS API
         │  │  - 注册到 Matrix Homeserver
         ▼  ▼
┌─────────────────────────────────────────────────────────┐
│              Matrix Homeserver (Synapse/Tuwunel)         │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Application Services (AS) 桥接层                   │  │
│  │  - TG Bridge Adapter (注册 @telegram_*:domain)     │  │
│  │  - WA Bridge Adapter (注册 @whatsapp_*:domain)     │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Matrix 事件流 (Event DAG)                          │  │
│  │  - m.room.message / m.room.member / m.typing ...   │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Matrix 存储层                                       │  │
│  │  - PostgreSQL (Synapse) / RocksDB (Tuwunel)        │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │ Matrix Client-Server API
                       ▼
┌─────────────────────────────────────────────────────────┐
│              kHub 业务层 (TS/Node.js)                     │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Matrix SDK Client                                  │  │
│  │  - 订阅 Matrix 事件流                                │  │
│  │  - 调用 Matrix API 发送消息                          │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Translation Module (LLM 翻译)                      │  │
│  │  Analysis Adapter (对接已有分析层)                   │  │
│  │  Agent Facade (暴露标准事件给业务系统)               │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  kHub 扩展存储 (PostgreSQL)                          │  │
│  │  - translation_records (翻译审计)                   │  │
│  │  - analysis_results (分析结果)                       │  │
│  │  - conversation_aliases (客户匿名)                   │  │
│  │  - glossaries (术语表)                               │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │ WebSocket + REST API
                       ▼
┌─────────────────────────────────────────────────────────┐
│              Web 客户端（销售工作台 / 管理端）              │
└─────────────────────────────────────────────────────────┘
```

**选择 Matrix 作为底座的理由：**

| 维度 | 基于 Matrix | 不使用 Matrix（直连方案） |
|------|-----------|----------------------|
| **事件模型** | 成熟的事件 DAG 模型，天然支持消息顺序、编辑、撤回、已读回执 | 需自建事件模型和状态机 |
| **SDK 生态** | 官方 matrix-js-sdk，类型完整，社区活跃 | 需自建 SDK 或直接操作数据库 |
| **桥接架构** | Application Services (AS) 标准化桥接模式，mautrix 生态可复用 | 需自建 Connector 抽象层 |
| **多平台扩展** | 新平台（LINE）可直接使用 mautrix-line 或自建 AS bridge | 需为每个新平台实现完整适配层 |
| **联邦能力** | 预留联邦能力（V2 可选启用） | 无联邦能力 |
| **消息持久化** | Matrix 自带事件存储（可通过 AS API 查询） | 需自建完整消息存储和查询 |
| **实时推送** | Matrix 原生支持 /sync 长轮询和 WebSocket | 需自建 WebSocket Gateway + Redis Pub/Sub |

**Matrix 方案的挑战与应对：**

| 挑战 | 应对策略 |
|------|---------|
| **许可证风险（Synapse AGPL-3.0）** | Plan A: 通过 API 交互（非衍生作品）；Plan B: 切换到 Tuwunel（Apache-2.0）；Plan C: 联系 Element 获取商业许可 |
| **联邦协议过重** | 部署时关闭 Federation，仅使用 AS 桥接和本地事件流 |
| **存储 schema 不可控** | Matrix 存储消息原始数据，kHub 扩展存储（PostgreSQL）存储翻译、分析、术语表等业务数据 |
| **Synapse Python 性能** | V1 消息量（~350 msg/min）在舒适区；如遇瓶颈可迁移到 Tuwunel（Rust，高性能） |
| **Connector 改造成本** | Adapter 层封装 UnifiedActionAPI v5 → Matrix AS API，预计 ~800-1000 行 TS |

**结论：V1 基于 Matrix Homeserver 作为 IM Core 底座。** 利用 Matrix 成熟的事件模型、SDK 生态和 AS 桥接架构，降低自建 IM 引擎的复杂度。已有 Connector 通过 Adapter 层适配为 Matrix AS bridge，无需重写协议层。

**Homeserver 实现选择：**
- **Plan A（推荐）**：Synapse（功能最全，生态最成熟，需评估 AGPL-3.0 合规性）
- **Plan B**：Tuwunel（Apache-2.0，Rust 高性能，内存占用低，需验证 AS 桥接完整性）

**借鉴保留：** 参考 OpenIM 的消息模型（`ClientMsgID` + `ServerMsgID` 双 ID 去重、`Seq` 单调递增序号）作为 kHub 扩展存储的数据模型补充。

### 3.2 翻译服务策略：全部基于 LLM，优先覆盖巴西葡萄牙语和越南语

**决策：翻译全部使用 LLM 实现。优先语言为巴西葡萄牙语（pt-BR）和越南语（vi）。首选 Google Gemini 和 Claude Haiku。**

**V1 翻译引擎选择：**

| 语言对 | 推荐引擎 | 备选引擎 | 理由 |
|--------|---------|---------|------|
| PT-BR ↔ ZH | Gemini 2.0 Flash | Claude Haiku 4.5 | Gemini Flash 成本极低（~$0.00001/条），葡语覆盖完整，质量稳定 |
| VI ↔ ZH | Gemini 2.0 Flash | Claude Haiku 4.5 | Gemini Flash 越南语翻译质量好，成本极低 |
| ZH ↔ EN（口语） | Gemini 2.0 Flash | Claude Haiku 4.5 | 中文口语翻译自然，成本极低 |
| ZH ↔ EN（正式/系统） | Gemini 2.0 Flash | Claude Haiku 4.5 | 确定性输出，速度快 |
| 系统消息 | Gemini 2.0 Flash | — | 成本最低，延迟小 |
| 语言检测 | Gemini 2.0 Flash（内置） | — | 无需单独调用检测 API |

**V1 翻译成本估算：**

按日均 100K 条翻译请求：

| 引擎 | 占比 | 日请求量 | 月成本估算 |
|------|------|---------|-----------|
| Gemini 2.0 Flash（所有路由） | 90% | 90K | ~$270 |
| Claude Haiku 4.5（fallback） | 10% | 10K | ~$140 |
| Redis 缓存（基础设施） | — | — | ~$100 |
| **合计** | **100%** | **100K** | **~$510** |

> 全 LLM 方案月成本约 $510，三层缓存可进一步降低 30-60%。

**LLM 翻译 Prompt 策略：**

- 所有语言对使用 Gemini 2.0 Flash，system prompt 注入术语表 + 语境指令
- 保持三轨文本设计（raw_text + display_text + translated_text）不变
- 翻译结果缓存策略：L1 进程内 LRU → L2 Redis → L3 翻译记忆（预计命中率 30-60%）

### 3.3 TypeScript 运行时选择：Node.js 为主，Bun 为备选

**决策：V1 使用 Node.js 20 LTS 作为主运行时，Bun 作为 Plan B 备选方案。**

| 维度 | Node.js 20 LTS（Plan A） | Bun 1.1+（Plan B） |
|------|------------------------|------------------|
| **性能** | 成熟稳定，性能可预测 | HTTP 吞吐量 2-3x Node.js，启动快 4x |
| **生态兼容性** | 100% npm 生态兼容 | 99% npm 包兼容，少数边缘包可能有问题 |
| **生产案例** | 大规模生产验证 | 新兴，生产案例较少 |
| **开发体验** | 需要额外工具（Jest、tsx 等） | 内置 test runner、SQLite、bundler |
| **团队熟悉度** | 团队已熟悉 | 需要学习 Bun 特性 |
| **风险** | 无风险 | 生态不够成熟，边缘问题排查困难 |

**选择 Node.js 的理由：**
- V1 消息量（~350 msg/min）在 Node.js 性能范围内，无需追求极致性能
- 团队已熟悉 Node.js，降低学习成本和排障难度

**Bun 作为 Plan B 的场景：**
- 如果 V1 上线后消息量增长超预期（>1000 msg/min），可评估切换到 Bun 提升性能
- 如果团队在 Phase 1 验证 Bun 环境下兼容性通过，且团队有 Bun 经验，可考虑直接使用 Bun

**代码兼容性策略：**
- 避免使用 Node.js 特有 API（如 `process.binding`、`node:` 前缀模块）
- 保持代码对 Bun 的兼容性，为未来切换留好余地

---

## 4. 技术栈确认

| 层级 | 技术选型 | 备注 |
|------|---------|------|
| **IM 底座** | Matrix Homeserver（Synapse/Tuwunel） | 成熟事件模型 + AS 桥接架构 + 完整 SDK 生态 |
| **Matrix SDK** | matrix-js-sdk / matrix-bot-sdk | kHub 业务层通过 SDK 订阅事件流、发送消息 |
| **Connector Adapter** | UnifiedActionAPI v5 → Matrix AS API | 将已有 Connector 适配为 Matrix Application Service，~800-1000 行 TS |
| **后端运行时** | Node.js 20 LTS（Plan A）/ Bun 1.1+（Plan B） | 需在 Checklist 确认 |
| **后端框架** | Fastify（Node.js）/ Elysia（Bun） | 根据运行时选择 |
| **ORM** | Drizzle ORM | 类型安全，支持 PostgreSQL（kHub 扩展存储） |
| **数据库** | PostgreSQL 14+（kHub 扩展存储）+ Matrix 自带存储 | Matrix 存储消息/事件，kHub PostgreSQL 存储翻译/分析/术语表等业务数据 |
| **缓存/队列** | Redis 6.2+（Pub/Sub + BullMQ） | 翻译缓存 + 任务队列 + Synapse Worker 通信 |
| **对象存储** | MinIO（S3 兼容） | V2 可切换 Cloudflare R2 |
| **实时推送** | Matrix /sync API + WebSocket 增强 | Matrix 原生支持长轮询同步，kHub 业务层可增加 WebSocket 推送翻译/分析结果 |
| **前端框架** | React 19 + TypeScript | 团队技术栈一致 |
| **状态管理** | Zustand | 轻量，TS 友好 |
| **UI 组件库** | shadcn/ui + Tailwind CSS | 组件源码可控 |
| **构建工具** | Vite | 毫秒级启动，极速 HMR |
| **虚拟滚动** | @tanstack/virtual | 万级消息列表流畅渲染 |
| **部署架构** | Matrix Homeserver + kHub 业务层（模块化单体） | Matrix 处理消息路由和存储，kHub 处理翻译/分析/业务逻辑 |
| **内部事件总线** | Matrix 事件流 + EventEmitter + BullMQ | Matrix 事件流为主 + 进程内同步 + 异步任务队列 |
| **监控** | Prometheus + Grafana + OpenTelemetry | 指标 + 追踪 + 结构化日志 |

---

## 5. V1 交付范围

### 5.1 包含

| 模块 | 交付内容 |
|------|---------|
| **IM 底座** | Matrix Homeserver 部署（Synapse/Tuwunel）+ Connector Adapter（UnifiedActionAPI v5 → Matrix AS API），将已有 Connector 注册为 Matrix Application Service |
| **IM Core（kHub 业务层）** | 通过 Matrix SDK 订阅事件流，实现翻译触发、分析触发、业务逻辑编排。kHub 扩展存储（PostgreSQL）存储翻译记录、分析结果、术语表、客户别名等业务数据 |
| **Translation** | 全 LLM 路由（Gemini 2.0 Flash 主力 + Claude Haiku fallback）、语言检测、三层缓存、翻译审计记录 |
| **Connector Adapter** | 将已有 TG/WA Connector 的 UnifiedActionAPI v5 事件适配为 Matrix AS 事件，注册到 Matrix Homeserver。负责协议转换、虚拟用户（ghost user）管理和媒体转存。设计说明见下方 |
| **Analysis Adapter** | 对接已有分析能力（语言识别、说话人识别、会话阶段、实体抽取、意图分类），接收分析结果并回写到 kHub 扩展存储 |
| **Client - 销售工作台** | 销售员日常工作界面，处理跨平台客户会话，查看翻译和 AI 分析结果。功能明细见下方 |
| **Client - 管理端** | 管理员监控和运营界面，管理受控账号、分配任务、审计数据。功能明细见下方 |
| **Alias/Privacy** | 客户匿名展示（销售端显示 `Lead-1024` + 标签 + 阶段，管理端可见真实身份） |
| **Storage** | Matrix 自带存储（消息/事件/房间/用户）+ kHub 扩展 PostgreSQL（翻译/分析/术语表/别名）+ Redis 缓存 + MinIO 媒体存储 |
| **搜索** | 基于 Matrix 事件查询 API + kHub 扩展存储的 pg_trgm + GIN 索引（翻译文本检索） |
| **回放** | 基础回放 API（基于 Matrix 事件历史 + kHub 分析标注组装）+ 简易播放器（按时间顺序展示，原文/译文切换） |
| **术语表** | 全局术语表（scope = global）、LLM prompt 注入 + 后处理字符串替换、CSV 导入 |
| **Agent Facade** | 标准事件发布（message.received、message.translated、message.analyzed、conversation.updated、account.status_changed）+ 命令接口（conversation.get_context、message.send、message.translate_inbound/outbound、analysis.get_latest） |

**销售工作台功能明细：**

- **会话列表**：展示所有跨平台会话（TG/WA 混合），支持按时间/未读/客户阶段筛选，显示最后一条消息预览和未读数
- **消息详情**：时间线展示完整消息历史，支持文本/图片/视频/文件等多媒体类型，消息气泡区分收发方向
- **原文/译文切换**：每条消息支持一键切换显示原文或译文，译文默认显示，原文悬浮或点击查看
- **翻译开关**：会话级别控制是否启用自动翻译，关闭后仅显示原文，节省翻译成本
- **媒体预览**：图片/视频点击放大预览，支持缩略图加载和原图按需加载，文件支持下载
- **AI 分析侧栏**：右侧固定栏展示当前会话的 AI 分析结果（客户意图、会话阶段、关键实体、情绪倾向），实时更新
- **建议回复区**：基于会话上下文和 AI 分析，生成 2-3 条建议回复文案，销售员可一键采用或编辑后发送
- **消息回放入口**：会话详情页提供"回放"按钮，跳转到回放播放器查看完整会话时间线和分析叠加

**管理端功能明细：**

- **账号管理**：受控账号列表（TG/WA），显示账号状态（在线/离线/异常）、最后活跃时间、消息量统计，支持添加/删除/暂停账号
- **会话监控**：实时监控所有会话的消息流量、翻译状态、分析任务队列，支持按账号/平台/时间段筛选，异常会话高亮提示
- **客户映射查看**：查看客户真实身份与匿名 ID（Lead-1024）的映射关系，支持搜索和导出，权限控制仅管理员可见
- **任务分配**：将特定客户会话分配给指定销售员，支持批量分配和负载均衡策略，分配记录可追溯
- **导出管理**：按时间段/账号/客户导出会话数据（原文+译文+分析结果），支持 CSV/JSON 格式，导出任务异步处理并通知下载
- **回放与质检**：管理员可查看任意会话的完整回放，叠加 AI 分析结果和销售员操作记录，用于质检和培训

**Connector Adapter 设计说明：**

Connector 层（TG/WA 协议桥接）已由其他团队完成，通过 UnifiedActionAPI v5 暴露统一接口。kHub 的 Connector Adapter 层负责将这些已有 Connector 适配为 Matrix Application Service (AS)，注册到 Matrix Homeserver，实现消息双向桥接。

**Adapter 职责边界：**

```
Connector（已有，不碰）       Connector Adapter                 Matrix Homeserver
┌──────────────────┐      ┌───────────────────────────┐      ┌──────────────────┐
│ TG Connector     │      │  Matrix AS Bridge          │      │                  │
│ (TDLib)          │─────→│  入站：PlatformMessage      │─────→│  Matrix 事件流    │
│                  │      │  → m.room.message 事件      │      │  (Event DAG)     │
│ WA Connector     │      │                            │      │                  │
│ (Go:9800)        │←─────│  出站：Matrix 事件           │←─────│  /sync 或 AS     │
│                  │      │  → sendGroupMessage()       │      │  transaction     │
└──────────────────┘      └───────────────────────────┘      └──────────────────┘
  UnifiedActionAPI v5       AS 注册 + 虚拟用户管理              消息持久化 + 事件分发
                            + 格式转换，~800-1000 行 TS
```

**Matrix AS 注册机制：**

每个 Connector Adapter 作为独立的 Application Service 注册到 Matrix Homeserver，声明感兴趣的用户命名空间：

```yaml
# TG Bridge AS 注册文件示例
id: khub-telegram-bridge
url: "http://localhost:8091"  # Adapter 监听地址
as_token: "secret_as_token"
hs_token: "secret_hs_token"
sender_localpart: "telegram_bot"
namespaces:
  users:
    - exclusive: true
      regex: "@telegram_.*:yourdomain"   # TG 用户命名空间
  rooms:
    - exclusive: true
      regex: "#telegram_.*:yourdomain"   # TG 房间命名空间
```

**入站流程（Connector → Matrix）：**

1. Adapter 订阅 UnifiedActionAPI 的 `onMessage` 事件
2. 收到 `PlatformMessage` 后，创建或查找对应的 Matrix 虚拟用户（ghost user），如 `@telegram_12345:yourdomain`
3. 创建或查找对应的 Matrix 房间（映射平台会话/群组）
4. 以虚拟用户身份向 Matrix 房间发送 `m.room.message` 事件
5. Matrix Homeserver 持久化事件并分发给所有订阅方（包括 kHub 业务层）

**出站流程（Matrix → Connector）：**

1. kHub 业务层通过 Matrix SDK 向 Matrix 房间发送消息（翻译后的文本）
2. Matrix Homeserver 通过 AS transaction 将事件推送给 Adapter
3. Adapter 将 Matrix 事件转换为 UnifiedActionAPI 调用（`sendGroupMessage()` / `sendDirectMessage()`）
4. Connector 转发到外部平台

**虚拟用户（Ghost User）管理：**

| 平台 | 虚拟用户格式 | 显示名映射 | 头像同步 |
|------|------------|----------|---------|
| Telegram | `@telegram_{user_id}:domain` | TG display_name | TG avatar（异步下载并设置 Matrix avatar） |
| WhatsApp | `@whatsapp_{phone}:domain` | WA push_name | WA profile picture |

**入站字段映射（PlatformMessage → Matrix Event）：**

| UnifiedActionAPI 字段 | → | Matrix 事件字段 | 转换逻辑 |
|----------------------|---|----------------|---------|
| `msg.id` | → | `content.platform_msg_id`（自定义字段） | 存入事件 content 用于去重 |
| `msg.chatId` | → | Matrix room_id | 通过映射表查找或创建房间 |
| `msg.senderId` + `msg.senderName` | → | 虚拟用户 MXID | 查找或创建 ghost user |
| `msg.content` | → | `content.body` | 直接映射 |
| `msg.contentType` | → | `content.msgtype` | 'text' → 'm.text'，'photo' → 'm.image' 等 |
| `msg.platform` | → | `content.platform`（自定义字段） | 标记来源平台 |
| `msg.isGroup` | → | 房间类型 | 影响房间创建策略（DM vs Group） |
| `msg.timestamp` | → | `origin_server_ts` | 平台原始时间戳 |
| 整个 `msg` 对象 | → | `content.raw_payload`（自定义字段） | 保留原始数据用于 raw_events 存档 |
| `accountId`（回调参数） | → | `content.account_id`（自定义字段） | 标记接收此消息的受控账号 |

**出站字段映射（Matrix Event → UnifiedActionAPI）：**

| Matrix 事件字段 | → | UnifiedActionAPI 方法 | 说明 |
|----------------|---|----------------------|------|
| `m.room.message`（m.text） | → | `sendGroupMessage()` 或 `sendDirectMessage()` | 根据房间类型选择方法 |
| `m.room.message`（m.image） | → | `sendGroupPhoto()` | 媒体发送 |
| `m.room.redaction` | → | `deleteMessages()` | 消息撤回 |

**连接状态监听：**

Adapter 通过 `isConnected()` 和 `getConnectedAccounts()` 轮询 Connector 连接状态，映射为 Matrix presence 事件或 kHub 自定义事件（`account.status_changed`）。

**扩展性设计：**

- 新平台接入（如 LINE）只需新增一个 AS Bridge Adapter，注册新的用户命名空间（`@line_*:domain`），Matrix Homeserver 和 kHub 业务层无需修改
- 每个 Adapter 通过 `getCapabilities()` 获取平台能力声明，映射为 Matrix 房间 state event（`m.room.power_levels` 等），kHub 业务层据此做能力适配

**消息链路设计：**

kHub 的消息流分为入站链路（外部平台 → 工作台）和出站链路（工作台 → 外部平台）两条路径。基于 Matrix 架构，消息通过 Matrix 事件流统一路由。

**入站链路（Inbound）：**

```
外部 IM 平台（TG/WA）
  → Connector（TDLib / Go:9800，已有）
  → UnifiedActionAPI v5 onMessage 事件
  → Connector Adapter（Matrix AS Bridge）
  → 创建/查找 Matrix 虚拟用户（@telegram_12345:domain）
  → 创建/查找 Matrix 房间（映射平台会话/群组）
  → 发送 m.room.message 事件到 Matrix Homeserver
  → Matrix Homeserver 持久化事件（Event DAG）
  → kHub 业务层通过 Matrix SDK 订阅事件流（/sync 或 AS transaction）
  → 写入 raw_events（原始事件存档，存入 kHub 扩展 PostgreSQL）
  → 语言识别（Gemini 2.0 Flash）
  → 入站翻译（客户语言 → 中文）
  → 写入 translation_records（kHub 扩展 PostgreSQL）
  → 推送 Analysis Adapter（语言识别、说话人识别、会话阶段、实体抽取、意图分类）
  → 回写分析结果到 analysis_results（kHub 扩展 PostgreSQL）
  → Event Bus 发布 message.received / message.translated / message.analyzed 事件
  → 通知各消费方（工作台 UI 通过 Matrix /sync + WebSocket 增强推送、业务 Agent 通过 Agent Facade 订阅）
```

**出站链路（Outbound）：**

```
销售员在工作台输入中文消息
  → 工作台提交草稿（POST /api/messages/draft）
  → 可选：AI 优化建议（基于会话上下文和客户画像，生成更专业的表达）
  → 可选：术语表修正（检查术语表，替换为标准译法）
  → 出站翻译（中文 → 客户语言，Gemini 2.0 Flash）
  → 写入 translation_records（direction=outbound，kHub 扩展 PostgreSQL）
  → kHub 业务层通过 Matrix SDK 向 Matrix 房间发送 m.room.message 事件（译文）
  → Matrix Homeserver 持久化事件并通过 AS transaction 推送给 Connector Adapter
  → Connector Adapter 将 Matrix 事件转换为 UnifiedActionAPI 调用（sendGroupMessage()）
  → Connector 转发到外部平台
  → 外部平台返回发送结果（成功/失败 + platform_message_id）
  → Connector Adapter 更新 Matrix 事件状态（通过自定义 state event 或 kHub 扩展存储）
  → Event Bus 发布 message.sent 事件
  → 通知 Analysis Adapter（出站消息也需要纳入会话分析）
  → 工作台通过 Matrix /sync 或 WebSocket 收到发送状态更新（显示"已发送"或"发送失败"）
```

**关键设计点：**

- **三轨文本保留**：`raw_text`（原文）、`display_text`（实际发送的文本，可能经过 AI 优化）、`translated_text`（译文，入站时为中文，出站时为客户语言）
- **出站翻译缓存**：相同中文原文 + 目标语言的翻译结果缓存 24 小时，避免重复翻译
- **发送失败重试**：出站消息发送失败时，支持手动重试或自动重试（指数退避，最多 3 次）
- **草稿暂存**：销售员输入的消息可暂存为草稿（status=draft），支持稍后编辑和发送

**Event Bus — 内部事件分发机制：**

需求文档（§3 架构全景图）将 Event Bus 列为 Core Layer 的独立组件，负责模块间解耦通信。基于 Matrix 架构，事件分发以 Matrix 事件流为主干，kHub 业务层在此基础上叠加翻译/分析等业务事件：

```
┌─────────────────────────────────────────────────────────────┐
│                    kHub 业务层（Node.js 进程）                │
│                                                             │
│  ┌──────────────┐                                           │
│  │ Matrix SDK   │  L0: Matrix 事件流（主干）                  │
│  │ Client       │ ──────────────────────→ 消息/房间/成员事件  │
│  └──────────────┘                                           │
│       │                                                     │
│       │ L1: EventEmitter                                    │
│       │ （进程内同步派发业务事件）                              │
│       ▼                                                     │
│  ┌──────────┐    message.received     ┌──────────────────┐  │
│  │ Event    │ ──────────────────────→ │ Translation      │  │
│  │ Router   │    （进程内同步派发）     │ Module           │  │
│  └──────────┘                         └──────────────────┘  │
│       │                                       │             │
│       │ L2: BullMQ                            │             │
│       │ （异步任务队列）                        │             │
│       ▼                                       ▼             │
│  ┌──────────┐                         ┌──────────────────┐  │
│  │ Agent    │                         │ Analysis         │  │
│  │ Facade   │                         │ Adapter          │  │
│  └──────────┘                         └──────────────────┘  │
│       │                                       │             │
│       │                                       │             │
│       ▼                                       ▼             │
│  ┌──────────┐                         ┌──────────────────┐  │
│  │ WebSocket│                         │ Export /         │  │
│  │ 增强推送  │                         │ Replay Worker    │  │
│  └──────────┘                         └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**事件分发层级：**

| 层级 | 技术 | 用途 | 特点 |
|------|------|------|------|
| L0 Matrix 事件流 | Matrix /sync API + AS transaction | 消息/房间/成员等核心 IM 事件的主干分发。kHub 业务层通过 Matrix SDK 订阅，Connector Adapter 通过 AS transaction 接收 | Matrix Homeserver 负责持久化和分发，天然支持多客户端同步和历史回溯 |
| L1 进程内同步 | Node.js EventEmitter（typed-emitter） | kHub 业务层内部模块间通信：Event Router → Translation、Event Router → Analysis Adapter | 零延迟，类型安全，无序列化开销 |
| L2 异步任务队列 | BullMQ（基于 Redis） | 需要可靠投递和重试的异步任务：翻译任务、分析任务、导出任务、回放数据组装 | 持久化队列，支持重试/延迟/优先级/并发控制，任务失败不丢失 |

**事件目录（V1）：**

| 事件名 | 触发时机 | 消费方 | 分发层级 |
|--------|---------|--------|---------|
| Matrix `m.room.message` | 入站消息到达 Matrix Homeserver | kHub Event Router（触发翻译和分析） | L0（Matrix 事件流） |
| `message.received` | kHub 收到 Matrix 事件并解析后 | Translation Module、Analysis Adapter、Agent Facade | L1 → L2（翻译和分析走队列） |
| `message.translated` | 翻译完成并写入 kHub 扩展存储后 | WebSocket 增强推送（推送到工作台）、Agent Facade | L1 → WebSocket |
| `message.analyzed` | 分析结果回写后 | WebSocket 增强推送、Agent Facade | L1 → WebSocket |
| `message.sent` | 出站消息发送结果确认后 | WebSocket 增强推送（推送发送状态）、Analysis Adapter | L1 → WebSocket |
| `conversation.updated` | 会话状态变更（新参与者、标题变更等） | WebSocket 增强推送、Agent Facade | L0（Matrix 事件流）→ L1 |
| `account.status_changed` | 受控账号连接状态变化（上线/掉线/异常） | WebSocket 增强推送（管理端告警）、Agent Facade | L1 → WebSocket |

**设计原则：**

- **Matrix 事件流为主干**：消息收发、房间管理、成员变更等核心 IM 事件由 Matrix Homeserver 统一管理和分发，kHub 业务层作为 Matrix 客户端订阅事件流
- **kHub 业务事件为补充**：翻译完成、分析完成等业务事件由 kHub 业务层通过 EventEmitter + BullMQ 分发，不回写到 Matrix 事件流
- **WebSocket 增强推送**：Matrix /sync API 提供基础的消息同步能力，kHub 业务层额外提供 WebSocket 推送翻译结果、分析结果等业务数据，前端同时订阅两个数据源
- **Agent Facade 是事件的外部出口**：内部事件通过 Agent Facade 转换为标准化的外部事件接口，供群聊营销引擎等业务消费方订阅
- **不引入 Kafka/NATS**：V1 消息量（~350 msg/min）不需要重量级消息中间件，Matrix 事件流 + BullMQ 完全满足需求

### 5.2 明确不在 V1 范围内

- Elasticsearch 全文搜索
- Tauri 桌面客户端（V1 纯 Web App）
- LINE Connector
- 高级术语表管理（作用域、管理 UI）
- 完整回放播放器（速度控制、分析叠加、导出）
- 客户画像模块（AI 推断 + 自动更新 + 产品推荐，降至 V2）

### 5.3 V2 规划：客户画像模块（Customer Profile）

基于会话数据和 AI 分析能力，构建客户画像体系，从"消息中台"升级为"客户智能中台"。

**模块定位：** 将散落在多平台会话中的客户信息自动聚合为结构化画像，驱动销售策略和产品推荐。

**核心功能：**

- **AI 客户画像推断**：基于历史会话内容，通过 LLM 自动提取并推断客户属性（行业、规模、预算区间、决策角色、沟通偏好、痛点标签等），生成结构化画像卡片，支持置信度评分和人工修正
- **对话驱动的画像自动更新**：每轮新对话结束后，Analysis Adapter 触发增量画像更新流程，LLM 对比现有画像与新对话内容，自动补充/修正画像字段，变更记录可追溯（画像版本快照）
- **基于画像的产品/服务推荐**：根据客户画像标签（行业、需求、阶段）匹配自有产品/服务目录，在销售工作台的 AI 分析侧栏中展示推荐项（推荐理由 + 匹配度评分），销售员可一键生成包含推荐内容的回复话术

**依赖关系：** 客户画像模块依赖 V1 的 Analysis Adapter 事件流（message.analyzed、conversation.updated）和 Alias/Privacy 层的客户身份映射。V1 的数据积累是 V2 画像推断的基础。

---

## 6. 实施路线图

按照需求文档 §13 的工作节奏建议调整：

### Phase 1：研究与选型（第 1-2 周）

- 阅读本文档和参考文档（kHub_tdr_v1.md、requirment.md）
- 部署 Matrix Homeserver（Synapse 或 Tuwunel），验证 AS 桥接机制可行性
- 验证 Matrix SDK（matrix-js-sdk / matrix-bot-sdk）在 Node.js 环境下的事件订阅和消息发送
- 与 Connector 团队对接，确认 UnifiedActionAPI v5 接口细节和事件格式
- 确认运行时选择（Node.js vs Bun）
- 评估翻译引擎（Gemini / Claude）质量和成本
- **产出：技术选型评估报告 + Matrix AS 桥接 PoC**

### Phase 2：详细设计（第 2-3 周）

- Connector Adapter 设计（UnifiedActionAPI v5 → Matrix AS API 映射，虚拟用户管理，房间映射策略）
- kHub 扩展存储数据模型设计（translation_records、analysis_results、glossaries、conversation_aliases 等）
- kHub 业务层 API 设计（REST API + WebSocket 增强推送协议）
- 消息链路详细设计（入站链路 + 出站链路，基于 Matrix 事件流）
- 翻译层设计（LLM prompt 策略 + 缓存层 + 术语表注入）
- 客户端方案设计（销售工作台 + 管理端，基于 Matrix SDK + kHub API 双数据源）
- Analysis Adapter 设计（与已有分析层的接口）
- Agent Facade 设计（事件 + 命令接口）
- **产出：完整技术设计文档**
- **与团队讨论定稿**

### Phase 3：原型开发（第 3-5 周）

- 初始化 monorepo 项目仓库（前后端 + shared types）
- 搭建开发环境：Matrix Homeserver + kHub 业务层（Node.js + TypeScript + Fastify）
- 部署 PostgreSQL（kHub 扩展存储）+ Redis + MinIO（Docker Compose）
- 编写 kHub 扩展存储 migration 脚本
- 实现 Connector Adapter（Matrix AS Bridge，对接 UnifiedActionAPI v5）
- 实现 kHub 业务层 Matrix SDK 集成（事件订阅 + 消息发送）
- 跑通核心链路：TG/WA 消息 → Connector → Adapter → Matrix → kHub 业务层 → 翻译 → 工作台展示
- 验证架构可行性
- **产出：可运行的原型**

### Phase 4：完整开发（第 6-13 周）

按消息链路顺序推进：

1. **Connector Adapter（Matrix AS Bridge）**：UnifiedActionAPI v5 → Matrix AS 事件转换、虚拟用户管理、房间映射、连接状态同步
2. **kHub 业务层 — Event Router**：订阅 Matrix 事件流，解析并路由到翻译/分析模块
3. **Translation Module**：LLM 路由引擎（Gemini + Claude）、语言检测、缓存层、术语表注入
4. **Analysis Adapter**：对接已有分析层，接收分析结果并写入 kHub 扩展存储
5. **WebSocket 增强推送**：在 Matrix /sync 基础上，额外推送翻译结果、分析结果等业务数据
6. **Agent Facade**：事件发布 + 命令接口
7. **Web 前端 - 销售工作台**：会话列表、消息详情、翻译展示、媒体预览、AI 分析侧栏（基于 Matrix SDK + kHub API 双数据源）
8. **Web 前端 - 管理端**：账号管理、会话监控、客户映射查看、任务分配、导出管理
9. **Alias/Privacy Layer**：客户匿名展示逻辑
10. **集成测试**：端到端链路测试、性能压测、翻译质量验证
11. **部署与上线**：部署文档、运维手册、生产环境配置

每个环节完成后立即编写集成测试。

**总预计工期：13 周**

建议在 Phase 2 结束时进行里程碑评审，确认核心架构方向正确后再投入 Phase 3。

---

## 7. 部署与交付模式

### 7.1 部署原则

中心化部署。Connector、kHub 业务层统一部署在服务端，客户端只做 UI 展示。

### 7.2 三种交付形态

需求文档（§11.2）要求同一架构支持三种部署场景：

| 部署形态 | 适用场景 | 基础设施要求 | V1 支持状态 |
|---------|---------|-------------|-----------|
| **公有云 SaaS** | SaaS 运营，集中更新，多租户 | 云厂商 VPC + 托管 PostgreSQL/Redis + 对象存储 | ✅ V1 首选部署方式 |
| **客户私有云** | 企业私有化交付，数据不出客户云环境 | 客户云账号内的 VM/K8s + 托管数据库 | ✅ V1 支持（Docker Compose / Helm Chart） |
| **客户本地机房** | 数据主权要求高的客户，完全离线部署 | 物理服务器 + 本地 PostgreSQL/Redis/MinIO | 🟡 V1 架构兼容，但离线 LLM 翻译需额外方案 |

### 7.3 部署拓扑

```
┌─────────────────────────────────────────────────────────────────┐
│                        服务端部署                                │
│                                                                 │
│  ┌──────────────────┐   ┌──────────────────┐                     │
│  │ TG Connector     │   │ WA Connector     │  (已有，不碰)        │
│  │ (TDLib)          │   │ (Go:9800)        │                     │
│  └────────┬─────────┘   └────────┬─────────┘                     │
│           │  UnifiedActionAPI v5 │                                │
│           └──────────┬───────────┘                                │
│                      ▼                                            │
│  ┌─────────────────────────────────────────┐                     │
│  │    Connector Adapter（Matrix AS Bridge） │                     │
│  │    TG Bridge + WA Bridge                │                     │
│  └────────────────────┬────────────────────┘                     │
│                       │ Matrix AS API                             │
│                       ▼                                           │
│  ┌─────────────────────────────────────────┐                     │
│  │    Matrix Homeserver (Synapse/Tuwunel)  │                     │
│  │    事件持久化 + 房间管理 + 用户管理       │                     │
│  └────────────────────┬────────────────────┘                     │
│                       │ Matrix Client-Server API                  │
│                       ▼                                           │
│  ┌─────────────────────────────────────────┐                     │
│  │         kHub 业务层（Node.js）            │                     │
│  │  ┌───────────┐ ┌────────────┐ ┌───────┐ │                     │
│  │  │Matrix SDK │ │Translation │ │Agent  │ │                     │
│  │  │Client     │ │  Module    │ │Facade │ │                     │
│  │  │Event      │ │Analysis    │ │WS     │ │                     │
│  │  │Router     │ │Adapter     │ │增强推送│ │                     │
│  │  └───────────┘ └────────────┘ └───────┘ │                     │
│  └────────────────────┬────────────────────┘                     │
│                       │                                          │
│  ┌────────────────────┼──────────────────────────┐               │
│  │  Matrix 存储  │  kHub PostgreSQL  │  Redis  │  MinIO  │       │
│  │  (PG/RocksDB) │  (扩展业务数据)   │(缓存/队列)│(媒体)  │       │
│  └───────────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
         │ HTTPS / WSS
         ▼
┌─────────────────────┐
│  Web 客户端（浏览器）  │
│  销售工作台 / 管理端   │
└─────────────────────┘
```

### 7.4 多部署形态兼容性设计

为支持三种交付形态，架构层面需遵循以下约束：

- **配置外置**：所有环境相关配置（数据库连接、Redis 地址、LLM API Key、MinIO 端点、Matrix Homeserver 地址）通过环境变量或配置文件注入，不硬编码
- **容器化交付**：所有服务（kHub 业务层、Matrix Homeserver、Connector Adapter、Connector）提供 Docker 镜像，支持 Docker Compose（单机）和 Helm Chart（K8s）两种编排方式
- **存储可替换**：MinIO 作为 S3 兼容对象存储，公有云部署可直接替换为 AWS S3 / Cloudflare R2 / 阿里云 OSS，无需改代码
- **数据库可托管**：kHub 扩展 PostgreSQL 和 Redis 支持使用云厂商托管实例（RDS / ElastiCache），也支持自建实例。Matrix Homeserver 的存储（Synapse 用 PostgreSQL，Tuwunel 用 RocksDB）独立管理
- **LLM 翻译降级**：本地机房部署场景下如果无法访问外部 LLM API，需预留本地翻译引擎降级方案（如 NLLB-200 本地模型，V2 实现）
- **无外部网络依赖**：除 LLM API 和外部 IM 平台 API 外，kHub 所有组件间通信均在内网完成

**V1 交付物：**

| 交付物 | 说明 |
|-------|------|
| Docker Compose 编排文件 | 一键启动全部服务（Connector + Connector Adapter + Matrix Homeserver + kHub 业务层 + PostgreSQL + Redis + MinIO），用于开发环境和单机私有化部署 |
| 环境变量模板（`.env.example`） | 所有可配置项的说明和默认值 |
| 部署文档 | 公有云和私有化两种部署场景的操作手册 |
| 健康检查端点 | `/health`（存活）、`/ready`（就绪，含 DB/Redis/Connector 检查） |

**V2 预留：**

- Helm Chart（Kubernetes 编排）
- 多租户隔离（SaaS 场景下的租户数据隔离方案）
- 离线 LLM 翻译引擎（本地机房场景）

---

## 8. 关键数字

| 指标 | 数值 |
|------|------|
| V1 预估日消息量 | 500K 条/天 |
| 峰值消息速率 | ~350 条/分钟 |
| 年消息存储增量 | ~180GB |
| 年 raw_events 增量 | ~270GB |
| 翻译月成本（LLM 方案） | ~$510 |
| WebSocket 并发连接（V1） | 200-500 |
| 预计工期 | 13 周 |

---

## 9. 风险识别与缓解

| 风险项 | 影响 | 概率 | 缓解措施 |
|-------|------|------|---------|
| Synapse AGPL-3.0 许可证合规 | 高 | 高 | 方案 A：API 交互（非衍生作品）；方案 B：Element 商业许可；方案 C：切换到 Tuwunel（Apache-2.0） |
| Synapse Python 性能瓶颈 | 中 | 低 | V1 消息量在舒适区内；如遇瓶颈可迁移到 Tuwunel（Rust，内存仅 50-200MB） |
| Tuwunel 生态成熟度不足 | 中 | 中 | Phase 1 优先验证 AS 桥接 + mautrix 兼容性；如不满足则回退 Synapse |
| Matrix 联邦协议引入不必要复杂度 | 中 | 中 | 部署时关闭 Federation，仅使用 AS 桥接和本地事件流（Synapse 和 Tuwunel 均支持） |
| 翻译成本超预期 | 中 | 低 | LLM 成本极低（~$510/月），三层缓存进一步降低成本 |
| Gemini/Claude LLM 翻译质量不达标 | 中 | 中 | 建立 PT-BR 和 VI 术语表提升专业词汇准确率；准备 fallback 引擎 |
| Connector 接口变更 | 高 | 中 | Adapter 模式隔离变更，Core 层不感知 |
| TDLib 在 Node.js 环境下兼容性问题 | 高 | 中 | Phase 1 优先验证；备选方案为子进程隔离 |
| 消息量增长超预期 | 高 | 低 | Synapse Worker 架构 / Tuwunel Rust 性能均支持水平扩展；分区策略在架构层面预留 |
| 已有分析层接口不稳定 | 中 | 中 | Analysis Adapter 做好接口版本管理和降级策略 |

---

## 10. 待团队确认事项 Checklist

### 业务确认

- [ ] **术语表初始数据**：V1 全局术语表需要初始数据。哪个团队负责提供 PT-BR 和 VI 的核心业务术语？预计术语量级？
- [ ] **工作台用户角色**：V1 工作台需要区分销售 / 主管 / 管理员角色吗？还是 V1 先做单一角色？权限粒度如何？
- [ ] **会话分配机制**：V1 是否需要会话分配功能（将特定客户会话分配给特定销售）？还是所有人看到所有会话？
- [ ] **客户匿名展示规则**：销售端显示 `Lead-1024` 的编号生成规则是什么？是否需要支持自定义别名？
- [ ] **消息回放需求优先级**：V1 的简易回放功能是否为必须交付项？还是可以降为 nice-to-have？
- [ ] **数据迁移**：是否有历史消息数据需要导入 kHub？如果有，数据量和格式是什么？
- [ ] **Agent Facade 消费方**：除群聊营销引擎外，V1 还有哪些系统需要消费消息事件？需要哪些事件类型？
- [ ] **管理端功能优先级**：管理端的账号管理、会话监控、任务分配、导出管理、回放质检，哪些是 V1 必须，哪些可以降为 V2？
- [ ] **已有分析层接口**：已有分析层的接口文档是否完整？是否需要 Analysis Adapter 做接口适配？
- [ ] **群聊营销引擎迁移计划**：群聊营销引擎何时从直接对接 Connector 迁移到对接 Core 层的 Agent Facade？V1 需要支持吗？

### 技术确认

- [ ] **Matrix Homeserver 实现方案选择**：Synapse（Plan A，AGPL-3.0，功能最全，生态最成熟）vs Tuwunel（Plan B，Apache-2.0，Rust 高性能低资源）？团队倾向哪个？是否需要在 Phase 1 分别部署验证？
- [ ] **Matrix 许可证合规性**：如果选择 Synapse（AGPL-3.0），kHub 作为商业中台交付需评估合规性。方案 A：业务层通过 API 交互（非衍生作品）；方案 B：联系 Element 获取商业许可；方案 C：直接选择 Tuwunel（Apache-2.0）规避许可证问题
- [ ] **Tuwunel 可行性验证**：如果倾向 Tuwunel，需在 Phase 1 验证：AS 桥接完整性、Matrix SDK 兼容性、RocksDB 存储的查询能力、与 Synapse 的 API 兼容度
- [ ] **Matrix 联邦协议**：确认部署时关闭 Federation 功能，仅使用 AS 桥接和本地事件流。是否接受这种配置？
- [ ] **Matrix Bridge 桥接模式**：kHub V1 使用 Puppeting 模式（受控账号真实身份登录）。需确认：① 单 bridge 实例支持的并发 login 数量上限（预计 V1 需同时 puppet 10-50 个受控账号）；② 账号凭据（TG session / WA 扫码）的安全存储方案；③ 是否需要支持 Relay 模式（公共频道监控、bot 统一发送）；④ session 过期/掉线的自动重连机制和告警策略
- [ ] **Matrix SDK 选择**：matrix-js-sdk（官方，功能全）vs matrix-bot-sdk（轻量，适合 bot/AS 场景）？kHub 业务层作为 Matrix 客户端订阅事件流，哪个更合适？
- [ ] **Matrix 存储与 kHub 扩展存储的边界**：Matrix Homeserver 存储消息/事件/房间/用户，kHub 扩展 PostgreSQL 存储翻译/分析/术语表/别名。是否需要将 Matrix 事件数据同步到 kHub PostgreSQL 做冗余查询（如全文搜索、复杂聚合）？还是完全依赖 Matrix API 查询？
- [ ] **Connector Adapter 与已有 Connector 的集成方式**：Adapter 作为独立进程运行，通过 UnifiedActionAPI v5 订阅 Connector 事件。需确认：① Adapter 与 Connector 之间是进程内调用还是 HTTP/WebSocket 远程调用？② 多个 Connector 实例（多账号）如何与 Adapter 建立连接？
- [ ] **运行时选择**：Node.js 20 LTS（Plan A）vs Bun 1.1+（Plan B），团队倾向哪个？是否需要在 Phase 1 验证 Bun 环境下的 Matrix SDK 兼容性？
- [ ] **WhatsApp Go 服务现状**：Go 服务（:9800）当前的 API 接口文档是否完整？UnifiedActionAPI v5 接口是否已稳定？
- [ ] **PostgreSQL 版本**：生产环境 PostgreSQL 版本是否 ≥ 14？（Synapse 推荐 14+，kHub 扩展表需声明式分区 + pg_trgm）
- [ ] **Redis 版本**：生产环境 Redis 版本是否 ≥ 6.2？（Synapse Worker 通信 + BullMQ 特性需要；Tuwunel 不依赖 Redis）
- [ ] **MinIO 部署**：MinIO 是新部署还是复用现有实例？存储容量规划（年增 ~55TB 媒体）是否已确认？
- [ ] **Monorepo 结构**：前后端 + shared types 的 monorepo 结构，使用什么工具管理？（Turborepo / Nx / pnpm workspace）
- [ ] **CI/CD 管线**：是否有现成的 CI/CD 基础设施？部署目标环境是什么？（Docker Compose / Kubernetes / 其他）
- [ ] **现有 Connector 代码**：TG Connector（TDLib）和 WA Connector（Go）的现有代码仓库位置？Adapter 需要以什么方式接入（进程内 / HTTP / WebSocket）？
- [ ] **已有分析层技术栈**：已有分析层使用什么技术栈？如何暴露接口？（REST API / gRPC / 消息队列）
- [ ] **LINE Connector 扩展性**：基于 Matrix AS 架构，未来 LINE Connector 可直接注册为新的 AS Bridge。是否有 LINE 平台的技术调研资料？

---

**文档结束**
