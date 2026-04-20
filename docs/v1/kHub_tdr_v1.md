# 统一 IM 会话中台 (kHub) — 产品规划与技术选型报告

---

## TLDR — 全部决策速览

> 本节聚合报告各章节的核心结论与推荐方案，供快速决策参考。详细论证见对应章节。

### 技术栈与架构

| 决策项 | 推荐方案 | 一句话理由 |
|-------|---------|-----------|
| 后端语言/运行时 (R1) | **TypeScript + Bun** | 团队生产力优先，V1 消息量（~350 msg/min）在 Bun 舒适区内，前后端共享类型 |
| 开源框架 (R2) | **不直接使用，借鉴设计模式** | Matrix AS 架构参考桥接设计，OpenIM MsgData 参考消息模型，mautrix bridgev2 参考 Connector 接口 |
| 消息存储 (R3) | **PostgreSQL 分区表** | ACID 保证消息顺序，JSONB 灵活存储平台差异，原生声明式分区按月切分 |
| 实时推送 (R4) | **WebSocket + Redis Pub/Sub** | 浏览器原生双向通信，Redis 已在技术栈中做缓存，天然支持多实例 fan-out |
| 部署架构 (R8) | **模块化单体** | V1 团队规模（3-5 人）和消息量不需要微服务复杂度，模块边界为未来拆分留好接口 |

### 翻译服务

| 语言对 | 推荐引擎 | 理由 |
|--------|---------|------|
| PT ↔ ZH | DeepL | BLEU 60.4，葡语翻译质量无可争议地领先 |
| ZH ↔ EN（口语） | GPT-4o-mini | 中文口语翻译更自然，成本极低（~$0.000022/条） |
| TH ↔ ZH | Google Translate | 泰语覆盖最完整，DeepL 泰语有明显短板 |
| 系统消息 | Azure Translator | 成本最低（$10/百万字符），延迟最小（~90ms） |
| 语言检测 | Azure Detect（免费） | 不计入字符配额，~30ms |

**月成本估算**（日均 100K 条翻译）：~$4,220/月（含缓存优化后）

### 客户端与前端

| 决策项 | 推荐方案 |
|-------|---------|
| 客户端策略 (R6) | **V1: 纯 Web App → V2: Tauri 桌面增强** |
| 前端框架 | React 19 + TypeScript |
| 状态管理 | Zustand |
| UI 组件库 | shadcn/ui + Tailwind CSS |
| 构建工具 | Vite |
| 虚拟滚动 | @tanstack/virtual |

### Connector 与集成

| 决策项 | 推荐方案 |
|-------|---------|
| Connector 抽象 (R7) | **ConnectorAdapter 接口 + 适配器模式**，兼容现有 UnifiedActionAPI |
| TG 适配 | TS Adapter Shim 封装 TDLib bindings |
| WA 适配 | HTTP/WebSocket 客户端 Adapter 调用 Go 服务（:9800） |
| 能力差异处理 | PlatformCapabilityManifest 声明式清单 |

### 补充（R9-R12）

| 决策项 | V1 方案 | V2 演进方向 |
|-------|---------|-----------|
| 消息搜索 (R9) | pg_trgm + GIN 索引 | Elasticsearch（CDC 同步） |
| 媒体存储 (R10) | MinIO + Nginx 缓存 + 预签名 URL | Cloudflare R2（零出口费） |
| 消息回放 (R11) | 服务端数据组装 + 简易播放器 | 速度控制、分析叠加、导出 |
| 术语表 (R12) | 全局术语表 + LLM prompt 注入 | 多作用域 + DeepL Glossary API |

### 关键数字

| 指标 | 数值 |
|------|------|
| V1 预估日消息量 | 500K 条/天 |
| 年消息存储增量 | ~180GB |
| 年 raw_events 增量 | ~270GB |
| 翻译月成本 | ~$4,220 |
| WebSocket 并发连接（V1） | 200-500 |
| 预计工期 | 8-13 周 |

### V1 交付范围

**包含**：Message Core + Conversation Core + Account Core + 混合翻译路由 + TG/WA Adapter + Web 工作台 + Agent Facade 基础事件

**不包含**：Elasticsearch、Tauri 桌面端、LINE Connector、高级术语表管理 UI、完整回放播放器

---

## 1. 文档信息

| 项目 | 内容 |
|------|------|
| 文档标题 | 统一 IM 会话中台 — 产品规划与技术选型报告 |
| 版本 | v1.0 |
| 日期 | 2026-04-20 |
| 状态 | 初稿 |
| 密级 | 内部 |

### 目录

0. **TLDR — 全部决策速览**
1. 文档信息
2. 执行摘要
3. 竞品与产品参考
4. 开源 IM 框架评估（R2）
5. Core Layer 技术栈选型（R1）
6. 消息存储方案（R3）
7. 实时推送方案（R4）
8. 翻译服务选型（R5）
9. 客户端方案评估（R6）
10. Connector 抽象设计（R7）
11. 部署架构（R8）
12. 消息搜索方案（R9）
13. 媒体文件存储与 CDN 策略（R10）
14. 消息回放技术方案（R11）
15. 多语言术语表管理（R12）
16. 总结与推荐决策矩阵

---

## 2. 执行摘要

本文档是统一 IM 会话中台（下称"IM 中台"）的产品规划与技术选型报告，涵盖架构决策、技术栈推荐、竞品分析及实施路线。

### 项目定位

IM 中台不是聊天软件。它的核心职责是把散落在 Telegram、WhatsApp、LINE 等平台上的会话数据统一收拢到一个中间层，为上层的业务系统（群聊营销引擎、客户分析面板、翻译工作流等）提供标准化的消息接入、存储和查询能力。换句话说，中台解决的是"消息从哪来、怎么存、如何用"的问题，而不是"人怎么聊天"的问题。

### 核心能力

中台围绕五个能力域展开：

- **多平台聚合**：通过 Connector 层对接各 IM 平台 API，统一消息格式和事件模型
- **统一存储**：全量消息、联系人、群组信息落库，支持历史回查
- **翻译服务**：混合路由翻译引擎，兼顾准确率和成本
- **分析适配**：为现有分析层提供标准数据管道，而非重建分析能力
- **消息回放**：支持按时间线重放会话上下文，辅助运营决策

### 关键技术决策

后端采用 TypeScript + Bun 运行时，选型理由是团队技术栈一致性和 Connector 层已有代码的复用。数据库选 PostgreSQL，承载关系型业务数据和消息元数据，消息正文通过 JSONB 存储。翻译方案采用混合路由：葡语走 DeepL（BLEU 60.4，质量最优）、中文走 GPT-4o-mini（口语翻译更自然，成本极低）、泰语走 Google Translate（覆盖最完整）、系统消息走 Azure Translator（延迟最低，$10/百万字符）。客户端策略上 Web App 优先，高交互场景通过 Tauri 打包桌面端增强。整体架构为模块化单体（Modular Monolith），各模块通过内部事件总线通信，保留未来拆分微服务的可能性。

### 与现有系统的关系

Connector 层已在生产环境运行，支持 Telegram（TDLib）和 WhatsApp（Pure Go Primary Device）的消息收发。群聊营销引擎作为独立消费方，通过中台的 Agent Facade 获取消息事件。现有分析层通过 Analysis Adapter 接入中台数据管道，无需推倒重来。

### V1 范围与工期

V1 交付范围包括 IM Core（消息收发 + 存储 + 会话管理）、Translation Layer（混合翻译路由 + 基础术语表）、基础分析适配器和工作台 Web UI。预计工期 8 至 13 周，视 Connector 层复用程度和翻译服务集成复杂度浮动。

---

## 3. 竞品与产品参考

本节梳理三类相关产品：企业级多渠道客服平台、跨境电商营销 IM 工具、IM 中台与聚合平台。通过横向对比明确我们的差异化定位。

### 3.1 企业级多渠道客服平台

| 产品 | 核心定位 | 支持平台 | 翻译能力 | 开源/商业 | 与我们的差异 |
|------|---------|---------|---------|----------|-------------|
| **Intercom** | AI 驱动的客户 engagement 平台 | Web、iOS、Android、WhatsApp、Instagram | 内置 AI 翻译，质量较高 | 商业（~$39/seat/mo） | 面向 SaaS 客服场景，不暴露消息管道；我们是中台，提供原始数据接口 |
| **Zendesk** | 企业级客服工单系统 | 邮件、Web、WA、TG、FB、SMS、LINE | 插件支持，需额外付费 | 商业 | 以工单流转为核心，IM 只是渠道之一；我们聚焦 IM 数据本身 |
| **Freshchat** | Freshworks 生态内的即时客服 | Web、WA、FB、Apple Business Chat | 基础自动翻译 | 商业 | 绑定 Freshworks 生态，不可独立部署；我们强调独立性和可定制 |
| **Crisp** | 轻量级多渠道客服 | Web、WA、TG、LINE、IG、Messenger | 内置实时翻译 | 商业（部分开源） | 产品形态最接近我们的工作台，但不提供中台能力，无法接入自有业务系统 |
| **Chatwoot** | 开源多渠道客服平台 | WA、FB、TG、LINE、Web、邮箱 | 无内置翻译，需集成 | 开源（Ruby on Rails + PG + Redis） | 最接近的开源对标；我们是中台而非客服产品，侧重数据层而非 agent 工作流 |

### 3.2 跨境电商 / 营销 IM 工具

| 产品 | 核心定位 | 支持平台 | 目标客户 | 与我们的差异 |
|------|---------|---------|---------|-------------|
| **Respond.io** | 多渠道对话式营销平台 | WA、IG、Messenger、TG、LINE、WeChat | 跨境电商、DTC 品牌 | 功能全面但封闭，数据不可导出到自有系统；我们提供数据管道，业务层可自建 |
| **SleekFlow** | AI 社交销售自动化 | WA、IG、FB、LINE、WeChat | 跨境卖家、代理商 | 强调自动化工作流和 CRM 集成；我们是底层基础设施，SleekFlow 这类产品可以建在我们上面 |
| **WATI** | WhatsApp 优先的营销工具 | WA（深度）、部分支持 IG/FB | WhatsApp Business API 用户 | 单平台深度优化；我们走多平台聚合路线，不绑定单一渠道 |
| **Charles** | 对话式电商 | WhatsApp、Instagram | 欧洲 DTC 品牌 | 聚焦电商转化场景，支持商品卡片和支付集成；我们不涉及交易层，专注消息基础设施 |

### 3.3 IM 中台 / 聚合平台

| 产品 | 架构模式 | 桥接能力 | 开源/商业 | 与我们的差异 |
|------|---------|---------|----------|-------------|
| **Matrix / Element** | 去中心化联邦协议 + 参考客户端 | 通过 Bridge 连接 IRC、Slack、TG、WA、Discord 等 | 开源（AGPL-3.0） | 最成熟的开源聚合方案。但 Matrix 是通用聊天协议，我们不需要联邦能力，只需要单向数据收拢。其 AS（Application Service）桥接架构值得参考 |
| **Matterbridge** | 轻量级多协议消息桥接网关 | 支持 30+ 平台的收发桥接 | 开源（Go） | 极简设计，单二进制部署。适合快速验证但不适合生产级中台，缺少持久化、翻译、分析能力 |
| **Beeper** | 基于 Matrix 的多平台聊天聚合客户端 | 同 Matrix Bridge 生态，托管式 | 商业 | 用户体验做得好，但本质是面向终端用户的聊天工具；我们是面向开发者和业务系统的中台 |

### 3.4 对我们的启示

**企业客服平台**给出的核心启发是 unified inbox 体验。Intercom 和 Zendesk 都在告诉你，运营人员需要一个统一的会话视图来处理来自不同平台的消息。我们把这种交互模式搬到工作台 UI 里，但消息数据始终由中台统一管理，而不是锁在某个客服产品的数据库里。conversation assignment（会话分配）机制也值得借鉴，后续可以基于中台的 Event API 实现。

**跨境营销工具**展示了 IM 数据的业务化应用路径。Respond.io 和 SleekFlow 的 broadcast（群发）和 customer segmentation（客户分群）功能，本质上都是对 IM 联系人数据的二次加工。我们的群聊营销引擎已经覆盖了部分场景，中台的价值在于把底层联系人数据标准化，让上层业务系统不需要各自维护平台对接逻辑。workflow 自动化是另一个方向，中台提供消息事件流，业务层自行编排。

**IM 聚合平台**中 Matrix 的 AS（Application Service）桥接架构最值得参考。它的核心思路是定义一套标准的事件模型，让 Bridge 只负责协议转换，不碰业务逻辑。我们的 Connector 层可以采纳类似的分层设计：底层处理平台 API 差异，上层统一输出标准事件。Matterbridge 的轻量级 connector 模式也印证了一个判断：connector 应该尽量薄，复杂度留在 Core Layer。

---

## 4. 开源 IM 框架评估（R2）

本节评估五个主流开源 IM 框架，分析其架构设计、数据模型、桥接能力和可借鉴的设计模式。评估结论：**不建议直接使用任何框架作为底座，但 Matrix 的 Application Services 桥接架构和 OpenIM 的消息模型值得深度参考。**

### 4.1 OpenIM (openimsdk/open-im-server)

**GitHub**: 16.2k ⭐ · Apache-2.0 · Go 97.1% · 最新版本 v3.8.3 (2026-03)

**架构**：纯 Go 微服务架构，设计为可嵌入的 IM 组件。

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Client SDK  │────▶│  openim-api      │────▶│  RPC Services   │
│  (pb+WS)     │     │  (API Gateway)   │     │  - auth         │
└─────────────┘     ├──────────────────┤     │  - user         │
                    │  openim-msggateway│     │  - msg          │
                    │  (WS Gateway)     │     │  - group        │
                    ├──────────────────┤     │  - friend       │
                    │  openim-msgtransfer│     │  - conversation │
                    │  (Kafka Consumer) │     └─────────────────┘
                    ├──────────────────┤              │
                    │  openim-push     │     ┌────────▼────────┐
                    │  (Push Service)  │     │  MongoDB/MySQL  │
                    └──────────────────┘     │  + Kafka        │
                                             │  + Redis        │
                                             └─────────────────┘
```

**消息模型**（Protobuf）：

```protobuf
message MsgData {
  string SendID = 1;           // 发送者 ID
  string RecvID = 2;           // 接收者 ID（1:1）
  string GroupID = 3;          // 群组 ID（群聊）
  string ClientMsgID = 4;      // 客户端生成的去重 ID
  string ServerMsgID = 5;      // 服务端分配的全局 ID
  int32 SessionType = 6;       // 1:1 / 群聊 / 通知
  int32 ContentType = 7;       // 文本 / 图片 / 文件 / 自定义
  bytes Content = 8;           // 实际内容
  int64 Seq = 9;               // 单调递增序号
  int64 SendTime = 10;         // 发送时间戳
  int32 Status = 11;           // 消息状态
  map<string, bool> Options = 12;
}
```

**会话模型**：

```go
type Conversation struct {
    OwnerUserID      string    // 会话所有者
    ConversationID   string    // 会话 ID
    ConversationType int32     // 1:1 / 群聊 / 通知
    UserID           string    // 对方用户 ID（1:1）
    GroupID          string    // 群组 ID（群聊）
}
```

**实时推送**：Protobuf + WebSocket。客户端连接到 `openim-msggateway`，消息通过 Kafka 流转到 `openim-msgtransfer` 持久化后推送。

**扩展性**：每个微服务独立扩展，Kafka 做消息队列，MongoDB 支持分片。

**桥接能力**：❌ 无内置桥接机制。OpenIM 是自包含的 IM 引擎，不提供外部平台对接能力。

**可借鉴点**：
- **MsgData protobuf 模型**：`ClientMsgID` + `ServerMsgID` 双 ID 设计用于去重和全局追踪
- **Seq 序号机制**：单调递增序号用于消息排序、Gap 检测、增量同步
- **微服务拆分思路**：API Gateway、WS Gateway、Message Transfer、Push Service 的职责划分清晰

---

### 4.2 Tinode (tinode/chat)

**GitHub**: 13.3k ⭐ · GPL-3.0 ⚠️ · Go 87.8% · 最新版本 v0.25.2 (2026-03)

**架构**：单 Go 二进制，monolithic 设计。

```
┌──────────┐     ┌───────────────────────────────┐     ┌───────────┐
│  Client   │────▶│  Tinode Server (single binary) │────▶│  MySQL    │
│  WS/gRPC  │     │  - Session management          │     │  PostgreSQL│
│  LP       │     │  - Topic routing (Hub)         │     │  MongoDB  │
└──────────┘     │  - Plugin hooks                │     └───────────┘
                 └───────────────────────────────┘
```

**消息模型**：Topic-based。每个会话（1:1、群聊、频道）都是一个 Topic，Topic 有细粒度的 ACL（read/write/admin/owner）。

**实时推送**：WebSocket（JSON）/ gRPC（protobuf）/ 长轮询。

**扩展性**：支持 sharded clustering + failover，数据库适配器模式支持多种后端。

**桥接能力**：❌ 无。Federation 列为 "Planned" 但未实现。

**⚠️ 许可证风险**：GPL-3.0 意味着任何衍生作品必须开源。对商业中台不友好。

**可借鉴点**：
- **Topic-based ACL**：细粒度权限控制模型，适合跨平台权限映射
- **Session 多协议支持**：同时支持 WebSocket、gRPC、长轮询的会话管理

---

### 4.3 Matrix / Synapse (element-hq/synapse)

**GitHub**: 4.1k ⭐ · AGPL-3.0 · Python 97.1% + Rust 1.4% · 最新版本 v1.151.0 (2026-04)

**架构**：Modular monolith + Worker 架构。

```
                    ┌─────────────────────────┐
                    │   Reverse Proxy (nginx)  │
                    └────┬──────┬──────┬───────┘
                         │      │      │
              ┌──────────▼┐  ┌──▼────┐ ┌▼──────────┐
              │ Sync Worker│  │ Main  │ │ Federation │
              │ (stateless)│  │Process│ │  Sender    │
              └──────────┘  └──┬────┘ └────────────┘
              ┌──────────┐     │         ┌────────────┐
              │ Event     │     │         │AppService  │
              │ Persister │     │         │ Worker     │
              └──────────┘     │         └────────────┘
                    ┌──────────▼──────────┐
                    │   PostgreSQL + Redis │
                    └─────────────────────┘
```

**消息/事件模型**：Event-sourced。一切皆事件（消息、成员变更、房间创建、输入指示器），事件形成 DAG（有向无环图）用于状态解析。

**实时推送**：Long polling（`/sync` 端点）。客户端发起长轮询请求，服务端 hold 住连接直到有新数据。

**扩展性**：Worker 类型包括 `generic_worker`、`event_persister`、`sync_worker`、`federation_sender`、`pusher`、`appservice`。各 Worker 通过 Redis Pub/Sub 通信。

**🌟 桥接能力：Application Services (AS) — 本次评估的核心发现**

Matrix 的 AS 架构是生产级多平台桥接的最佳参考。

**AS 工作原理**：

1. 外部进程（Bridge）向 Synapse 注册，声明感兴趣的用户/房间命名空间（regex）
2. Synapse 将匹配的事件批量推送给 Bridge（HTTP POST）
3. Bridge 可以创建/管理虚拟用户（ghost users）和房间
4. Bridge 将外部平台消息转换为 Matrix 事件推送回 Synapse

**事件流**：

```
Telegram 消息 → mautrix-telegram bridge → Synapse AS API → Matrix 房间事件
Matrix 消息   → Synapse → AS transaction → mautrix-telegram → Telegram API
```

**Transaction 处理**：批量事件 + 指数退避重试 + 持久化追踪（`application_services_txns` 表）。

**mautrix Bridge 家族**：

| Bridge | 平台 | 架构 |
|--------|------|------|
| mautrix-telegram | Telegram | Hybrid puppeting/relaybot |
| mautrix-whatsapp | WhatsApp | Puppeting via multi-device API |
| mautrix-discord | Discord | Puppeting |
| mautrix-signal | Signal | bridgev2 framework |

**bridgev2 框架**：下一代统一桥接框架（Go），提供 Connector 接口、状态管理、消息转换管道。

**可借鉴点**：
- **AS 架构模式**：外部进程注册命名空间 + 批量事件推送 + 虚拟用户管理
- **Transaction 调度器**：批量 + 重试 + 幂等性保证
- **bridgev2 Connector 接口**：定义 `HandleMatrixMessage` 和平台特定 handler 的标准模式

---

### 4.4 Mattermost (mattermost/mattermost)

**GitHub**: ~30k ⭐ · Apache-2.0 + Commercial · Go + React · 最新版本 v11 (2026-04)

**架构**：Monolithic Go binary，三层架构。

```
server/
├── cmd/mattermost/       # 单二进制入口
├── channels/
│   ├── api4/             # REST API v4
│   ├── app/              # 业务逻辑层
│   ├── store/sqlstore/   # 数据访问（PostgreSQL only since v8）
│   ├── web/              # Web handlers
│   └── wsapi/            # WebSocket API
├── platform/             # Platform services
```

**消息模型**：Posts 表，标准 CRUD 模型。

**实时推送**：WebSocket。服务端广播 `posted` 事件，客户端 Redux 状态管理。

**扩展性**：HA clustering（多实例 + 负载均衡），Plugin 架构（RPC-based DB 连接共享）。

**桥接能力**：❌ 无原生桥接，仅通过 Plugin 和 REST API 集成。

**可借鉴点**：
- **API → App → Store 三层架构**：清晰的职责分离
- **Plugin RPC 模式**：Plugin 进程通过 RPC 共享主进程的 DB 连接池

---

### 4.5 Rocket.Chat (RocketChat/Rocket.Chat)

**GitHub**: ~40k ⭐ · MIT · Node.js/Meteor + MongoDB

**架构**：Meteor monolith + 可选微服务。

```
┌──────────────────────────────────────┐
│  Rocket.Chat Monolith (Meteor/Node)  │
│  ┌─────────┐  ┌─────────────┐       │
│  │ Internal │  │  External   │       │
│  │ Services │  │  Services   │       │
│  └─────────┘  └─────────────┘       │
└──────────────┬───────────────────────┘
               │
    ┌──────────▼──────────┐
    │  MongoDB (required)  │
    └─────────────────────┘
```

**微服务**（可选）：Authorization、Presence、DDP Streamer、NATS。

**实时推送**：DDP (Distributed Data Protocol)，Meteor 的 WebSocket-based pub/sub。

**⚠️ 扩展性问题**：GitHub Issue #13380 记录了 ~50 msg/sec 的扩展瓶颈。Meteor 单线程 + N×N mergebox 是主要瓶颈。

**桥接能力**：❌ 有限（通过 Apps Engine），无生产级多平台桥接。

**可借鉴点**：
- **反面教材**：Meteor 框架的扩展性限制
- **NATS 微服务通信**：轻量级消息总线

---

### 4.6 横向对比矩阵

| 维度 | OpenIM | Tinode | Matrix/Synapse | Mattermost | Rocket.Chat |
|------|--------|--------|----------------|------------|-------------|
| **架构** | 微服务 (Go) | 单体 (Go) | Worker-based (Python/Rust) | 单体 (Go) | Meteor 单体 (Node.js) |
| **主数据库** | MongoDB | MySQL/PG/Mongo | PostgreSQL | PostgreSQL | MongoDB |
| **消息队列** | Kafka + Redis | N/A | Redis Pub/Sub | N/A | NATS (微服务) |
| **实时传输** | Protobuf + WS | JSON WS / gRPC | Long-polling `/sync` | WebSocket | DDP (WebSocket) |
| **消息模型** | SendID/RecvID/GroupID protobuf | Topic-based | Event-sourced DAG | Post + Channel | Message + Room |
| **桥接能力** | ❌ | ❌ | ✅ AS + mautrix bridges | ❌ | ❌ |
| **Federation** | ❌ | Planned | ✅ 生产级 | ❌ | ❌ |
| **扩展性** | ✅ 微服务 | 中等（sharding） | ✅ Workers + Redis | ✅ HA clustering | ⚠️ 已知瓶颈 (~50 msg/s) |
| **许可证** | Apache-2.0 | GPL-3.0 ⚠️ | AGPL-3.0 | Apache-2.0 + Commercial | MIT |
| **GitHub Stars** | 16.2k | 13.3k | 4.1k | ~30k | ~40k |
| **社区活跃度** | 活跃（中文为主） | 小（1-2 维护者） | 大（Element 支持） | 大（商业支持） | 大（VC 支持） |

---

### 4.7 可借鉴的设计模式

#### 🏆 模式 1：Matrix Application Services — 桥接架构（主要参考）

**核心思路**：外部进程注册命名空间 → 接收批量事件 → 管理虚拟身份 → 双向消息转换。

**我们的应用**：

```
统一 IM 中台
├── Bridge Adapter Interface (类似 AS API)
│   ├── TelegramBridge (类似 mautrix-telegram)
│   ├── WhatsAppBridge (类似 mautrix-whatsapp)
│   └── LINEBridge (自定义)
├── 统一消息模型
│   └── platform_msg → canonical_msg → platform_msg
├── 虚拟用户命名空间
│   └── @telegram_user123:@whatsapp_user456:yourdomain
└── Transaction Queue (类似 AS scheduler)
    └── 批量事件 + 重试 + 指数退避
```

**关键代码参考**：[`synapse/appservice/scheduler.py#L95-414`](https://github.com/matrix-org/synapse/blob/be65a8ec/synapse/appservice/scheduler.py#L95-L414) — transaction 批量和重试逻辑。

#### 🏆 模式 2：OpenIM 微服务拆分 — Go 架构

**核心思路**：清晰的服务职责划分 + gRPC 通信 + Kafka 异步。

**我们的映射**：

| OpenIM Service | 我们的等价模块 |
|---|---|
| `openim-msggateway` | Platform connection pool manager |
| `openim-msgtransfer` | Message normalization + routing pipeline |
| `openim-push` | Webhook/notification dispatcher |
| `openim-api` | 我们的 REST/gRPC API surface |

**关键代码参考**：[`protocol/sdkws/sdkws.pb.go#L1564`](https://github.com/openimsdk/protocol/blob/main/sdkws/sdkws.pb.go#L1564) — `MsgData` protobuf 作为 canonical message 模型起点。

#### 🥈 模式 3：mautrix bridgev2 — Bridge 框架

**核心思路**：统一 Connector 接口 + 状态管理 + 消息转换管道。

**我们的应用**：`bridgev2` 的 Connector 模式（定义 `Connector` 接口，实现 `HandleMatrixMessage` 和平台特定 handler）直接适用于我们的 Adapter 设计。

#### 🥉 模式 4：Tinode Topic Model — 访问控制

Tinode 的细粒度 per-topic、per-user 权限模型适合建模跨平台权限映射（不同平台的群组权限语义不同）。

#### 🥉 模式 5：Mattermost Plugin RPC — 数据库共享

Mattermost 的 Plugin 通过 RPC 共享主进程 DB 连接池的模式，适合中台需要跨 Adapter 共享状态的场景。

---

### 4.8 结论

**不建议直接使用任何框架作为底座。** 原因：

1. **OpenIM / Tinode / Mattermost**：都是自包含的 IM 引擎，不提供外部平台桥接能力
2. **Matrix/Synapse**：过于重量级（Python + 复杂的 Federation 协议），我们不需要联邦能力
3. **Rocket.Chat**：已知扩展性瓶颈，Meteor 框架不适合高并发场景
4. **许可证风险**：Tinode (GPL-3.0)、Synapse (AGPL-3.0) 对商业中台不友好

**推荐策略**：借鉴设计模式，自建轻量中台核心。

- **桥接架构**：参考 Matrix AS + mautrix bridgev2
- **消息模型**：参考 OpenIM MsgData protobuf，扩展 `PlatformType` + `PlatformMessageID` + `PlatformMetadata`
- **微服务拆分**（如需要）：参考 OpenIM 的职责划分
- **访问控制**：参考 Tinode Topic ACL

---

## 5. 核心层技术栈选型（R1）

核心层是统一 IM 会话中台的"心脏"，承载消息接入、路由、持久化、翻译触发和业务编排等全部关键链路。选型需要同时满足两个约束：**团队交付效率**和**系统运行性能**。以下对三种候选方案做深度对比分析。

### 5.1 候选方案概览

| 维度 | Option A: TypeScript (Bun) | Option B: Go | Option C: 混合 (TS 业务 + Go 管道) |
|------|---------------------------|-------------|-----------------------------------|
| 核心思路 | 单一语言，全 TS 栈 | 单一语言，全 Go 栈 | 按职责拆分语言 |
| 与现有生态契合度 | 与群聊营销引擎(TS) 100% 复用 | 与 WA Connector(Go) 复用 | 部分复用 |
| 团队学习成本 | 零 | 中高（2-3 月 ramp-up） | 中 |

### 5.2 方案 A：TypeScript（Bun 运行时）

**优势**

1. **团队生产力最大化**。现有团队以 TypeScript 为主要技能栈，群聊营销引擎的全部业务逻辑、类型定义、工具函数都可以直接复用或共享。新功能从设计到上线的周期最短。

2. **前后端类型共享**。消息体（Message）、会话（Conversation）、联系人（Contact）等核心类型在前后端之间只有一份定义，通过 monorepo 的 shared package 直接引用。这意味着编译器会替你捕获接口不一致的错误，而不是在生产环境里靠用户反馈才发现。

3. **npm 生态对 IM 场景的覆盖**。`grammy`（Telegram Bot API）、`whatsapp-web.js`、`ioredis`、`bullmq`、`socket.io` 等库在 npm 上有成熟且持续维护的版本。对比 Go 生态，IM 领域的 TS 库在灵活性和文档质量上整体更好。

4. **Bun 的性能提升**。根据 Bun 官方基准和社区实测，Bun 在 HTTP 吞吐量上约为 Node.js 的 2-3 倍，启动时间快 4 倍以上，内置 SQLite 和 test runner 减少外部依赖。对于 I/O 密集型的消息处理场景，Bun 已经能够逼近 Go 的性能水平。

5. **异步 I/O 模型天然适配消息处理**。IM 系统的典型工作模式是"等待网络 → 处理消息 → 写入存储 → 推送通知"，每个环节都是 I/O bound，Node.js/Bun 的事件循环模型对此非常高效。

**劣势**

1. **单线程事件循环的 CPU 瓶颈**。翻译服务调用、文本分析（情感分析、关键词提取）等 CPU 密集型任务如果直接在主线程执行，会阻塞消息处理。解决方案是 Worker Threads 或将 CPU 密集部分抽成独立微服务，但这增加了架构复杂度。

2. **长连接内存开销**。每个 WebSocket 连接在 Node.js/Bun 中约占 10-50KB 内存，相比 Go goroutine 的 ~4KB 有数量级差距。不过 V1 阶段预估并发连接数 <5000，总内存开销仍在可接受范围（<250MB）。

3. **高并发 WebSocket 的成熟度**。Go 的 `gorilla/websocket` 和 `nhooyr/websocket` 在处理数万并发连接的场景下有大量生产验证案例。TS 侧的 `ws` 库虽然也经过大规模使用（Vercel、GraphQL 订阅），但在单进程管理超大规模连接的场景下，社区最佳实践和排障经验相对少一些。

### 5.3 方案 B：Go

**优势**

1. **与 WA Connector 和开源 IM 框架对齐**。WhatsApp Connector 已经是 Go 实现。OpenIM、Tinode、mautrix bridges 等主流开源 IM 框架均为 Go 编写，可以直接复用这些项目的连接管理、消息格式化和协议适配代码。

2. **goroutine 模型**。每个连接一个 goroutine，~4KB 栈空间初始分配，轻松管理数万并发 WebSocket。Go 的 channel 和 select 原语让消息路由的并发编程变得直观且安全。

3. **部署优势**。单二进制、快速启动、低内存基线。在容器化环境中，Go 服务的镜像可以压缩到 10-20MB（scratch 或 distroless 基础镜像），冷启动时间 <100ms。

4. **gRPC 原生支持**。protobuf 编译和 gRPC 服务端/客户端代码生成是 Go 的一等公民，适合未来与 Go 实现的 Connector 之间建立高性能内部通信。

**劣势**

1. **团队技能缺口**。当前团队以 TS 为主力，Go 的学习曲线虽然平缓，但达到生产级代码质量（习惯 error 处理模式、理解 goroutine 泄漏排查、熟悉 Go 的测试惯例）需要 2-3 个月的实战积累。在 V1 时间窗口紧张的情况下，这是最现实的风险。

2. **前后端类型分裂**。Go 的 struct 定义和 TypeScript 的 interface/type 是两套体系。消息模型、API 接口的任何变更都需要在两个语言中同步修改，否则就会出现运行时不一致。protobuf/OpenAPI 可以部分缓解这个问题，但引入了额外的代码生成流程和维护成本。

3. **快速迭代的摩擦**。Go 的编译型特性意味着每次改动都需要重新编译，虽然编译速度很快，但在频繁调试和快速试错的 V1 阶段，相比 TS 的即时执行仍有体感差异。Go 的 error handling 虽然显式且安全，但 `if err != nil` 的重复书写在业务逻辑密集的代码中确实增加了阅读负担。

### 5.4 方案 C：混合架构

**优势**

业务逻辑（客户分析、翻译编排、API 层）用 TS 编写，消息管道（协议适配、连接管理、消息路由）用 Go 实现。每种语言用在它最擅长的场景。团队可以在熟悉的 TS 领域快速推进业务功能，同时在 Go 侧逐步积累高并发处理能力。

**劣势**

运维复杂度直接翻倍：两套构建系统、两套 CI/CD pipeline、两套监控和日志体系。跨语言调试是另一个痛点：一个消息从 Go 管道进入 TS 业务层，在链路上追踪问题需要同时理解两种语言的运行时行为。类型同步依赖 protobuf 或 OpenAPI 定义，这本身又是一个需要持续维护的中间层。

在 V1 阶段引入双语言架构的时机过早。除非有明确的性能瓶颈数据证明单语言方案不可行，否则混合架构带来的运维成本会拖累整个团队的交付速度。

### 5.5 决策矩阵

| 评估维度 | 权重 | TS (Bun) | Go | 混合 |
|---------|------|----------|-----|------|
| 团队生产力 | 25% | 9 | 5 | 6 |
| 运行性能 | 20% | 7 | 9 | 8 |
| 生态适配 | 15% | 8 | 7 | 8 |
| 部署简便性 | 15% | 7 | 9 | 5 |
| 维护成本 | 15% | 8 | 7 | 5 |
| 未来扩展性 | 10% | 7 | 8 | 9 |
| **加权总分** | **100%** | **7.75** | **7.10** | **6.55** |

### 5.6 选型结论

**推荐方案 A：TypeScript（Bun 运行时）作为核心层主力语言。**

理由如下：

1. **生产力瓶颈大于性能瓶颈**。V1 阶段的核心挑战是"能不能在 3 个月内交付可用的统一会话中台"，而不是"能不能处理百万级 QPS"。团队在 TS 上的熟练度直接决定了交付速度。

2. **预估消息量在 TS/Bun 的舒适区内**。按 100 个账号、每个账号 50 个活跃会话、每会话日均 100 条消息计算，峰值约 500K 消息/天，即 ~350 消息/分钟。Bun 处理这个量级绰绰有余。

3. **前后端类型共享减少集成缺陷**。统一的消息模型定义消除了"前端期望的数据结构和后端实际返回的不一致"这类高频 bug。

4. **保留性能升级路径**。如果未来消息量增长到 Bun 难以承受的水平，可以采用"绞杀者模式"，逐步将消息路由、连接管理等热路径抽取为 Go 微服务。这个演进路径是增量的，不需要推翻重来。

5. **Bun 弥合了 I/O 性能差距**。消息处理的本质是 I/O bound（网络读写、数据库写入、缓存操作），Bun 在这类场景下的性能已经接近 Go，不存在"选 TS 就意味着性能不可接受"的问题。

### 5.7 技术规格确认

| 项目 | 选定方案 |
|------|---------|
| 运行时 | Bun 1.1+ |
| Web 框架 | Elysia（Bun 原生，性能最优） |
| WebSocket 库 | `ws` 或 Elysia 内置 WS |
| ORM | Drizzle ORM（类型安全，支持 PostgreSQL） |
| 任务队列 | BullMQ + Redis |
| 进程管理 | PM2 或 Bun 原生 cluster |
| 监控 | OpenTelemetry SDK |

---

## 6. 消息存储方案（R3）

### 6.1 数据库选型确认：PostgreSQL

PostgreSQL 作为统一 IM 会话中台的持久化存储，是一个在功能完备性和运营成熟度之间取得最优平衡的选择。以下是关键理由：

1. **ACID 保证消息有序性**。IM 消息的顺序是不可妥协的语义要求。PostgreSQL 的事务隔离和 MVCC 机制确保消息写入、序号分配、状态更新在同一个事务中原子完成。

2. **JSONB 灵活存储平台差异元数据**。不同 IM 平台（Telegram、WhatsApp、LINE）的消息结构各异，平台特有字段（Telegram 的 \`forward_from\`、WhatsApp 的 \`quoted_message\`）可以存在 JSONB 列中，既不损失信息，又不会因为 schema 变更频繁 DDL。

3. **原生声明式分区**。自 PG 10 起支持的 declarative partitioning 让 messages、raw_events 这种大表可以按时间范围自动分区，查询性能和运维管理（detach/drop 旧分区）都很方便。

4. **全文搜索和模糊匹配**。\`pg_trgm\` 支持模糊搜索（客户名拼写纠错），\`tsvector\`/\`tsquery\` 支持消息内容全文检索。V1 阶段不需要引入 Elasticsearch，PostgreSQL 自身就能覆盖基本的搜索需求。

5. **丰富的扩展生态**。\`pgvector\` 为未来的语义搜索做准备，\`TimescaleDB\` 可以用于消息量时序分析，\`pg_partman\` 自动管理分区生命周期。

6. **成熟的复制方案**。Streaming replication 用于高可用读副本，Logical replication 用于增量同步到数据仓库或搜索引擎。

### 6.2 核心表设计

以下 10 张表覆盖统一会话中台的全部数据需求。

#### 6.2.1 accounts（受控账号表）

存放我们控制的 IM 账号信息。

\`\`\`sql
CREATE TABLE accounts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  platform        VARCHAR(20) NOT NULL,  -- 'telegram' | 'whatsapp' | 'line'
  platform_id     VARCHAR(100) NOT NULL,  -- 平台侧账号标识
  display_name    VARCHAR(100),
  avatar_url      TEXT,
  status          VARCHAR(20) DEFAULT 'active',  -- 'active' | 'suspended' | 'archived'
  credentials     JSONB,       -- 加密后的平台凭据（token、session data）
  config          JSONB       DEFAULT '{}',  -- 账号级配置（翻译开关、自动回复）
  last_sync_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_accounts_platform_id ON accounts(platform, platform_id);
CREATE INDEX idx_accounts_status ON accounts(status);
\`\`\`

#### 6.2.2 external_identities（外部联系人表）

存放所有外部联系人（客户、潜在客户）。

\`\`\`sql
CREATE TABLE external_identities (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  platform        VARCHAR(20) NOT NULL,
  platform_uid    VARCHAR(100) NOT NULL,  -- 平台侧用户 ID
  display_name    VARCHAR(200),
  avatar_url      TEXT,
  language        VARCHAR(10),  -- 检测到的首选语言（'pt-BR', 'th', 'zh-CN'）
  timezone        VARCHAR(50),
  metadata        JSONB       DEFAULT '{}',  -- 平台特有属性
  first_seen_at   TIMESTAMPTZ,
  last_active_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_external_identities_platform_uid ON external_identities(platform, platform_uid);
CREATE INDEX idx_external_identities_language ON external_identities(language);
CREATE INDEX idx_external_identities_last_active ON external_identities(last_active_at);
\`\`\`

#### 6.2.3 conversations（统一会话表）

统一会话的核心实体。一个会话可能关联多个平台的消息流。

\`\`\`sql
CREATE TABLE conversations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID        NOT NULL REFERENCES accounts(id),
  type            VARCHAR(20) NOT NULL,  -- 'dm' | 'group' | 'channel'
  title           VARCHAR(300),
  platform        VARCHAR(20) NOT NULL,
  platform_conv_id VARCHAR(200),  -- 平台侧会话/群组 ID
  status          VARCHAR(20) DEFAULT 'active',
  last_message_at TIMESTAMPTZ,
  message_count   BIGINT      DEFAULT 0,
  metadata        JSONB       DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_conversations_account_status ON conversations(account_id, status);
CREATE INDEX idx_conversations_platform_conv ON conversations(platform, platform_conv_id);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);
\`\`\`

#### 6.2.4 conversation_participants（会话参与者表）

多态关联，支持受控账号和外部联系人两种参与者类型。

\`\`\`sql
CREATE TABLE conversation_participants (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES conversations(id),
  participant_type VARCHAR(20) NOT NULL,  -- 'account' | 'external'
  participant_id  UUID        NOT NULL,  -- 指向 accounts.id 或 external_identities.id
  role            VARCHAR(20) DEFAULT 'member',  -- 'owner' | 'admin' | 'member'
  joined_at       TIMESTAMPTZ DEFAULT now(),
  left_at         TIMESTAMPTZ,
  nickname        VARCHAR(100),  -- 会话内别名
  metadata        JSONB       DEFAULT '{}'
);

CREATE UNIQUE INDEX idx_conv_participants_unique 
  ON conversation_participants(conversation_id, participant_type, participant_id);
CREATE INDEX idx_conv_participants_lookup 
  ON conversation_participants(participant_type, participant_id);
\`\`\`

#### 6.2.5 messages（统一消息表）

整个中台最核心的表。三轨文本设计（raw_text + display_text + translated_text）是关键特性。

\`\`\`sql
CREATE TABLE messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES conversations(id),
  conversation_seq BIGINT     NOT NULL,  -- 会话内单调递增序号
  account_id      UUID        NOT NULL REFERENCES accounts(id),
  sender_type     VARCHAR(20) NOT NULL,  -- 'account' | 'external' | 'system'
  sender_id       UUID        NOT NULL,
  platform        VARCHAR(20) NOT NULL,
  platform_msg_id VARCHAR(200),  -- 平台原始消息 ID（去重）
  message_type    VARCHAR(20) NOT NULL,  -- 'text' | 'image' | 'file' | 'sticker' | 'system'
  
  raw_text        TEXT,        -- 平台原始文本，不做任何修改
  display_text    TEXT,        -- 展示文本（经过格式化、emoji 标准化）
  translated_text TEXT,        -- 翻译结果文本
  
  source_lang     VARCHAR(10),  -- 源语言
  target_lang     VARCHAR(10),  -- 目标翻译语言
  translation_provider VARCHAR(20),  -- 'deepl' | 'azure' | 'gpt' | 'google'
  translation_status VARCHAR(20) DEFAULT 'pending',  -- 'pending' | 'completed' | 'failed'
  
  reply_to_seq    BIGINT,       -- 引用消息的 seq
  metadata        JSONB        DEFAULT '{}',
  sent_at         TIMESTAMPTZ  NOT NULL,  -- 平台侧发送时间
  received_at     TIMESTAMPTZ  DEFAULT now(),  -- 我们收到的时间
  edited_at       TIMESTAMPTZ,
  deleted_at      TIMESTAMPTZ,  -- 软删除
  created_at      TIMESTAMPTZ  DEFAULT now()
) PARTITION BY RANGE (sent_at);

CREATE UNIQUE INDEX idx_messages_conv_seq ON messages(conversation_id, conversation_seq);
CREATE UNIQUE INDEX idx_messages_platform_msg ON messages(platform, platform_msg_id);
CREATE INDEX idx_messages_conv_sent ON messages(conversation_id, sent_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_type, sender_id);
CREATE INDEX idx_messages_translation_pending ON messages(translation_status) 
  WHERE translation_status = 'pending';
CREATE INDEX idx_messages_sent_at ON messages(sent_at DESC);
\`\`\`

#### 6.2.6 attachments（附件表）

\`\`\`sql
CREATE TABLE attachments (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id      UUID        NOT NULL REFERENCES messages(id),
  type            VARCHAR(20) NOT NULL,  -- 'image' | 'video' | 'audio' | 'document' | 'sticker'
  storage_key     TEXT        NOT NULL,  -- S3/R2 对象键
  mime_type       VARCHAR(100),
  file_size       BIGINT,
  width           INTEGER,
  height          INTEGER,
  duration_sec    INTEGER,     -- 音视频时长
  thumbnail_key   TEXT,        -- 缩略图对象键
  metadata        JSONB       DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_attachments_message ON attachments(message_id);
CREATE INDEX idx_attachments_type ON attachments(type);
\`\`\`

#### 6.2.7 raw_events（平台原始事件表）

从第一天开始保存全部平台原始事件数据。这张表的价值随时间增长，是不可妥协的数据资产。

\`\`\`sql
CREATE TABLE raw_events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID        NOT NULL REFERENCES accounts(id),
  platform        VARCHAR(20) NOT NULL,
  event_type      VARCHAR(50) NOT NULL,  -- 'message' | 'edit' | 'delete' | 'read' | 'typing' | 'join'...
  platform_event_id VARCHAR(200),
  raw_payload     JSONB       NOT NULL,  -- 平台返回的完整 JSON
  processed       BOOLEAN     DEFAULT false,
  received_at     TIMESTAMPTZ DEFAULT now()
) PARTITION BY RANGE (received_at);

CREATE INDEX idx_raw_events_account ON raw_events(account_id, received_at DESC);
CREATE INDEX idx_raw_events_type ON raw_events(event_type, received_at DESC);
CREATE INDEX idx_raw_events_unprocessed ON raw_events(processed) WHERE processed = false;
\`\`\`

#### 6.2.8 analysis_results（分析结果表）

\`\`\`sql
CREATE TABLE analysis_results (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        REFERENCES conversations(id),
  message_id      UUID        REFERENCES messages(id),
  account_id      UUID        NOT NULL REFERENCES accounts(id),
  analysis_type   VARCHAR(30) NOT NULL,  -- 'sentiment' | 'intent' | 'keyword' | 'summary'
  result          JSONB       NOT NULL,  -- 分析结果（结构随类型变化）
  model_used      VARCHAR(50),
  confidence      DECIMAL(3,2),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_analysis_conv_type ON analysis_results(conversation_id, analysis_type);
CREATE INDEX idx_analysis_message ON analysis_results(message_id);
CREATE INDEX idx_analysis_created ON analysis_results(created_at DESC);
\`\`\`

#### 6.2.9 translation_records（翻译审计记录表）

\`\`\`sql
CREATE TABLE translation_records (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id      UUID        NOT NULL REFERENCES messages(id),
  source_text     TEXT        NOT NULL,
  source_lang     VARCHAR(10) NOT NULL,
  target_lang     VARCHAR(10) NOT NULL,
  translated_text TEXT        NOT NULL,
  provider        VARCHAR(20) NOT NULL,
  model           VARCHAR(50),
  character_count INTEGER,
  latency_ms      INTEGER,
  cost_usd        DECIMAL(10,6),
  cache_hit       BOOLEAN     DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_translation_message ON translation_records(message_id);
CREATE INDEX idx_translation_provider ON translation_records(provider, created_at DESC);
CREATE INDEX idx_translation_cache_miss ON translation_records(cache_hit) WHERE cache_hit = false;
\`\`\`

#### 6.2.10 conversation_aliases（客户匿名化别名表）

\`\`\`sql
CREATE TABLE conversation_aliases (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES conversations(id),
  identity_id     UUID        NOT NULL REFERENCES external_identities(id),
  alias_name      VARCHAR(100) NOT NULL,  -- 匿名化显示名
  alias_avatar    TEXT,          -- 匿名化头像 URL
  assigned_by     UUID,          -- 操作人 account_id
  active          BOOLEAN     DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_conv_aliases_unique 
  ON conversation_aliases(conversation_id, identity_id) WHERE active = true;
CREATE INDEX idx_conv_aliases_identity ON conversation_aliases(identity_id);
\`\`\`

### 6.3 分区策略

**messages 表**：按 \`sent_at\` 做 RANGE 分区，每月一个分区。

\`\`\`sql
-- 示例：2025年1月分区
CREATE TABLE messages_2025_01 PARTITION OF messages
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
\`\`\`

**raw_events 表**：同样按 \`received_at\` 做 RANGE 月分区。

**分区自动管理**：使用 \`pg_partman\` 扩展，配置 \`premake = 3\`（提前创建未来 3 个月分区），\`retention = '3 months'\`（自动 detach 超期分区）。

**预估数据量**：

| 指标 | 日 | 月 | 年 |
|------|-----|------|------|
| 消息量 | 500K | 15M | 180M |
| 消息存储 | ~500MB | ~15GB | ~180GB |
| raw_events（约为消息 1.5x） | ~750MB | ~22GB | ~270GB |

### 6.4 数据生命周期

\`\`\`
┌──────────────────────────────────────────────────┐
│                  数据温度分层                      │
├──────────┬──────────────┬────────────────────────┤
│   Hot    │    Warm      │        Cold            │
│  0-3 月  │   3-12 月    │       >12 月           │
├──────────┼──────────────┼────────────────────────┤
│ 主分区    │ 压缩分区     │ Parquet → 对象存储     │
│ SSD 存储  │ HDD/廉价SSD  │ 分区 DETACH           │
│ 全索引    │ 核心索引     │ 仅通过导入查询         │
│ 实时查询  │ 秒级查询     │ 分钟级离线分析         │
└──────────┴──────────────┴────────────────────────┘

raw_events 特殊策略：
  Hot:  1 月（高频用于调试和回溯）
  Warm: 1-3 月
  Cold: >3 月（导出为 Parquet，分区 DETACH）
\`\`\`

### 6.5 消息序号设计

每个会话维护一个单调递增的 \`conversation_seq\`，用于：

- **消息排序**：会话内绝对顺序的唯一定义
- **缺 Gap 检测**：客户端上报 \`last_seen_seq=100\`，服务端发现 101-105 缺失，触发重传
- **增量同步**：客户端断线重连后发送 \`last_sync_seq\`，服务端返回 seq > 该值的所有消息
- **分页**：用 seq 做 keyset pagination，避免 OFFSET 的性能问题

**实现方案**：每个 conversation 对应一个 PostgreSQL SEQUENCE（\`seq_conv_{conversation_id}\`），在消息写入事务中 \`nextval()\` 获取序号。V1 阶段消息量下 PG SEQUENCE 性能足够（单序列每秒可分配 >100K 个值）。如果未来单会话消息速率超过 PG SEQUENCE 的承受范围，可以切换到 Redis INCR 并异步持久化回 PG。

---

## 7. 实时推送方案（R4）

### 7.1 方案对比

| 维度 | WebSocket | SSE | NATS | Redis Streams + Pub/Sub |
|------|-----------|-----|------|------------------------|
| 通信方向 | 双向 | 单向（服务端→客户端） | 双向（需网关） | 双向（内部） |
| 延迟 | ~50ms | ~50ms | <10ms（集群内） | <5ms（集群内） |
| 浏览器支持 | 全部 | 全部（HTTP/1.1+） | 不直接支持 | 不直接支持 |
| 自动重连 | 需自行实现 | 内置 | 需自行实现 | N/A |
| 典型吞吐 | 10K 连接/节点 | 10K 连接/节点 | 10M+ msg/sec | 1M+ msg/sec |
| 实现复杂度 | 中 | 低 | 高（需要网关层） | 中（内部使用） |
| 消息持久化 | 无（需外挂） | 无 | JetStream 可选 | Streams 内置 |
| 适合场景 | IM 双向通信 | 单向通知、日志流 | 微服务消息总线 | 服务间解耦 |

**SSE 的局限**：SSE 是单向的，客户端发消息仍然要走 HTTP REST。IM 场景天然是双向的（收消息、发消息、打字状态、已读回执），用 SSE 意味着收发走两套不同的协议，增加了前端的复杂度和一致性维护成本。

**NATS 的定位**：NATS 是优秀的消息中间件，但它不是为浏览器客户端设计的。要在浏览器端使用 NATS，前面还要架一层 WebSocket 网关做协议转换，这本质上就是"WebSocket + 更复杂的中间层"。除非团队已经有 NATS 基础设施，否则引入 NATS 的投入产出比不高。

**Redis 的角色**：Redis 在我们的架构中已经承担缓存职责。Redis Pub/Sub 作为服务间消息分发通道是合理的，但它不适合直接面向客户端。Redis Streams 可以作为内部消息持久化的补充，但不是客户端推送的首选。

### 7.2 推荐架构：WebSocket + Redis Pub/Sub

```
                          ┌─────────────────────────────┐
                          │   Client (Browser / Tauri)   │
                          └──────────────┬──────────────┘
                                         │ WebSocket
                                         ▼
                          ┌──────────────────────────────┐
                          │       WS Gateway Service      │
                          │  ─────────────────────────── │
                          │  · 连接管理 (auth, heartbeat)  │
                          │  · 每连接状态 (内存中)          │
                          │  · 消息序列化/反序列化          │
                          │  · 订阅: Redis channel per     │
                          │    conversation                │
                          └──────────────┬───────────────┘
                                         │ Redis Pub/Sub
                                         │ channel: conv:{id}
                                         ▼
                          ┌──────────────────────────────┐
                          │       Message Router          │
                          │  ─────────────────────────── │
                          │  · 无状态，可水平扩展           │
                          │  · 消息路由: 确定目标会话       │
                          │  · 发布到正确的 Redis channel   │
                          └──────────────┬───────────────┘
                                         │
                                         ▼
                          ┌──────────────────────────────┐
                          │       Message Core            │
                          │  ─────────────────────────── │
                          │  · 消息持久化 (PostgreSQL)     │
                          │  · 翻译触发                    │
                          │  · 分析触发                    │
                          │  · 序号分配                    │
                          └──────────────────────────────┘
```

**数据流**：

1. 外部平台消息通过 Connector 进入 Message Core
2. Message Core 完成持久化、翻译触发后，将结构化消息发布到 Redis channel `conv:{conversation_id}`
3. 所有订阅了该 channel 的 WS Gateway 实例收到消息
4. 拥有对应客户端连接的 Gateway 实例将消息推送到浏览器

**多实例扩展**：当 WS Gateway 扩展到多个实例时，Redis Pub/Sub 天然实现了 fan-out。每个 Gateway 实例都订阅所有会话 channel，但只有持有对应客户端连接的实例会实际推送。这种模式下不需要 sticky session，任何 Gateway 实例都可以服务任何客户端。

### 7.3 WebSocket 协议设计

```
消息帧格式 (JSON):

服务端 → 客户端:
{
  "type": "message.new" | "message.translated" | "message.edited" |
          "typing" | "read" | "analysis.update" | "presence" |
          "sync" | "error",
  "data": { ... },
  "seq": 12345,          // 全局递增事件序号
  "ts": 1700000000000    // 服务端时间戳 (ms)
}

客户端 → 服务端:
{
  "type": "message.send" | "typing" | "read.ack" | "sync.request" |
          "ping",
  "data": { ... },
  "client_seq": 678      // 客户端本地序号（用于响应匹配）
}
```

**心跳机制**：客户端每 30 秒发送 `ping`，服务端回复 `pong`。连续 3 次 ping 无响应（90 秒）判定连接断开，触发断线重连流程。

### 7.4 多客户端同步

业务员可能同时打开浏览器和桌面客户端（Tauri），或者在不同设备上查看同一会话。多客户端同步需要保证一致性。

**同步模型**：

- 每个客户端本地维护 `last_sync_seq`（per conversation）
- 连接建立或断线重连时，客户端发送 `sync.request`，携带每个会话的 `last_sync_seq`
- 服务端返回 seq > `last_sync_seq` 的全部消息（增量同步）
- 如果差距过大（>1000 条），服务端返回摘要 + 最近 100 条，客户端按需加载历史

**冲突解决**：服务端 `conversation_seq` 是唯一的顺序权威。客户端的本地排序仅用于乐观显示，收到服务端数据后以服务端为准。

### 7.5 断线重连策略

**客户端侧**：

```
重连退避策略:
  第 1 次: 1 秒后重连
  第 2 次: 2 秒后重连
  第 3 次: 4 秒后重连
  第 4 次: 8 秒后重连
  第 5 次: 16 秒后重连
  第 6+ 次: 30 秒后重连（上限）

每次重连时:
  1. 建立 WebSocket 连接
  2. 发送 auth token
  3. 发送 sync.request (各会话 last_sync_seq)
  4. 接收增量数据
  5. 恢复正常通信
```

**服务端侧**：

| 操作 | 实现 |
|------|------|
| 断线检测 | 90 秒无心跳 |
| 消息缓冲 | Redis Sorted Set，score = timestamp，TTL 5 分钟 |
| 超期处理 | 客户端通过 REST API 做完整历史拉取 |
| UI 提示 | 连接状态指示器（green/yellow/red）实时反映 |

### 7.6 性能预估

| 指标 | V1 预估 | 系统容量上限 |
|------|--------|------------|
| 并发 WebSocket 连接 | 200-500 | 10,000/实例 |
| 消息推送延迟（端到端） | <200ms | <100ms（同区域） |
| 单 Gateway 实例内存 | ~200MB | ~2GB |
| Redis Pub/Sub 吞吐 | ~1K msg/sec | ~500K msg/sec |
| 水平扩展 | 1-2 Gateway 实例 | 10+ 实例 |

---

## 8. 翻译服务选型（R5）

### 8.1 需求回顾

统一会话中台对翻译服务的核心需求可以拆解为两个场景：

**入站翻译**：客户发来的消息（葡语、泰语、英语等）需要自动翻译为中文，让中文业务员快速理解客户意图。这条链路对延迟敏感，理想情况下在消息到达后 1 秒内完成翻译。

**出站翻译**：业务员用中文输入回复，系统将中文翻译为客户的首选语言后发送。出站翻译允许稍高延迟（用户可以等待 1-2 秒），但翻译质量直接影响客户体验。

关键约束条件：

- **三轨文本**：每条消息保留 `raw_text`（原文）+ `display_text`（展示文本）+ `translated_text`（译文），三者缺一不可
- **语言覆盖**：葡语（pt-BR 为主）、泰语、英语、中文为核心语言，未来可能扩展印尼语、越南语
- **语域差异**：客户消息包含大量口语、俚语、emoji，传统机器翻译经常丢失语气和情感
- **审计追踪**：每条翻译记录需要保存 provider、延迟、成本，用于后续优化决策

### 8.2 专业翻译 API 对比

| 维度 | Azure Translator | Google Cloud Translation | DeepL API |
|------|-----------------|------------------------|-----------|
| 标准定价 | $10/百万字符 | $20/百万字符 | $25/百万字符 + $5.49/月基础费 |
| 免费额度 | 200 万字符/月 | 50 万字符/月 | 50 万字符/月 |
| 平均延迟 | ~90ms（三种中最低） | ~100-150ms | ~280ms（三种中最高） |
| 语言覆盖 | 100+ 语言 | 130+ 语言 | 33 核心语言 + 143 变体 |
| 泰语质量 | ✅ 完整支持，质量稳定 | ✅ 完整支持，质量稳定 | ⚠️ 仅 quality_optimized 模式，不支持术语表和正式度控制 |
| 葡语质量 | ✅ pt-BR / pt-PT 均支持 | ✅ pt-BR / pt-PT 均支持 | ✅ **BLEU 60.4**，三种中葡语翻译质量最高 |
| 中文质量 | ✅ 简体/繁体 | ✅ 简体/繁体 | ✅ 简体中文 |
| 自定义术语表 | ✅ Custom Translator | ✅ Glossaries API | ✅ 但泰语不支持术语表 |
| 批量处理 | 1000 元素/请求 | 100KB/请求 | 文档翻译 API |
| 并发限制 | 无明确上限 | 6000 请求/分钟 | 429 频繁限流 + 退避重试 |

**关键发现**：没有一个 API 在所有语言对上都表现最优。DeepL 在葡语翻译上质量显著领先（BLEU 60.4 vs Azure ~55），但泰语支持有明显短板。Google 的语言覆盖最广，泰语质量最好，但定价是 Azure 的 2 倍。Azure 的延迟最低、定价最便宜，但中文和葡语的自然度不如 DeepL。

### 8.3 LLM 翻译对比

大语言模型正在改变翻译的成本结构。对于 IM 场景的短文本翻译，LLM 的表现值得认真评估。

| 模型 | 输入价格/百万 token | 输出价格/百万 token | TTFT 延迟 | 单条 IM 消息翻译成本* |
|------|-------------------|-------------------|----------|-------------------|
| GPT-4.1-nano | $0.10 | $0.40 | ~400ms | ~$0.000015 |
| GPT-4o-mini | $0.15 | $0.60 | ~550ms | ~$0.000022 |
| Gemini 2.5 Flash | ~$0.50 | ~$3.00 | ~420ms | ~$0.00008 |
| Claude Haiku 4.5 | ~$0.80 | ~$4.00 | ~597ms | ~$0.00014 |
| GPT-4o | $2.50 | $10.00 | ~980ms | ~$0.00055 |

*按平均 IM 消息 50 个 token（约 30-50 字）估算

**成本对比的冲击**：传统翻译 API 按字符计费，一条 100 字符的消息用 Azure 翻译约 $0.001，用 DeepL 约 $0.0025。而 GPT-4o-mini 翻译同一条消息只需 $0.000022，便宜 45-114 倍。

**质量差异**：LLM 在口语化翻译上的优势是传统 API 难以匹敌的。对于包含俚语、emoji、不规则语法的客户消息，GPT-4o-mini 能够理解上下文并产出更自然的译文。尤其在中文翻译上，LLM 的 BLEU 分数（36.8）略高于 Google Translate（35.6），在人工评估中"自然度"维度领先更明显。

**LLM 的局限**：延迟比专用 API 高（400-600ms vs 90-280ms），且输出不稳定（同一段文本多次翻译结果可能不同）。对于系统消息、固定格式文本等场景，传统 API 的确定性和速度仍然更好。

### 8.4 推荐：混合路由架构

核心思路是**根据语言对和消息类型选择最优的翻译引擎**，而不是一刀切地使用单一 provider。

```
消息进入翻译队列
       │
       ▼
┌─────────────────────────┐
│  语言检测 (Azure 免费)    │  ← Azure Detect API, ~30ms
└───────────┬─────────────┘
            │ detected_lang
            ▼
┌─────────────────────────┐
│  缓存查找 (Redis)        │  ← hash(normalized_text + lang_pair)
└───────────┬─────────────┘
            │
    ┌───────┴────────┐
    ▼                ▼
 命中缓存          未命中
    │                │
    ▼                ▼
 返回缓存译文    ┌──────────────────┐
                │  路由决策引擎      │
                └────────┬─────────┘
                         │
          ┌──────────────┼──────────────┬──────────────┐
          ▼              ▼              ▼              ▼
     PT 路由         ZH 路由         TH 路由       系统消息
          │              │              │              │
          ▼              ▼              ▼              ▼
      ┌───────┐    ┌──────────┐   ┌─────────┐   ┌────────┐
      │ DeepL │    │GPT-4o-   │   │ Google  │   │ Azure  │
      │       │    │mini      │   │Trans-   │   │Trans-  │
      │ BLEU  │    │          │   │late     │   │lator   │
      │ 60.4  │    │ 口语最优  │   │ 泰语最优 │   │ 最快   │
      └───────┘    └──────────┘   └─────────┘   └────────┘
```

**路由规则**：

| 语言对 | 消息类型 | 推荐引擎 | 理由 |
|--------|---------|---------|------|
| PT → ZH | 全部 | DeepL | BLEU 60.4，葡语翻译质量无可争议地领先 |
| ZH → PT | 全部 | DeepL | 同上，DeepL 的葡语质量双向领先 |
| ZH ↔ EN | 口语/聊天 | GPT-4o-mini | 中文口语翻译更自然，成本极低 |
| ZH ↔ EN | 正式/系统 | Azure | 确定性输出，速度最快 |
| TH ↔ ZH | 全部 | Google Translate | 泰语覆盖最完整，DeepL 泰语有明显短板 |
| ZH → 其他 | 口语/聊天 | GPT-4o-mini | 通用性好，语气保持强 |
| 系统消息 | 全部 | Azure | 成本最低（$10/百万字符），延迟最小（~90ms） |

**Fallback 策略**：每个路由配置一个备选引擎。主引擎返回错误或超时（>2 秒）时，自动切换到备选引擎。所有降级事件记录到 `translation_records` 中。

### 8.5 成本估算

按日均 100K 条翻译请求，语言分布基于业务场景估算：

| 引擎 | 占比 | 日请求量 | 月成本估算 | 计算依据 |
|------|------|---------|-----------|---------|
| DeepL（PT 路由） | 30% | 30K | ~$2,250 | $25/M 字符 × 90M 字符/月 |
| Google（TH 路由） | 25% | 25K | ~$1,500 | $20/M 字符 × 75M 字符/月 |
| GPT-4o-mini（ZH/口语） | 35% | 35K | ~$70 | $0.000022/条 × 1.05M 条/月 |
| Azure（系统/检测） | 10% | 10K | ~$300 | $10/M 字符 × 30M 字符/月 |
| Redis 缓存（基础设施） | — | — | ~$100 | 缓存节点分摊成本 |
| **合计** | **100%** | **100K** | **~$4,220** | |

### 8.6 缓存策略

三层缓存架构设计：

```
请求 → L1: 内存 LRU (命中 ~5%)
          │
          └→ L2: Redis 精确匹配 (命中 ~15-40%)
                   │
                   └→ L3: 翻译记忆模糊匹配 (命中 +10-15%)
                            │
                            └→ 未命中 → 调用翻译 API
```

| 缓存层 | 容量 | Key 格式 | TTL | 命中率 | 延迟 |
|--------|------|---------|-----|--------|------|
| L1 进程内 LRU | 10,000 条 | sha256(text + lang_pair) | LRU 淘汰 | ~5% | <1ms |
| L2 Redis | 无限 | trans:{hash}:{src}:{tgt} | 24h | 15-40% | <5ms |
| L3 翻译记忆 | PostgreSQL | 编辑距离 >85% | 永久 | +10-15% | ~50ms |

**批量处理窗口**：收集 50-100ms 内同一语言对的翻译请求，合并为一个批量 API 调用。对于 Azure 和 DeepL，批量调用可以减少 5-10 倍的 HTTP 请求次数。

---

## 9. 客户端方案评估（R6）

### 9.1 方案概述

统一 IM 会话中台的客户端需要同时满足两类用户场景：销售人员日常使用（日均 8 小时以上，需要高频收发消息、快速切换会话）和管理人员后台查看（偶尔登录，查看客户分析、翻译结果）。Electron 因其打包体积过大（150MB+）、内存占用高、跨平台兼容性差等问题已被排除。

### 9.2 方案对比

| 维度 | Tauri + Web UI | 纯 Web App | PWA |
|------|---------------|-----------|-----|
| 安装体积 | 3-8MB | 0（浏览器访问） | 0（浏览器安装） |
| 离线能力 | 完整（SQLite 本地缓存） | 无 | 有限（Service Worker 缓存） |
| 系统通知 | 原生通知 | Web Push（受限） | Web Push（受限） |
| 系统托盘 | 支持 | 不支持 | 不支持 |
| 开发效率 | 中等（需 Rust 层开发） | 最高 | 高 |
| 跨平台一致性 | 中等（WebView 差异） | 最佳 | 中等（iOS 限制多） |
| 自动更新 | 内置支持 | 即时生效 | SW 更新 |
| 文件系统访问 | 完整 | 不可用 | 不可用 |
| 内存占用 | 低（系统 WebView 共享） | 取决于浏览器 | 取决于浏览器 |
| 移动端扩展 | Tauri v2 beta 支持 | 浏览器直接访问 | 主屏安装 |

### 9.3 推荐策略：分阶段演进

**第一阶段（V1）：纯 Web App。** 目标是快速验证产品可行性，收集用户反馈。Web 方案开发最快、部署最简、零门槛使用。React 代码库作为后续所有客户端方案的基础，不会产生废弃代码。

**第二阶段：Tauri 封装。** 在 Web App 成熟后，针对高频用户（销售团队日均 8 小时使用）推出 Tauri 桌面客户端。复用同一套 React 前端代码，Tauri 壳层提供系统托盘、原生通知、本地缓存、全局快捷键等增强功能。

**选择理由：** Web App 是核心，Tauri 是增强层。同一套 React 代码同时驱动 Web 和桌面两种客户端，维护成本可控。

### 9.4 前端技术栈推荐

| 技术选型 | 具体方案 | 选择理由 |
|---------|---------|---------|
| 框架 | React 19 + TypeScript | 团队 TypeScript 技术栈，React 生态成熟 |
| 状态管理 | Zustand | 轻量（<1KB），TypeScript 友好，无模板代码 |
| UI 组件库 | shadcn/ui + Tailwind CSS | 无运行时依赖，组件源码完全可控 |
| 实时通信 | 原生 WebSocket + 自动重连 | IM 场景需要长连接，无需引入 Socket.io 等重型库 |
| 虚拟滚动 | @tanstack/virtual | 万级消息列表流畅渲染，支持动态行高 |
| 构建工具 | Vite | 开发启动毫秒级，HMR 极速 |

---

## 10. Connector 抽象设计（R7）

### 10.1 设计目标

1. 新平台 Connector 接入时，Core Layer 的任何模块不应修改
2. 平台差异在 Connector 层完全吸收
3. 平台能力差异通过声明式清单（Manifest）表达
4. 统一的事件流入格式和命令流出接口

### 10.2 与现有 UnifiedActionAPI 的关系

现有 UnifiedActionAPI 是面向群聊营销引擎设计的，包含 `isOurAgent`、`getCapabilities` 等业务特定方法。Core Layer 需要一个更偏中间件定位的接口。

策略：定义新的 `ConnectorAdapter` 接口，现有 Connector 通过适配器壳层（Adapter Shim）实现该接口，新平台 Connector 直接实现 `ConnectorAdapter`。

```
┌─────────────────────────────────┐
│          Core Layer              │
│    (依赖 ConnectorAdapter)       │
└──────────────┬──────────────────┘
               │
    ┌──────────▼──────────┐
    │  ConnectorRegistry   │
    └───┬─────────────┬───┘
        │             │
   ┌────▼────┐  ┌────▼──────────┐
   │TG Adapter│  │WA Adapter     │
   │(Adapter  │  │(Adapter Shim  │
   │ Shim)    │  │ over HTTP)    │
   └────┬─────┘  └────┬──────────┘
        │             │
   ┌────▼────┐  ┌────▼──────┐
   │TDLib    │  │Go Service │
   │Bindings │  │(:9800)    │
   └─────────┘  └───────────┘
```

### 10.3 ConnectorAdapter 接口设计

```typescript
interface ConnectorAdapter {
  // --- 身份标识 ---
  readonly platform: PlatformKind;
  readonly adapterId: string;

  // --- 生命周期 ---
  initialize(config: ConnectorConfig): Promise<void>;
  shutdown(): Promise<void>;

  // --- 连接管理 ---
  connect(accountId: string, credentials: AccountCredentials): Promise<void>;
  disconnect(accountId: string): Promise<void>;
  getConnectionStatus(accountId: string): ConnectionStatus;
  getConnectedAccounts(): string[];

  // --- 能力声明 ---
  getCapabilities(): PlatformCapabilityManifest;

  // --- 入站事件（Connector → Core）---
  on(event: 'message', handler: (evt: InboundMessageEvent) => void): void;
  on(event: 'status_change', handler: (evt: StatusChangeEvent) => void): void;
  on(event: 'participant_change', handler: (evt: ParticipantChangeEvent) => void): void;
  on(event: 'error', handler: (evt: ConnectorErrorEvent) => void): void;

  // --- 出站命令（Core → Connector）---
  sendMessage(params: SendMessageParams): Promise<SendResult>;
  sendMedia(params: SendMediaParams): Promise<SendResult>;
  deleteMessages(params: DeleteMessagesParams): Promise<void>;

  // --- 群组操作（可选，通过 Capabilities 声明）---
  createGroup?(params: CreateGroupParams): Promise<string>;
  joinGroup?(params: JoinGroupParams): Promise<string>;
  leaveGroup?(params: LeaveGroupParams): Promise<void>;

  // --- 用户解析 ---
  resolveUser(accountId: string, lookup: UserLookup): Promise<ResolvedUser | null>;
}
```

### 10.4 PlatformCapabilityManifest

| 能力 | Telegram | WhatsApp |
|-----|----------|----------|
| 私聊消息 | ✅ | ✅ |
| 群组聊天 | ✅ | ✅ |
| 创建群组 | ✅ | ❌ |
| 消息编辑 | ✅ | ❌ |
| 已读回执 | ✅ | 有限支持 |
| 输入指示器 | ✅ | ❌ |
| 邀请链接 | ✅ | ✅ |
| 消息撤回 | ✅（48h 内） | ✅ |
| 最大消息长度 | 4096 字符 | 65536 字符 |
| 最大媒体大小 | 2GB | 64MB |
| 最大群成员数 | 200,000 | 1024 |

### 10.5 统一入站事件格式

```typescript
interface InboundMessageEvent {
  eventId: string;           // Core 生成的 UUID
  receivedAt: number;        // Core 接收时间戳（毫秒）
  platform: PlatformKind;
  accountId: string;         // 接收此消息的我方账号 ID
  platformMessageId: string; // 平台原始消息 ID
  platformChatId: string;    // 平台原始聊天/群组 ID
  sender: {
    platformUserId: string;
    displayName: string;
    isInternal: boolean;     // 是否为我方账号
  };
  messageType: 'text' | 'image' | 'file' | 'audio' | 'video' | 'sticker' | 'system';
  content: string;
  contentType?: string;      // 媒体的 MIME 类型
  mediaUrl?: string;         // 媒体文件下载地址
  replyToMessageId?: string;
  isGroup: boolean;
  chatTitle?: string;
  rawPayload: unknown;       // 平台原始数据，存入 raw_events 表
}
```

### 10.6 Connector 注册与生命周期管理

- **Registry 模式**：`ConnectorRegistry.register(platform, adapterFactory)`
- **配置驱动**：connectors 在配置文件中声明，启动时实例化
- **健康检查**：每 30 秒轮询 `getConnectionStatus()`，断连自动重连（指数退避）
- **V2 预留**：支持热加载 Connector 模块（无需全量重启）

### 10.7 现有 Connector 适配策略

- **Telegram**：TS Adapter Shim 封装 TDLib bindings + UnifiedActionAPI 事件映射
- **WhatsApp**：HTTP/WebSocket 客户端 Adapter 调用 Go 服务（端口 9800）
- 两个 Adapter Shim 代码量预计各 300-500 行 TypeScript，主要工作是格式映射和错误码转换

---

## 11. 部署架构（R8）

### 11.1 方案对比

| 方案 | 优点 | 缺点 | 适用阶段 |
|------|------|------|---------|
| 单体架构 | 开发简单，调试方便 | 模块间无隔离，单点故障 | 快速验证 |
| 微服务 | 独立扩展，技术异构 | 运维复杂，分布式事务 | 大团队/高流量 |
| **模块化单体（推荐）** | 开发简单 + 架构清晰 | 需要纪律维护模块边界 | V1 最优解 |

### 11.2 推荐架构：模块化单体

```
┌─────────────────────────────────────────────────────────┐
│               IM Core（模块化单体）                        │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ API      │  │ WebSocket│  │ Event    │              │
│  │ Module   │  │ Gateway  │  │ Bus      │              │
│  │ (REST)   │  │ (实时推送)│  │ (内部事件)│              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │             │             │                      │
│  ┌────▼─────────────▼─────────────▼──────────────────┐  │
│  │              内部模块通信总线                         │  │
│  └──┬──────────┬──────────┬──────────┬──────────┬────┘  │
│     │          │          │          │          │       │
│  ┌──▼───┐  ┌──▼──────┐ ┌─▼──────┐ ┌▼────────┐ ┌▼─────┐│
│  │Msg   │  │Conver-  │ │Account │ │Translat-│ │Agent ││
│  │Core  │  │sation   │ │Core    │ │ion      │ │Facade││
│  │      │  │Core     │ │        │ │Module   │ │      ││
│  └──────┘  └─────────┘ └────────┘ └─────────┘ └──────┘│
│                     │                                    │
│              ┌──────▼──────┐                             │
│              │  Connector  │                             │
│              │  Registry   │                             │
│              └─────────────┘                             │
└─────────────────────┬────────────────────────────────────┘
                      │
        ┌─────────────┼──────────────┐
        ▼             ▼              ▼
  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │PostgreSQL│  │  Redis   │  │  MinIO   │
  │ (独立库) │  │(缓存/队列)│  │ (S3兼容) │
  └──────────┘  └──────────┘  └──────────┘
```

### 11.3 三种部署形态

| 部署方式 | 适用场景 | 数据库 | 缓存 | 对象存储 | 部署工具 |
|---------|---------|--------|------|---------|---------|
| 公有云 SaaS | 标准运营 | 托管 PostgreSQL | ElastiCache | Cloudflare R2 | Kubernetes + Helm |
| 客户私有云 | 企业交付 | 客户 PostgreSQL | 客户 Redis | 客户 S3 兼容 | Docker Compose / K8s |
| 本地机房 | 数据主权 | 内置 PostgreSQL | 内置 Redis | MinIO | 离线安装包 |

### 11.4 容器化策略

- Docker 镜像：单一镜像，基于 Node.js Alpine，<200MB
- 开发环境：Docker Compose 编排全部依赖
- 生产环境：Kubernetes Helm Chart，HPA 基于 CPU 和 WebSocket 连接数
- 健康检查：`/health`（存活）、`/ready`（就绪，含 DB/Redis/Connector 检查）

### 11.5 监控与可观测性

| 指标类别 | 具体指标 | 告警阈值 |
|---------|---------|---------|
| 消息吞吐 | messages_received_total, messages_processed_total | 处理延迟 > 5s |
| 翻译延迟 | translation_duration_seconds (P50, P95, P99) | P99 > 10s |
| Connector 状态 | connector_connected_accounts, connector_errors_total | 断连 > 3min |
| WebSocket | ws_active_connections, ws_message_queue_size | 队列积压 > 1000 |
| 系统 | process_cpu_usage, process_memory_rss, event_loop_lag | 内存 > 80% |

技术方案：Prometheus + Grafana（指标）、OpenTelemetry（分布式追踪）、JSON 结构化日志（correlation ID）。

---

## 12. 消息搜索方案（R9）

### 12.1 需求分析

- 全局搜索：跨平台、跨会话检索关键词（原文 + 译文）
- 会话内搜索：单会话历史消息检索
- 多维过滤：平台、发送者、时间范围、消息类型、语言
- 性能要求：全局搜索 P95 < 2s，会话内搜索 P95 < 500ms
- 数据规模：年消息量 ~1.8 亿条，三年保留期 ~810GB

### 12.2 方案对比

| 维度 | PostgreSQL 全文检索 | Elasticsearch | Meilisearch |
|------|-------------------|---------------|-------------|
| 额外基础设施 | 无 | 3 节点集群 + Debezium | 单实例 |
| 中文分词质量 | 中等（需 zhparser） | 优秀（IK Analyzer） | 良好（内置 jieba） |
| 10M 条查询延迟 | < 1s | < 200ms | < 300ms |
| 100M 条查询延迟 | 3-10s | < 500ms | 1-3s |
| 聚合分析 | 基础（SQL） | 丰富 | 基础 |
| 运维复杂度 | 低 | 高 | 低 |
| 内存需求 | 共享 PostgreSQL | 16GB+ | 2-4GB |
| 许可证 | PostgreSQL License | SSPL / Apache 2.0 | MIT |

### 12.3 推荐策略：分阶段演进

**V1：PostgreSQL pg_trgm + GIN 索引。** 在消息表上创建 `tsvector` 列存储分词结果，配合 GIN 索引加速检索。使用 `simple` 分词配置 + `pg_trgm` 模糊匹配覆盖多语言场景。

**V2：引入 Elasticsearch。** 当消息量超过 5000 万条或搜索质量需求提升时，通过 Debezium CDC 将 PostgreSQL 数据实时同步到 Elasticsearch。迁移路径平滑，核心搜索逻辑通过 Repository 层抽象，切换搜索引擎时上层业务代码无需修改。

---

## 13. 媒体文件存储与 CDN 策略（R10）

### 13.1 需求背景

多平台 IM 消息包含丰富的媒体附件。按日处理 50 万条消息计算，约 20% 携带媒体，日均产生约 10 万个媒体文件。文件大小分布：图片平均 200KB、视频平均 5MB、语音平均 500KB、文档平均 1MB。加权计算后，日均存储增量约 150GB，年增约 55TB。

### 13.2 存储架构设计

**对象存储为主存储**：采用 S3 兼容协议的对象存储。Bucket 路径结构：

```
/{platform}/{account_id}/{conversation_id}/{year}/{month}/{file_hash}.{ext}
```

采用文件内容哈希（SHA-256）作为文件名，天然实现去重。元数据全部存储在 PostgreSQL 的 `attachments` 表中：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| message_id | UUID | 关联消息 |
| storage_key | VARCHAR | 对象存储路径 |
| thumbnail_key | VARCHAR | 缩略图路径 |
| mime_type | VARCHAR | MIME 类型 |
| file_size | BIGINT | 文件大小（字节） |
| file_hash | CHAR(64) | SHA-256 哈希 |

**缩略图生成管线**：媒体入库时异步生成缩略图。图片使用 sharp 库（限制 300×300，WebP 格式），视频使用 ffmpeg 截取第一帧。历史数据采用懒加载策略。

### 13.3 CDN 与分发策略

| 部署形态 | 存储后端 | 缓存/CDN 方案 | 适用场景 |
|---------|---------|-------------|---------|
| 公有云 SaaS | Cloudflare R2 | Cloudflare CDN（零出口费） | 多租户、全球用户 |
| 客户私有云 | MinIO | Nginx 反向代理 + 本地缓存 | 企业内网 |
| 本地机房 | MinIO | Nginx 缓存 | 离线环境 |

**访问控制**：所有媒体文件禁止公开访问。客户端请求流程：

1. 前端请求 API：`GET /api/media/{attachment_id}/url`
2. 后端生成带签名的预签名 URL（有效期 15 分钟）
3. 前端通过签名 URL 直接从存储/CDN 拉取文件

**成本优化**：

- Cloudflare R2 零出口流量费（vs AWS S3 每月 ~$450）
- 生命周期策略：6 个月以上媒体转入低频访问存储层（成本降低 50%）
- 哈希去重预计节省 10-20% 存储空间

### 13.4 平台媒体桥接

| 平台 | 获取方式 | 时效性要求 |
|------|---------|----------|
| Telegram | TDLib `downloadFile`，传入 `file_id` | file_id 永久有效 |
| WhatsApp | 媒体 URL 携带认证 Token，HTTP GET | URL 短期有效（48h 内），必须及时下载 |
| LINE | Message API 获取消息内容 | 有一定时效限制 |

**关键设计原则**：Connector 层在收到媒体消息后，立即下载并转存至对象存储，不依赖平台原始 URL 做持久化访问。

### 13.5 实施路径

- **V1**：MinIO 自托管，Nginx 反向代理和缓存，sharp + ffmpeg 异步生成缩略图
- **V2**：SaaS 部署切换到 Cloudflare R2，接入 Cloudflare CDN
- **V3**：CDN Purge API，媒体使用量统计和成本分析看板

---

## 14. 消息回放技术方案（R11）

### 14.1 需求分析

消息回放功能将一段会话的完整历史按时间顺序"重演"。核心使用场景：

- **销售复盘**：销售主管回看团队与客户的完整对话
- **新人培训**：观摩优秀会话案例
- **质检审核**：批量审核会话质量
- **争议仲裁**：调取完整沟通记录作为凭证

需要支持：播放速度控制（1x、2x、5x、跳转）、原文与译文对照、分析标注叠加、结构化数据导出。

### 14.2 数据基础

回放系统复用已有数据模型：

- `messages` → 完整消息历史（时间戳、原文、译文、发送者）
- `raw_events` → 平台级事件（精确定时）
- `analysis_results` → 分析标注（意图、情感、阶段标记）
- `conversation_participants` → 参与者快照（谁在何时加入/离开）

### 14.3 技术架构

采用"服务端数据组装 + 客户端渲染"的分层架构。

```
┌────────────────────────────────────────────────────┐
│              客户端回放播放器（React）                │
│  ┌──────────────────────────────────────────────┐  │
│  │  时间轴滑块  [========●==================]   │  │
│  │  播放速度   ▶ 1x  ▶▶ 2x  ▶▶▶ 5x  ⏩ 跳转   │  │
│  └──────────────────────────────────────────────┘  │
│  ┌───────────────┐  ┌───────────────┐              │
│  │   原文面板     │  │   译文面板     │              │
│  └───────────────┘  └───────────────┘              │
│  ┌──────────────────────────────────────────────┐  │
│  │  分析侧栏：当前阶段 | 最近意图 | 实体高亮     │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────┬──────────────────────────────┘
                      │ REST API
┌─────────────────────▼──────────────────────────────┐
│            Replay API Endpoint                      │
│  GET /conversations/{id}/replay                     │
│       ?from=1700000000&to=1700003600                │
│                                                     │
│  响应: ReplayTimeline {                             │
│    messages: [...],       ← 按 sent_at 排序         │
│    events: [...],         ← 加入/离开/状态变更      │
│    analysisMarkers: [...],← 阶段边界、意图变化       │
│    participants: [...]    ← 各时间点的活跃参与者     │
│  }                                                  │
└─────────────────────────────────────────────────────┘
```

**ReplayTimeline 数据结构**：

```typescript
interface ReplayTimeline {
  conversationId: string;
  timeRange: { from: number; to: number };
  messages: ReplayMessage[];
  events: ReplayEvent[];
  analysisMarkers: AnalysisMarker[];
  participants: ParticipantSnapshot[];
}

interface ReplayMessage {
  id: string;
  sentAt: number;
  sender: { id: string; displayName: string; isInternal: boolean };
  rawText: string;
  translatedText: string | null;
  sourceLanguage: string;
  messageType: string;
  analysisSnapshot?: { intent?: string; sentiment?: string; entities?: string[] };
}
```

**客户端播放器**：虚拟时钟按加速后的时间间隔依次显示消息。1x 模式下间隔 30 秒就延迟 30 秒显示；5x 模式下只需 6 秒。

### 14.4 性能与优化

- **分块加载**：默认每块 200 条消息，回放到末尾时自动预取下一块
- **媒体懒加载**：默认只展示缩略图，点击后按需加载全尺寸
- **积极缓存**：回放数据不可变，Redis 缓存 TTL 1 小时

### 14.5 数据导出

| 导出格式 | 用途 | 内容范围 |
|---------|------|---------|
| JSON | 程序化消费、数据迁移 | 完整结构化数据，包含分析标注 |
| CSV | 电子表格分析、人工审查 | 扁平化消息列表 |
| 平行语料 | 翻译模型训练 | 原文+译文对照 |

导出 API：`POST /conversations/{id}/export`，支持指定格式、时间范围和字段选择。大文件导出采用异步任务。

### 14.6 实施路径

- **V1**：基础回放功能，数据组装 API + 简易播放器（按时间顺序展示，原文/译文切换）
- **V2**：完整播放器体验（速度控制、时间轴滑块、分析标注叠加、双面板对照），JSON/CSV 导出
- **V3**：平行语料导出、批量回放、回放标注（观看者添加评论标记）

---

## 15. 多语言术语表管理（R12）

### 15.1 需求背景

跨境电商和国际贸易场景中，存在大量需要统一翻译的行业术语。产品名称、品牌词、技术专有名词在不同语境下的翻译必须保持一致。术语表的作用是在机器翻译前后介入，确保关键术语的翻译始终符合业务规范。

### 15.2 数据模型

术语表设计为支持多级作用域的分层结构：

```sql
CREATE TABLE glossaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  scope VARCHAR(50) NOT NULL,       -- 'global' | 'scenario' | 'account'
  scope_id VARCHAR(255),            -- scenario_id 或 account_id
  source_language VARCHAR(10) NOT NULL,
  target_language VARCHAR(10) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE glossary_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  glossary_id UUID REFERENCES glossaries(id) ON DELETE CASCADE,
  source_term VARCHAR(500) NOT NULL,
  target_term VARCHAR(500) NOT NULL,
  context TEXT,
  case_sensitive BOOLEAN DEFAULT false,
  exact_match BOOLEAN DEFAULT true,
  priority INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(glossary_id, source_term)
);
```

作用域优先级：account > scenario > global。`priority` 字段支持同一层级内进一步排序。

### 15.3 术语应用流程

```
翻译请求进入
    │
    ▼
加载适用的术语表（按 scope 优先级合并）
    │
    ▼
预处理：扫描源文本，识别术语表中存在的术语
    │
    ▼
调用翻译引擎
    │
    ├── DeepL / Google：通过 Glossary API 传入术语约束
    ├── LLM (GPT-4o-mini)：在 system prompt 中注入术语列表
    └── Azure：通过 Custom Dictionary 传入
    │
    ▼
后处理校验：检查译文中的术语是否正确，未正确替换的强制字符串替换
    │
    ▼
返回最终译文
```

### 15.4 与翻译服务的集成细节

| 翻译服务 | 原生术语表支持 | 集成方式 | 限制与注意事项 |
|---------|-------------|---------|-------------|
| DeepL | ✅ Glossary API | 请求时传入 `glossary_id` | 泰语不支持术语表功能 |
| Google Translate | ✅ Custom Glossary | 通过 AutoML Translation 配置 | 需预先创建 glossary 资源 |
| Azure Translator | ⚠️ 有限支持 | Custom Dictionary | 需训练自定义模型 |
| LLM (GPT/Claude) | ❌ 无原生支持 | System prompt 注入 | 术语量大时占用 context window |

实际策略：对于支持原生术语表 API 的服务（DeepL、Google），优先使用原生接口；对于不支持的服务（LLM），采用 prompt 注入 + 后处理双重保障。

### 15.5 管理功能设计

- **CRUD 操作**：术语表和术语条目的增删改查，支持批量操作
- **批量导入**：支持 CSV / Excel 文件上传，列格式为 `source_term, target_term, context`
- **批量导出**：下载指定术语表为 CSV 文件
- **变更历史**：记录每次术语修改，支持回溯到历史版本
- **冲突检测**：当同一源术语在重叠的作用域中存在不同翻译时，系统发出警告
- **使用统计**：追踪高频术语的使用次数

### 15.6 推荐实施路径

- **V1**：仅支持全局术语表（scope = global），术语注入方式为 LLM prompt 注入 + 后处理字符串替换，CSV 文件导入，无管理 UI
- **V2**：增加按业务场景（scenario）和账号（account）的作用域术语表，接入 DeepL Glossary API，开发管理后台 UI
- **V3**：从历史会话中自动提取高频术语候选，引入翻译记忆（Translation Memory）机制

---

## 16. 总结与推荐决策矩阵

### 16.1 核心决策总览

| 决策项 | 推荐方案 | 备选方案 | 决策理由 |
|-------|---------|---------|---------|
| R1 后端技术栈 | TypeScript (Bun) | Go / 混合 | 团队生产力优先；V1 消息量在 TS 能力范围内；前后端共享类型定义 |
| R2 开源框架 | 不直接使用，借鉴设计模式 | — | Matrix AS 架构借鉴桥接设计，OpenIM 借鉴消息模型和微服务拆分 |
| R3 消息存储 | PostgreSQL 分区表 | — | ACID 保证消息顺序，JSONB 灵活存储，原生分区支持 |
| R4 实时推送 | WebSocket + Redis Pub/Sub | NATS | 浏览器原生支持，Redis 已在技术栈中 |
| R5 翻译服务 | 混合架构（DeepL PT + GPT-4o-mini ZH + Google TH + Azure 系统） | 全 LLM / 全 Azure | 按语言对路由，质量与成本最优平衡 |
| R6 客户端 | Web App 优先，后续 Tauri 增强 | PWA | 最快交付，验证产品后再加原生体验 |
| R7 Connector 抽象 | ConnectorAdapter 接口 + 适配器模式 | — | 兼容现有 UnifiedActionAPI，支持新平台即插即用 |
| R8 部署架构 | 模块化单体 | 微服务 | V1 团队规模和消息量不需要微服务复杂度 |
| R9 消息搜索 | V1: pg_trgm，V2: Elasticsearch | Meilisearch | 渐进式方案，避免过早引入额外基础设施 |
| R10 媒体存储 | MinIO (S3兼容) + Nginx 缓存 | Cloudflare R2 | 支持三种部署形态，V2 加 CDN |
| R11 消息回放 | 服务端数据组装 + 客户端渲染 | — | 利用已有数据模型，React 组件可复用 |
| R12 术语表 | V1: 全局术语表 + LLM prompt 注入 | DeepL Glossary API | 最简实现，V2 再集成专业 API |

### 16.2 技术栈全景图

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer                              │
│    React 19 · TypeScript · Zustand · shadcn/ui · Tailwind    │
│   ┌────────────┐   ┌────────────┐   ┌─────────────┐         │
│   │  销售工作台  │   │   管理后台  │   │  Tauri(V2)  │         │
│   └────────────┘   └────────────┘   └─────────────┘         │
└──────────────────────────┬──────────────────────────────────┘
                           │ WebSocket + REST API
┌──────────────────────────▼──────────────────────────────────┐
│                   IM Core · TypeScript / Bun                 │
│                      模块化单体架构                            │
│                                                               │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌────────────┐    │
│  │    API   │ │    WS    │ │  Message  │ │ Translation│    │
│  │  Gateway │ │  Gateway │ │   Core    │ │   Module   │    │
│  └──────────┘ └──────────┘ └───────────┘ └────────────┘    │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌────────────┐    │
│  │Convers.  │ │ Account  │ │ Analysis  │ │   Agent    │    │
│  │  Core    │ │  Core    │ │  Adapter  │ │   Facade   │    │
│  └──────────┘ └──────────┘ └───────────┘ └────────────┘    │
│                                                               │
│              ─ ─ Event Bus（内部事件总线）─ ─                  │
│              ─ ─ Connector Registry（连接器注册表）─ ─        │
└────┬────────────────┬─────────────────┬──────────────┬──────┘
     │                │                 │              │
     ▼                ▼                 ▼              ▼
┌──────────┐   ┌──────────┐     ┌──────────┐   ┌──────────┐
│    TG    │   │    WA    │     │   LINE   │   │  Future  │
│Connector │   │Connector │     │Connector │   │Connector │
│ (TDLib)  │   │(Go:9800) │     │  (待建)   │   │          │
└──────────┘   └──────────┘     └──────────┘   └──────────┘
     │                │                 │
┌─────▼────────────────▼─────────────────▼────────────────────┐
│                        Storage Layer                          │
│  ┌──────────────┐  ┌───────┐  ┌────────────┐  ┌──────────┐ │
│  │  PostgreSQL  │  │ Redis │  │   MinIO    │  │Raw Events│ │
│  │  (分区表)    │  │Cache  │  │  (S3兼容)  │  │ Archive  │ │
│  └──────────────┘  └───────┘  └────────────┘  └──────────┘ │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                  外部业务消费方 (via Agent Facade)            │
│   ┌────────────┐    ┌────────────┐    ┌────────────┐       │
│   │ 群聊营销引擎│    │私聊客服(未来)│    │客户运营(未来)│       │
│   └────────────┘    └────────────┘    └────────────┘       │
└──────────────────────────────────────────────────────────────┘
```

### 16.3 V1 交付范围

V1 的核心目标是跑通最小闭环：消息收发 → 存储 → 翻译 → 工作台展示。

**包含**：
- IM Core：Message Core + Conversation Core + Account Core
- Translation：混合路由架构，按语言对分发
- Connector：TG 适配器（封装 TDLib）+ WA 适配器（封装 Go 服务）
- Client：Web App（销售工作台，会话列表、消息详情、翻译开关、媒体预览）
- Storage：PostgreSQL 分区表、Redis 缓存与 Pub/Sub、MinIO 媒体存储
- Agent Facade：基础事件发布（message.received、message.translated）

**明确不在 V1 范围内**：
- Elasticsearch 全文搜索
- Tauri 桌面客户端
- LINE Connector
- 高级术语表管理（作用域、管理 UI）
- 完整回放播放器（速度控制、分析叠加、导出）

### 16.4 风险识别与缓解

| 风险项 | 影响程度 | 发生概率 | 缓解措施 |
|-------|---------|---------|---------|
| Bun 生态不够成熟 | 高 | 中 | 保持 Node.js 兼容性作为回退方案 |
| 翻译成本超预期 | 中 | 高 | 翻译结果缓存（24h）；GPT-4o-mini 作为低成本兜底 |
| Tauri WebView 跨平台差异 | 中 | 低 | V1 先专注 Web App；Tauri 在 V2 作为增强项 |
| Connector 接口变更 | 高 | 中 | Adapter 模式隔离变更，Core 层不感知 |
| 消息量增长超预期 | 高 | 低 | 分区策略在架构层面预留；归档方案提前设计 |

### 16.5 实施路线图与下一步行动

**第一阶段：环境搭建与技术验证（1-2 周）**

初始化项目仓库，搭建 Bun + TypeScript 开发环境。部署 PostgreSQL（配置分区策略）、Redis、MinIO 三个基础服务。编写数据库 migration 脚本，建立核心表结构。完成 TDLib binding 在 Bun 环境下的可行性验证。

**第二阶段：核心链路开发（4-6 周）**

按照消息链路的顺序逐步推进：Connector 基础框架 → Telegram 适配器 → Message Core 消息收发 → 翻译模块集成 → WebSocket 实时推送 → Web 前端工作台。每个环节完成后立即编写集成测试。

**第三阶段：集成测试与优化（2-3 周）**

端到端链路测试：从 Telegram/WhatsApp 收到消息，到工作台展示译文，全链路跑通。性能压测：模拟目标消息量，验证存储、翻译、推送各环节的吞吐量。修复测试中发现的问题。

**第四阶段：交付与上线（1-2 周）**

编写部署文档和运维手册。配置生产环境（根据客户部署形态选择 MinIO 或 R2）。数据迁移（如有历史数据需要导入）。上线观察与问题修复。

**总预计工期**：8-13 周，视团队规模和需求变化调整。建议在第二阶段结束时进行一次里程碑评审，确认核心架构方向正确后再投入第三阶段的优化工作。

---

**文档结束**

