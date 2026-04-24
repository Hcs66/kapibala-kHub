# kHub V1 实施计划

---

## 1. 文档信息

| 项目 | 内容 |
|------|------|
| 文档标题 | kHub V1 实施计划 |
| 版本 | v1.0 |
| 日期 | 2026-04-23 |
| 状态 | 初稿 |
| 依据文档 | kHub_tdr_v1.md（产品规划与技术选型报告）、requirment.md（新成员 Onboarding） |

---

## 2. 项目定位

kHub 是面向业务系统和开发者的 IM 数据中台，解决"消息从哪来、怎么存、如何用"。不是聊天软件，不是客服产品，不是营销工具。

**核心用户：**
- **销售员**：在工作台中处理跨平台会话，看翻译后的消息和分析结果
- **管理员**：监控账号、审计会话、导出数据、分配任务

**V1 核心目标：** 跑通最小闭环 — 消息收发 → 存储 → 翻译 → 工作台展示。

---

## 3. 关键技术决策确认

### 3.1 IM 框架策略：基于 Matrix 协议构建

**决策：直接使用 Matrix 协议 homeserver 作为 IM 中台底座。**

Matrix 是目前开源生态中唯一具备生产级多平台桥接能力的框架。其 Application Services (AS) 架构、mautrix bridge 家族、事件模型和扩展机制，与 kHub 的需求高度吻合。直接使用 Matrix homeserver 可以省去自建消息路由、事件持久化、桥接调度等核心基础设施的工作量。

**使用 Matrix homeserver 获得的能力：**

| 能力 | Matrix 提供 | kHub 应用 |
|------|-----------|----------|
| AS 桥接架构 | 外部进程注册命名空间 → 接收批量事件 → 管理虚拟身份 | TG/WA Connector 通过 AS API 接入，统一事件流 |
| mautrix bridge 家族 | mautrix-telegram、mautrix-whatsapp 等成熟桥接实现 | 可直接复用或参考，大幅降低 Connector 开发量 |
| Transaction 调度器 | 批量事件 + 指数退避重试 + 幂等性保证 | 消息入站的可靠性由 homeserver 保证 |
| 事件模型 | 一切皆事件（消息、成员变更、状态变化），事件持久化 | raw_events 天然落库，无需自建事件存储 |
| Room/Space 模型 | 房间即会话，Space 做会话分组 | 直接映射为 conversation 模型 |

同时参考 OpenIM 的消息模型（`ClientMsgID` + `ServerMsgID` 双 ID 去重、`Seq` 单调递增序号）和 Tinode 的 Topic ACL 权限模型作为补充设计。

#### Matrix Bridge 桥接模式：Puppeting vs Relay

> 参考：[docs.mau.fi - Using bridges](https://docs.mau.fi/bridges/general/using-bridges.html)、[Relay mode](https://docs.mau.fi/bridges/general/relay-mode.html)

mautrix bridge 家族支持两种桥接模式，核心区别在于**远端网络上的身份来源**：

| 维度 | Puppeting（傀儡模式） | Relay（中继模式） |
|------|----------------------|-------------------|
| **认证方式** | 用户使用自己的真实远端账号登录 bridge | bridge 使用一个共享 bot 账号代发消息 |
| **远端身份** | 消息以用户本人身份发出，对方看到的就是你 | 消息以 bot 身份发出，通常在消息前附加发送者 displayname 前缀 |
| **适用场景** | 个人使用：将 Matrix 作为多平台统一客户端，自动桥接所有私聊和群聊 | 社区/公共房间：多个 Matrix 用户共享一个桥接通道，无需每人都登录远端账号 |
| **功能完整度** | 完整：支持 reaction、已读回执、typing 等元数据桥接 | 有限：reaction 不桥接（无法传递发送者信息和同 emoji 多人 reaction）；部分元数据丢失 |
| **账号要求** | 每个用户需提供自己的远端账号凭据 | 仅需一个 bot/relay 账号；建议使用专用 Matrix 账号运行 relay login |
| **配置方式** | 用户与 bridge bot 私聊，执行 login 流程 | 配置 `bridge.relay.enabled = true`，在目标房间执行 `!prefix set-relay` |
| **共享 relay** | 不适用 | relay 仅对未登录 bridge 的用户生效；已登录用户仍走 puppeting。若需所有人都走 relay，应使用专用 Matrix 账号登录 |
| **桥接已有房间** | 自动桥接登录账号的所有会话 | 可通过 `!prefix bridge <chat_id>` 手动桥接指定远端会话到已有 Matrix 房间（v26.04+） |

**对 kHub 的影响：**

kHub 的核心场景是**受控账号的消息收拢**（销售员的 TG/WA 账号消息统一进入中台），本质上是 **Puppeting 模式** — 每个受控账号以真实身份登录 bridge，所有会话自动桥接到 Matrix homeserver。

Relay 模式在 kHub V1 中暂无直接需求，但在以下场景可能有价值：
- 未来如果需要"公共频道监控"（不以个人身份加入，而是用 bot 账号旁听）
- 群聊营销引擎需要以统一 bot 身份向多个群发送消息

**需在 Checklist 中确认的桥接模式问题：**

| 确认项 | 说明 |
|-------|------|
| Puppeting 多账号并发 | kHub 需要同时 puppet 多个 TG/WA 受控账号，需验证 mautrix bridge 在单实例下支持的并发 login 数量上限及资源消耗 |
| 账号凭据管理 | Puppeting 需要用户提供远端账号凭据（TG session / WA 扫码），kHub 如何安全存储和管理这些凭据？bridge 自身的凭据存储机制是否满足安全要求？ |
| Relay 模式是否纳入 V1 | V1 是否需要支持 relay 模式（如公共频道监控、bot 统一发送）？还是纯 puppeting 即可？ |
| 掉线重连与 session 保活 | Puppeting 模式下远端账号 session 过期或被踢出后，bridge 的自动重连机制如何？是否需要 kHub 层面做额外的健康检查和告警？ |

#### Matrix Homeserver 实现方案选择

**需在 Checklist 中确认具体实现方案。**

| 方案 | 语言 | 许可证 | 状态 | AS 桥接 | 内存占用 | 存储引擎 |
|------|------|--------|------|---------|---------|---------|
| **Synapse**（Plan A） | Python + Rust | AGPL-3.0 / Element 商业许可 | ✅ 稳定（参考实现） | ✅ 完整（参考标准） | 高（2-4GB+） | PostgreSQL |
| **Tuwunel**（Plan B）⭐ | Rust | **Apache-2.0** | ✅ 稳定 | ✅ 完整 | 极低（50-200MB） | RocksDB（内嵌） |
| Synapse Pro | Python + Rust | 商业许可（付费） | ✅ 稳定 | ✅ 完整 | 中（Synapse 的 1/5） | PostgreSQL |
| Conduit | Rust | Apache-2.0 | 🟡 Beta | ✅ 支持 | 极低 | RocksDB |
| Dendrite | Go | AGPL-3.0 | ⚠️ 维护模式 | ⚠️ 实验性 | 低-中 | PostgreSQL |

**Plan A：Synapse（功能最全，生态最大）**

- ✅ Matrix 参考实现，功能最完整，AS 支持最成熟
- ✅ Matrix 2.0 / MAS 支持，社区最活跃（4.1k stars，v1.151.0）
- ✅ Worker 架构支持水平扩展（Sync Worker、Event Persister、AS Worker）
- ❌ AGPL-3.0 许可证：要求衍生作品开源，商业中台需评估合规性
- ❌ 联邦协议过重：kHub 只需单向数据收拢，不需要跨服务器联邦能力
- ❌ Python 运行时：高并发场景下性能不如 Rust/Go 实现，内存占用高（2-4GB+）

**Plan B：Tuwunel（许可证友好 + 高性能）⭐**

- ✅ **Apache-2.0 许可证**：对商业中台完全友好，无开源义务
- ✅ Rust 实现，内存仅 50-200MB（Synapse 的 1/10-1/20），单二进制部署
- ✅ 完整 AS 支持，兼容 mautrix-telegram、mautrix-whatsapp 等所有主流桥接
- ✅ 瑞士政府生产部署，有全职团队维护（v1.6.0，2026年4月）
- ✅ conduwuit 官方继承者，2k stars，活跃开发
- ❌ 暂不支持从 Synapse 迁移数据（[issue #2](https://github.com/matrix-construct/tuwunel/issues/2)）
- ❌ 使用 RocksDB 而非 PostgreSQL，kHub 扩展表需独立 PostgreSQL 实例
- ❌ 生态比 Synapse 小，MAS/OIDC 支持待确认

**不推荐的方案：**

- **Dendrite**：已进入维护模式（仅安全修复），AS 支持不可靠，Element 官方不推荐新项目使用
- **Conduit**：仍为 Beta，开发节奏慢，功能不如其 fork（Tuwunel/Continuwuity）

**已知风险（需在 Checklist 中确认）：**

| 风险项 | 说明 | 缓解思路 |
|-------|------|---------|
| Synapse AGPL-3.0 许可证 | 要求衍生作品开源，商业中台需评估合规性 | 方案 A：kHub 业务层与 Synapse 通过 API 交互（非衍生作品）；方案 B：联系 Element 获取商业许可；方案 C：选择 Tuwunel（Apache-2.0） |
| 联邦协议过重 | Matrix 设计为去中心化联邦协议，kHub 只需要单向数据收拢 | 部署时关闭 Federation，仅使用 AS 桥接和本地事件流（Synapse 和 Tuwunel 均支持） |
| Synapse Python 性能 | 高并发场景下性能不如 Rust 实现 | V1 消息量（~350 msg/min）在舒适区内；如遇瓶颈可迁移到 Tuwunel |
| Tuwunel 生态成熟度 | 生态比 Synapse 小，部分高级特性待验证 | Phase 1 优先验证 AS 桥接 + mautrix 兼容性；如不满足则回退 Synapse |

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
| **FFI/Native Binding** | N-API 成熟，TDLib binding 已验证 | 内置 FFI，但 TDLib binding 需验证 |
| **生产案例** | 大规模生产验证 | 新兴，生产案例较少 |
| **开发体验** | 需要额外工具（Jest、tsx 等） | 内置 test runner、SQLite、bundler |
| **团队熟悉度** | 团队已熟悉 | 需要学习 Bun 特性 |
| **风险** | 无风险 | 生态不够成熟，边缘问题排查困难 |
| **Matrix/Synapse 兼容性** | Synapse 官方支持 Node.js 客户端库 | 需验证 Matrix SDK 兼容性 |

**选择 Node.js 的理由：**
- V1 消息量（~350 msg/min）在 Node.js 性能范围内，无需追求极致性能
- 团队已熟悉 Node.js，降低学习成本和排障难度
- TDLib binding 在 Node.js 环境下已验证通过
- Matrix SDK（matrix-js-sdk）官方支持 Node.js

**Bun 作为 Plan B 的场景：**
- 如果 V1 上线后消息量增长超预期（>1000 msg/min），可评估切换到 Bun 提升性能
- 如果团队在 Phase 1 验证 Bun 环境下 TDLib binding 和 Matrix SDK 兼容性通过，且团队有 Bun 经验，可考虑直接使用 Bun

**代码兼容性策略：**
- 避免使用 Node.js 特有 API（如 `process.binding`、`node:` 前缀模块）
- 保持代码对 Bun 的兼容性，为未来切换留好余地

---

## 4. 技术栈确认

| 层级 | 技术选型 | 备注 |
|------|---------|------|
| **IM 底座** | Matrix Homeserver（Synapse / Tuwunel） | AS 桥接 + 事件模型；需在 Checklist 确认实现方案 |
| **后端运行时** | Node.js 20 LTS（Plan A）/ Bun 1.1+（Plan B） | 需在 Checklist 确认 |
| **后端框架** | Fastify（Node.js）/ Elysia（Bun） | 根据运行时选择 |
| **ORM** | Drizzle ORM | 类型安全，支持 PostgreSQL |
| **数据库** | PostgreSQL 14+（分区表） | ACID + JSONB + 原生分区 |
| **缓存/队列** | Redis 6.2+（Pub/Sub + BullMQ） | 缓存 + 实时推送 + 任务队列 |
| **对象存储** | MinIO（S3 兼容） | V2 可切换 Cloudflare R2 |
| **实时推送** | WebSocket + Redis Pub/Sub | 双向通信 + 多实例 fan-out |
| **前端框架** | React 19 + TypeScript | 团队技术栈一致 |
| **状态管理** | Zustand | 轻量，TS 友好 |
| **UI 组件库** | shadcn/ui + Tailwind CSS | 组件源码可控 |
| **构建工具** | Vite | 毫秒级启动，极速 HMR |
| **虚拟滚动** | @tanstack/virtual | 万级消息列表流畅渲染 |
| **部署架构** | 模块化单体 | V1 团队规模不需要微服务 |
| **监控** | Prometheus + Grafana + OpenTelemetry | 指标 + 追踪 + 结构化日志 |

---

## 5. V1 交付范围

### 5.1 包含

| 模块 | 交付内容 |
|------|---------|
| **IM 底座** | Matrix Homeserver 部署与配置（Synapse 或 Tuwunel，关闭 Federation、AS 桥接、事件存储） |
| **IM Core** | Message Core（消息收发 + 持久化扩展 + 序号分配）、Conversation Core（基于 Matrix Room 模型的会话管理 + 参与者）、Account Core（受控账号管理） |
| **Translation** | 全 LLM 路由（Gemini 2.0 Flash 主力 + Claude Haiku fallback）、语言检测、三层缓存、翻译审计记录 |
| **Connector** | TG 桥接（基于 mautrix-telegram 或 TS Adapter Shim 封装 TDLib，接入 Matrix AS API）、WA 桥接（基于 mautrix-whatsapp 或 HTTP/WS Adapter 封装 Go 服务 :9800，接入 Matrix AS API） |
| **Analysis Adapter** | 对接已有分析能力（语言识别、说话人识别、会话阶段、实体抽取、意图分类），接收分析结果并回写到消息/会话视图 |
| **Client - 销售工作台** | 销售员日常工作界面，处理跨平台客户会话，查看翻译和 AI 分析结果。功能明细见下方。 |
| **Client - 管理端** | 管理员监控和运营界面，管理受控账号、分配任务、审计数据。功能明细见下方。 |
| **Alias/Privacy** | 客户匿名展示（销售端显示 `Lead-1024` + 标签 + 阶段，管理端可见真实身份） |
| **Storage** | PostgreSQL 10 张核心表 + 分区策略、Redis 缓存与 Pub/Sub、MinIO 媒体存储 + 缩略图生成 |
| **搜索** | PostgreSQL pg_trgm + GIN 索引（基础全文检索） |
| **回放** | 基础回放 API（数据组装）+ 简易播放器（按时间顺序展示，原文/译文切换） |
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

### 5.2 明确不在 V1 范围内

- Elasticsearch 全文搜索
- Tauri 桌面客户端（V1 纯 Web App）
- LINE Connector
- 泰语翻译路由（降至 V2）
- 高级术语表管理（作用域、管理 UI）
- 完整回放播放器（速度控制、分析叠加、导出）

---

## 6. 实施路线图

按照需求文档 §13 的工作节奏建议调整：

### Phase 1：研究与选型（第 1-2 周）

- 阅读本文档和参考文档（kHub_tdr_v1.md、requirment.md）
- Matrix Homeserver 方案验证：Synapse 和 Tuwunel 分别部署验证（关闭 Federation、AS 桥接配置）
- 评估许可证合规方案（Synapse AGPL-3.0 vs Tuwunel Apache-2.0）
- 评估 mautrix-telegram / mautrix-whatsapp 在两种 homeserver 上的桥接兼容性
- 确认运行时选择（Node.js vs Bun，TDLib binding 验证、Matrix SDK 兼容性验证）
- **产出：技术选型评估报告（含 homeserver 方案推荐）**

### Phase 2：详细设计（第 2-3 周）

- Matrix Homeserver 与 kHub 业务层的集成架构设计（AS API 对接、事件订阅、Room/Space 映射）
- Core Layer 数据模型详细设计（homeserver 原生存储 + kHub 扩展表：翻译、分析、别名等）
- API 设计（REST API + WebSocket 协议，基于 Matrix Client-Server API 扩展）
- 消息链路详细设计（入站链路 + 出站链路，经 Matrix AS 桥接）
- 翻译层设计（LLM prompt 策略 + 缓存层 + 术语表注入）
- 客户端方案设计（销售工作台 + 管理端）
- Connector 适配设计（现有 TG/WA Connector 如何接入 Matrix AS API）
- Analysis Adapter 设计（与已有分析层的接口）
- Agent Facade 设计（事件 + 命令接口）
- **产出：完整技术设计文档**
- **与团队讨论定稿**

### Phase 3：原型开发（第 3-5 周）

- 初始化 monorepo 项目仓库（前后端 + shared types）
- 部署 Matrix Homeserver 实例（根据 Phase 1 选型结果部署 Synapse 或 Tuwunel，关闭 Federation，配置 AS 桥接）
- 搭建 kHub 业务层开发环境（Node.js + TypeScript + Fastify）
- 部署 PostgreSQL + Redis + MinIO（Docker Compose）
- 编写 kHub 扩展表 migration 脚本（翻译记录、分析结果、别名等）
- 跑通核心链路：TG/WA 消息 → Matrix AS 桥接 → kHub 业务层 → 翻译 → 工作台展示
- 对接至少一个 Connector（TG 或 WA）通过 AS API
- 验证架构可行性
- **产出：可运行的原型**

### Phase 4：完整开发（第 6-13 周）

按消息链路顺序推进：

1. **Matrix Homeserver 集成层**：AS 桥接配置、事件订阅、Room/Space 映射（Synapse Worker 部署 或 Tuwunel 单二进制部署）
2. **Telegram 桥接**：基于 mautrix-telegram 或 TS Adapter Shim 封装 TDLib，接入 Matrix AS API
3. **WhatsApp 桥接**：基于 mautrix-whatsapp 或 HTTP/WS 客户端 Adapter 封装 Go 服务，接入 Matrix AS API
4. **Message Core**：消息收发、持久化扩展（翻译字段、分析字段）、序号分配、去重
5. **Conversation Core**：会话管理、参与者管理（基于 Matrix Room 模型扩展）
6. **Translation Module**：LLM 路由引擎（Gemini + Claude）、语言检测、缓存层、术语表注入
7. **Analysis Adapter**：对接已有分析层，接收分析结果并回写
8. **WebSocket Gateway**：实时推送（可复用 Matrix /sync 端点或自建 WS 层）、连接管理、心跳、断线重连
9. **Web 前端 - 销售工作台**：会话列表、消息详情、翻译展示、媒体预览、AI 分析侧栏
10. **Web 前端 - 管理端**：账号管理、会话监控、客户映射查看、任务分配、导出管理
11. **Alias/Privacy Layer**：客户匿名展示逻辑
12. **Agent Facade**：事件发布 + 命令接口
13. **集成测试**：端到端链路测试、性能压测、翻译质量验证
14. **部署与上线**：部署文档、运维手册、生产环境配置、数据迁移

每个环节完成后立即编写集成测试。

**总预计工期：13 周**

建议在 Phase 2 结束时进行里程碑评审，确认核心架构方向正确后再投入 Phase 3。

---

## 7. 关键数字

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

## 8. 风险识别与缓解

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

## 9. 待团队确认事项 Checklist

### 业务确认

- [ ] **越南语业务场景**：越南语客户的主要沟通场景是什么？（私聊为主 / 群聊为主 / 混合）这影响翻译路由的优化方向
- [ ] **翻译质量标准**：越南语和葡语翻译使用 Gemini 2.0 Flash，是否需要在上线前做一轮人工翻译质量评估？评估样本量和评估标准是什么？
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

- [ ] **Matrix Homeserver 实现方案选择**：Synapse（Plan A，AGPL-3.0，功能最全）vs Tuwunel（Plan B，Apache-2.0，高性能低资源）？团队倾向哪个？是否需要在 Phase 1 分别部署验证？
- [ ] **Matrix 许可证合规性**：如果选择 Synapse（AGPL-3.0），kHub 作为商业中台交付需评估合规性。方案 A：业务层通过 API 交互（非衍生作品）；方案 B：联系 Element 获取商业许可；方案 C：直接选择 Tuwunel（Apache-2.0）规避许可证问题
- [ ] **Tuwunel 可行性验证**：如果倾向 Tuwunel，需在 Phase 1 验证：AS 桥接完整性、mautrix-telegram/whatsapp 兼容性、Matrix SDK 兼容性、RocksDB 存储对 kHub 查询需求的支持
- [ ] **Matrix 联邦协议**：确认部署时关闭 Federation 功能，仅使用 AS 桥接和本地事件流。是否接受这种配置？
- [ ] **Matrix Bridge 桥接模式**：kHub V1 使用 Puppeting 模式（受控账号真实身份登录）。需确认：① 单 bridge 实例支持的并发 login 数量上限（预计 V1 需同时 puppet 10-50 个受控账号）；② 账号凭据（TG session / WA 扫码）的安全存储方案；③ 是否需要支持 Relay 模式（公共频道监控、bot 统一发送）；④ session 过期/掉线的自动重连机制和告警策略
- [ ] **运行时选择**：Node.js 20 LTS（Plan A）vs Bun 1.1+（Plan B），团队倾向哪个？是否需要在 Phase 1 验证 Bun 环境下的 TDLib binding 和 Matrix SDK 兼容性？
- [ ] **TDLib Binding 验证**：TDLib 在 Node.js 环境下的 FFI 调用是否已验证通过？如果选择 Bun，需要在 Phase 1 优先验证
- [ ] **Matrix SDK 选择**：使用 matrix-js-sdk（官方）还是 matrix-bot-sdk（社区）？是否需要评估两者在 Synapse 和 Tuwunel 上的兼容性差异？
- [ ] **WhatsApp Go 服务现状**：Go 服务（:9800）当前的 API 接口文档是否完整？是否需要 Go 侧做接口调整以适配 Matrix AS API？
- [ ] **UnifiedActionAPI v5 兼容性**：Core 层的 ConnectorAdapter 接口需要与现有 UnifiedActionAPI v5 兼容还是重新定义？如何处理 `isOurAgent`、`getCapabilities` 等业务特定方法？
- [ ] **PostgreSQL 版本**：生产环境 PostgreSQL 版本是否 ≥ 14？（Synapse 推荐 14+，kHub 扩展表需声明式分区 + pg_trgm）
- [ ] **Redis 版本**：生产环境 Redis 版本是否 ≥ 6.2？（Synapse Worker 通信 + Pub/Sub 特性需要；Tuwunel 不依赖 Redis）
- [ ] **MinIO 部署**：MinIO 是新部署还是复用现有实例？存储容量规划（年增 ~55TB 媒体）是否已确认？
- [ ] **Monorepo 结构**：前后端 + shared types 的 monorepo 结构，使用什么工具管理？（Turborepo / Nx / pnpm workspace）
- [ ] **CI/CD 管线**：是否有现成的 CI/CD 基础设施？部署目标环境是什么？（Docker Compose / Kubernetes / 其他）
- [ ] **现有 Connector 代码**：TG Connector（TDLib）和 WA Connector（Go）的现有代码仓库位置？是否需要迁移到 kHub monorepo？是否需要改造为 Matrix AS 桥接模式？
- [ ] **翻译 API Key 准备**：Google Gemini API、Anthropic Claude API 的账号和 API Key 是否已申请？额度是否满足 V1 预估用量（日均 100K 条）？
- [ ] **已有分析层技术栈**：已有分析层使用什么技术栈？如何暴露接口？（REST API / gRPC / 消息队列）
- [ ] **LINE Connector 扩展性**：架构设计需要为未来 LINE Connector 预留扩展性，是否有 LINE 平台的技术调研资料？

---

**文档结束**
