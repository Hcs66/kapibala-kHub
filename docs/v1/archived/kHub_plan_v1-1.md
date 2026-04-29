# kHub V1 实施计划

---

## 1. 文档信息

| 项目 | 内容 |
|------|------|
| 文档标题 | kHub V1 实施计划（自建 IM Core 方案） |
| 版本 | v1.1 |
| 日期 | 2026-04-27 |
| 状态 | 初稿 |
| 前序文档 | 无（本文为自包含版本） |
| 变更说明 | 基于反馈（2026-04-25）和底座重新评估，放弃 Matrix Homeserver 底座，回到自建 IM Core 路线，按 6 条核心需求重组方案并补齐可见性、搜索、导出、多消费方、三种部署形态翻译支持 |

---

## 2. 待对齐事项（进入 Phase 1 前必须确认）

以下事项在本文档中给出了建议方案，但需要业务方拍板后才能锁定。

### 2.1 需要业务确认

| # | 事项 | 本文档建议 | 需要确认的内容 |
|---|------|----------|--------------|
| 1 | **本地机房翻译方案** | V1 提供 NLLB-200 本地引擎作为降级方案（§6.4） | 三选一：(a) 客户接受 LLM 出网 (b) V1 提供 NLLB-200 (c) V1 不支持纯离线部署。建议选 (b) |
| 2 | **工作台用户角色** | V1 先做销售 + 管理员两种角色（§9） | 是否需要更细粒度角色（主管、质检员）？ |
| 3 | **群聊营销引擎迁移时间表** | V1 兼容并存，V2 切完（§6.5） | 是否接受 V1 期间群聊引擎仍直连 Connector？ |

---

## 3. 底座选型结论：Matrix 路线 vs 自建 Core 路线

本节仅保留决策结论与对后续实施有直接影响的摘要。

### 3.1 结论

**放弃 Matrix Homeserver 底座，采用自建 IM Core。**

Matrix 的 event-sourced 联邦房间模型与我们当前业务侧新增补齐的 6 条核心需求存在架构级冲突：

| 核心需求 | Matrix 路线的冲突点 |
|---------|------------------|
| 动态可见性控制 + 撤销路径 | `/sync` 订阅模型决定同房间成员看到同一份事件内容，无法原生做 per-viewer 投影 |
| 跨平台跨会话搜索 | Matrix 原生消息查询是单房间分页，不适合原文 + 译文的全局搜索 |
| 训练数据导出 | 原文在 Matrix、译文/分析在业务库，跨数据源 join 成本过高 |
| 多消费方接入 | 工作台、Agent、营销引擎若都要双通道消费 Matrix + kHub，会直接破坏统一 Facade |

### 3.2 从 Matrix 借鉴保留的设计模式

不直接使用 Matrix，但保留其经过生产验证的桥接与事件组织思路。

| 借鉴来源 | 借鉴内容 | 在 kHub 中的应用 |
|---------|---------|----------------|
| Matrix AS 架构 | 外部进程注册命名空间 + 批量事件推送 | ConnectorRegistry + ConnectorAdapter 注册机制 |
| Matrix AS Transaction | 批量、指数退避、幂等性 | BullMQ 投递与重试策略 |
| mautrix bridgev2 | 统一 Connector 接口、状态管理、消息转换管道 | ConnectorAdapter 接口与 Adapter Shim |
| OpenIM MsgData | 平台消息 ID 去重 + 会话内序号 | `platform_msg_id` + `conversation_seq` 双序组织 |
| Tinode Topic ACL | 细粒度 ACL | per-viewer × per-conversation 白名单式可见性策略 |

---

## 4. 项目定位与技术栈

### 4.1 项目定位

kHub 是面向业务系统和开发者的 IM 数据中台，解决“消息从哪来、怎么存、如何用”。

**核心用户：**

- **销售员**：在工作台中处理跨平台会话，看翻译后的消息和分析结果
- **管理员**：监控账号、审计会话、导出数据、分配任务、控制客户资料可见性

**V1 核心目标：** 跑通最小闭环——消息收发 → 存储 → 翻译 → 工作台展示，同时补齐动态可见性控制、跨会话搜索、训练导出、多消费方接入和三种部署形态翻译支持。

### 4.2 关键技术决策

| 决策项 | 选定方案 | 备选方案 | 决策来源 |
|-------|---------|---------|---------|
| 后端语言 | TypeScript | — | 团队主栈与共享类型优先 |
| 运行时 | Node.js 20 LTS（Plan A）/ Bun 1.1+（Plan B） | — | Phase 1 验证后确认 |
| 后端框架 | Fastify（Node.js）/ Elysia（Bun） | — | 取决于运行时 |
| ORM | Drizzle ORM | — | 类型安全 + migration 友好 |
| 数据库 | PostgreSQL 14+（统一存储） | — | 统一消息、翻译、分析、导出、可见性 |
| 缓存/队列 | Redis 6.2+（Pub/Sub + BullMQ） | — | 缓存、推送 fan-out、异步任务 |
| 对象存储 | MinIO（S3 兼容） | Cloudflare R2（V2 SaaS） | 支持三种部署形态 |
| 实时推送 | WebSocket + Redis Pub/Sub | — | 浏览器原生双向通信 |
| 前端框架 | React 19 + TypeScript | — | 生态成熟 |
| 状态管理 | Zustand | — | 轻量、TypeScript 友好 |
| UI 组件库 | shadcn/ui + Tailwind CSS | — | 组件源码可控 |
| 构建工具 | Vite | — | 启动快、HMR 快 |
| 虚拟滚动 | @tanstack/virtual | — | 万级消息列表渲染 |
| 部署架构 | 模块化单体 | 微服务 | V1 复杂度最优 |
| 监控 | Prometheus + Grafana + OpenTelemetry | — | 指标、追踪、告警齐全 |
| IM 底座 | **自建 IM Core** | ~~Matrix Homeserver~~ | 重新评估后定稿 |

---

## 5. 核心架构

### 5.1 总体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer                              │
│    React 19 · TypeScript · Zustand · shadcn/ui · Tailwind    │
│   ┌────────────┐   ┌────────────┐   ┌─────────────┐         │
│   │  销售工作台  │   │   管理后台  │   │  Tauri(V2)  │         │
│   └────────────┘   └────────────┘   └─────────────┘         │
└──────────────────────────┬──────────────────────────────────┘
                           │ WebSocket + REST API（唯一数据源）
┌──────────────────────────▼──────────────────────────────────┐
│              IM Core · TypeScript · 模块化单体                │
│                                                               │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌────────────┐    │
│  │    API   │ │    WS    │ │  Message  │ │ Translation│    │
│  │  Gateway │ │  Gateway │ │   Core    │ │   Module   │    │
│  └──────────┘ └──────────┘ └───────────┘ └────────────┘    │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌────────────┐    │
│  │Convers.  │ │ Account  │ │ Analysis  │ │   Agent    │    │
│  │  Core    │ │  Core    │ │  Adapter  │ │   Facade   │    │
│  └──────────┘ └──────────┘ └───────────┘ └────────────┘    │
│  ┌──────────┐ ┌──────────────────────────────────────┐      │
│  │Visibility│ │         Event Bus                     │      │
│  │ Control  │ │  EventEmitter(L1) + BullMQ(L2)       │      │
│  └──────────┘ └──────────────────────────────────────┘      │
│              ─ ─ Connector Registry ─ ─                      │
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
│  │  (统一存储)  │  │Cache  │  │  (S3兼容)  │  │ Archive  │ │
│  └──────────────┘  └───────┘  └────────────┘  └──────────┘ │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│              外部业务消费方 (via Agent Facade)                │
│   ┌────────────┐    ┌────────────┐    ┌────────────┐       │
│   │ 群聊营销引擎│    │私聊客服(未来)│    │客户运营(未来)│       │
│   └────────────┘    └────────────┘    └────────────┘       │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 关键点

- 所有消息、译文、分析、搜索、导出和可见性策略统一落在 PostgreSQL
- 前端只对接 kHub 一个数据源
- 新增 Visibility Control 模块，所有业务员视图都经过服务端投影
- Event Bus 采用 `EventEmitter(L1) + BullMQ(L2)`，兼顾低延迟与可恢复任务

### 5.3 核心消息链路

**入站链路：**

```
外部 IM 平台（TG/WA）
  → Connector（TDLib / Go:9800，已有）
  → UnifiedActionAPI v5 onMessage 事件
  → ConnectorAdapter（转换为 InboundMessageEvent）
  → 写入 raw_events（原始事件存档）
  → Message Core 持久化（写入 messages，分配 conversation_seq）
  → Event Bus 发布 message.received
  → Translation Module（语言检测 → 路由决策 → 翻译 → 写入 translation_records → 更新 messages.translated_text）
  → Event Bus 发布 message.translated
  → Analysis Adapter（推送给已有分析层 → 回写 analysis_results）
  → Event Bus 发布 message.analyzed
  → WebSocket Gateway 推送给订阅客户端（经过 ViewProjector 脱敏）
  → Agent Facade 推送给外部消费方（经过消费方视图投影）
```

**出站链路：**

```
销售员在工作台输入中文消息
  → POST /api/messages/draft
  → 可选：AI 优化建议
  → 可选：术语表修正
  → 出站翻译（中文 → 客户语言）
  → 写入 translation_records（direction=outbound）
  → 写入 messages（raw_text=中文原文, translated_text=译文, display_text=实际发送文本）
  → ConnectorAdapter.sendMessage()（发送译文）
  → Connector 转发到外部平台
  → 发送结果回写 messages.status
  → Event Bus 发布 message.sent
  → WebSocket 推送发送状态
```

### 5.4 Event Bus 分层

| 层级 | 技术 | 用途 |
|------|------|------|
| L1 进程内同步 | Node.js EventEmitter（typed-emitter） | 模块间零延迟通信 |
| L2 异步任务队列 | BullMQ（基于 Redis） | 翻译、分析、导出、过期回收、可靠投递 |

V1 不引入 Kafka/NATS。以当前峰值约 350 msg/min 的消息量，Redis + BullMQ 足够支撑。

---

## 6. 核心功能方案

本章按反馈中的 6 条核心需求重组，统一使用 **需求 → 方案 → 说明** 的表达方式。

### 6.1 动态可见性控制（含撤销路径）

#### 需求

- 管理台可按 **业务员/角色 × 客户/会话** 动态控制真实姓名、手机号、平台用户名、头像等敏感字段是否可见
- 默认未授权即全部脱敏
- 切换必须实时生效，且支持到期自动回收
- 脱敏必须发生在服务端，客户端不得接触未授权字段
- 所有授权、撤销、过期、修改动作必须可审计

#### 方案

1. 数据层新增 `visibility_policies` 和 `visibility_audit_log`
2. 管理端授予/撤销时：
   - 写入 `visibility_policies`
   - 写入 `visibility_audit_log`
   - 发布 `visibility.changed`
3. API Gateway 与 WS Gateway 在响应业务员数据前统一经过 **ViewProjector**
4. ViewProjector 从 Redis 缓存读取该 viewer 的有效策略；缓存失效由 `visibility.changed` 事件触发
5. 定时任务每分钟扫描即将过期的策略并回收，写审计日志后再次发布 `visibility.changed`

#### ViewProjector 中间件

```typescript
后续补充
```


#### 定时回收链路

1. 查询 `expires_at <= now() + 1min AND revoked_at IS NULL`
2. 更新 `revoked_at = now()`
3. 写入 `visibility_audit_log`，动作记为 `expire`
4. 发布 `visibility.changed`
5. 前端收到后清除缓存并重拉会话/客户数据

#### 说明

- 脱敏采用**白名单模式**：默认只暴露匿名 ID、标签、阶段、译文和必要业务字段
- 销售前端任何缓存都不是可信边界，可信边界只在服务端投影层
- 审计日志既服务追责，也服务后续合规证明

### 6.2 跨平台跨会话全文搜索

#### 需求

- 搜索范围必须跨平台、跨账号、跨会话
- 必须支持 **原文 + 译文** 双轨搜索
- 需支持平台、发送者、时间范围、消息类型、语言等过滤
- 目标性能：全局搜索 P95 < 2s，会话内搜索 P95 < 500ms

#### 方案

V1 采用 **PostgreSQL `pg_trgm` + GIN 双索引**，在 `messages` 上同时覆盖 `raw_text` 与 `translated_text`。

设计点：

1. 原文与译文统一在同一张 `messages` 表
2. 搜索 Repository 同时对 `raw_text` 和 `translated_text` 建检索路径
3. 会话内分页采用 `conversation_seq`，全局搜索分页采用时间 + 主键游标
4. 管理端和销售端共享同一搜索后端，但销售端结果仍经过可见性投影

#### V2 演进

当消息量超过 5000 万条或搜索质量要求提升时，引入 Elasticsearch，并通过 Debezium CDC 将 PostgreSQL 消息变更实时同步到 ES。业务代码通过 Repository 抽象屏蔽底层检索引擎切换。

#### 说明

- V1 不急于引入额外搜索集群，先利用 PostgreSQL 的统一存储优势
- 搜索之所以在自建 Core 路线下变简单，关键就在于不再跨 Matrix / 业务库做 join 和索引同步

### 6.3 训练数据 / 平行语料导出

#### 需求

- 支持按时间段、账号、客户、平台、语言等多维过滤
- 输出两类核心资产：平行语料和结构化对话
- 导出任务必须异步执行，支持大文件和进度通知

#### 方案

1. 管理员提交导出请求，写入 `export_tasks`
2. BullMQ 创建 `export.process` 任务
3. Export Worker 流式执行 SQL，组装 `messages + translation_records + analysis_results + conversation_aliases`
4. 序列化为 TSV / JSON / CSV
5. 写入 MinIO 临时 bucket，回写 `export_tasks`
6. WebSocket 通知管理员，管理员再用预签名 URL 下载

#### 导出格式

| 格式 | 用途 | 结构 |
|------|------|------|
| 平行语料 TSV | 翻译模型微调 | `source_lang\ttarget_lang\traw_text\ttranslated_text\tconversation_id\tsent_at` |
| 结构化 JSON | 销售 agent 训练 | 完整对话结构，含分析标注、参与者、阶段标记 |
| CSV | 人工审查 | 扁平化消息列表 |

#### 导出链路

```
管理员提交导出请求
  → POST /api/exports
  → 创建 export_tasks（status=pending）
  → BullMQ 入队（export.process）
  → Export Worker：
      1. 根据 filters 构建 SQL
      2. 流式读取（cursor-based）
      3. 序列化为 TSV / JSON / CSV
      4. 写入 MinIO 临时 bucket
      5. 更新 export_tasks（status=completed, result_file_key, row_count）
  → WebSocket 通知管理员
  → 管理员通过预签名 URL 下载（有效期 24h）
```

#### 核心 SQL

```sql
后续补充
```

#### 说明

- 训练导出是项目立项价值链上的核心能力，不是附属功能
- 统一存储直接消除了原文、译文、分析、匿名映射跨系统 join 的结构性问题

### 6.4 三种部署形态翻译支持

#### 需求

V1 必须同时支持：

- 公有云 SaaS
- 客户私有云
- 客户本地机房

且三种部署形态都必须具备可用的翻译能力，本地机房不能因为不能出网就失去中台核心价值。

#### 方案

采用 **混合路由 + 本地 NLLB-200 降级**。

**云端混合路由：**

| 语言对 | 推荐引擎 | 备选引擎 | 理由 |
|--------|---------|---------|------|
| PT-BR ↔ ZH | DeepL | Gemini Flash | BLEU 60.4，葡语质量领先 |
| VI ↔ ZH | Google Translate | Gemini Flash | 越南语覆盖完整、质量稳定 |
| ZH ↔ EN（口语） | GPT-4o-mini | Gemini Flash | 中文口语更自然 |
| ZH ↔ EN（正式） | Azure Translator | Gemini Flash | 确定性输出，速度快 |
| TH ↔ ZH | Google Translate | Gemini Flash | 泰语覆盖最完整 |
| 系统消息 | Azure Translator | Gemini Flash | 成本低，延迟小 |
| 语言检测 | Azure Detect | Gemini 内置 | 免费，不占翻译字符 |
| 本地机房降级 | NLLB-200 | Marian NMT | 离线可用，200+ 语言 |

#### 混合路由链路

```
消息进入翻译队列
       │
       ▼
┌─────────────────────────┐
│  语言检测 (Azure 免费)    │
└───────────┬─────────────┘
            │ detected_lang
            ▼
┌─────────────────────────┐
│  缓存查找 (Redis)        │
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
          ┌──────────────┼──────────────┬──────────────┬──────────────┐
          ▼              ▼              ▼              ▼              ▼
     PT 路由         VI 路由         ZH 路由         TH 路由       系统消息
          │              │              │              │              │
          ▼              ▼              ▼              ▼              ▼
      ┌───────┐    ┌─────────┐   ┌──────────┐   ┌─────────┐   ┌────────┐
      │ DeepL │    │ Google  │   │GPT-4o-   │   │ Google  │   │ Azure  │
      │ BLEU  │    │Trans-   │   │mini      │   │Trans-   │   │Trans-  │
      │ 60.4  │    │late     │   │ 口语最优  │   │late     │   │lator   │
      └───────┘    └─────────┘   └──────────┘   └─────────┘   └────────┘
```

#### 本地机房切换逻辑

1. 配置 `translation.mode: 'cloud' | 'local' | 'hybrid'`
2. `cloud`：全部走云端 API（公有云/私有云默认）
3. `local`：全部走 NLLB-200（本地机房默认）
4. `hybrid`：优先云端，超时或失败后降级到本地模型

#### 说明

- 本地机房不是特殊需求，而是 V1 的正式交付形态之一
- Phase 1 必须补做 PT-BR 与 VI 的 NLLB-200 质量基线测试

### 6.5 多消费方接入

#### 需求

kHub 不只是销售工作台后端，还必须成为多个业务消费方的统一入口：

- V1：销售工作台、管理端
- V1+：群聊营销引擎
- 未来：私聊客服 Agent、客户运营 Agent、客户画像模块

不同消费方订阅的事件、调用的命令、能看到的数据视图都不同。

#### 方案

引入 **Agent Facade** 作为唯一标准对外接口：

1. 所有消费方只对接 kHub，不直接接 Connector
2. 事件通过统一目录暴露
3. 不同消费方在 Facade 层做视图投影
4. 群聊营销引擎按阶段迁移，V1 兼容并存，V2 完成切换

#### 事件目录（V1）

| 事件名 | 触发时机 | 消费方 |
|--------|---------|--------|
| `message.received` | 入站消息持久化后 | Translation Module、Analysis Adapter、Agent Facade |
| `message.translated` | 翻译完成后 | WebSocket、Agent Facade |
| `message.analyzed` | 分析结果回写后 | WebSocket、Agent Facade |
| `message.sent` | 出站发送结果确认后 | WebSocket、Analysis Adapter |
| `conversation.updated` | 会话状态变更 | WebSocket、Agent Facade |
| `account.status_changed` | 账号连接状态变化 | WebSocket（管理端） |
| `visibility.changed` | 可见性策略变更 | WebSocket（受影响业务员） |

#### 消费方视图投影

| 消费方 | 可见字段 | 不可见字段 |
|--------|---------|----------|
| 销售工作台 | 受 `visibility_policies` 控制 | 未授权的真实身份字段 |
| 管理端 | 全部字段 | 无 |
| 群聊营销引擎 | 消息内容、会话 ID、平台信息 | 客户真实身份 |
| 客户画像 LLM（未来） | 消息内容、分析结果 | 客户真实身份 |

#### 群聊营销引擎迁移路径

| 阶段 | 状态 | 说明 |
|------|------|------|
| V1 | 兼容并存 | 营销引擎继续直连 Connector，kHub 独立运行，通过 UnifiedActionAPI 共享 Connector |
| V1+ | 双写过渡 | 营销引擎开始订阅 Agent Facade，同时保留直连 Connector 作为 fallback |
| V2 | 完全切换 | 营销引擎仅通过 Agent Facade 接入 |

#### 说明

- Agent Facade 的价值不只是“统一事件格式”，更是“统一视图与权限边界”
- 只要多消费方成立，前端或业务系统都不应再直接绑定底层平台协议

### 6.6 消息收发 → 存储 → 翻译 → 展示（基础闭环）

#### 需求

无论功能如何扩展，V1 都必须先保证基础闭环稳定：

- 收到多平台消息
- 统一存储与排序
- 自动翻译
- 实时推送到工作台
- 销售端可发消息并看到状态

#### 方案

**入站闭环**：Connector → Adapter → `raw_events` → `messages` → 翻译 → 分析 → 推送

**出站闭环**：工作台输入 → 出站翻译 → `messages` → ConnectorAdapter.sendMessage() → 平台回执 → 推送状态

#### 翻译缓存策略

采用三层缓存：

```text
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
| L1 进程内 LRU | 10,000 条 | `sha256(text + lang_pair)` | LRU 淘汰 | ~5% | <1ms |
| L2 Redis | 无限 | `trans:{hash}:{src}:{tgt}` | 24h | 15-40% | <5ms |
| L3 翻译记忆 | PostgreSQL | 编辑距离 >85% | 永久 | +10-15% | ~50ms |

**批量处理窗口**：收集 50-100ms 内同一语言对请求，合并为批量 API 调用，减少 5-10 倍 HTTP 请求数。

#### 术语表应用流程

```text
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

#### 说明

- 基础闭环是所有扩展能力的下限，没有这条闭环就谈不上工作台价值
- 术语表和缓存策略直接决定业务体验与翻译成本，不能放到后期再补结构

---

## 7. Connector Adapter 设计

### 7.1 设计目标

1. 新平台 Connector 接入时，Core Layer 的任何模块不应修改
2. 平台差异在 Connector 层完全吸收
3. 平台能力差异通过声明式清单表达
4. 统一的事件流入格式和命令流出接口

### 7.2 与现有 UnifiedActionAPI 的关系

现有 UnifiedActionAPI 是为群聊营销引擎设计的，包含 `isOurAgent`、`getCapabilities` 等偏业务的方法。kHub Core 需要更中间件化的抽象层。

策略：定义新的 `ConnectorAdapter` 接口，现有 Connector 通过 **Adapter Shim** 实现；新平台直接实现该接口。

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

### 7.3 `ConnectorAdapter` 接口

> 最终实现待详细设计

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

### 7.4 PlatformCapabilityManifest

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

### 7.5 `InboundMessageEvent` 统一入站事件格式

> 最终实现待详细设计

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

### 7.6 Connector 注册、生命周期与 V1 范围裁剪

**注册与生命周期：**

- `ConnectorRegistry.register(platform, adapterFactory)`
- connectors 通过配置声明，启动时实例化
- 每 30 秒轮询 `getConnectionStatus()` 做健康检查
- 断连自动重连，重试采用指数退避
- V2 预留热加载能力

**现有 Adapter 适配策略：**

| Connector | 适配方式 | 预估代码量 |
|-----------|---------|----------|
| Telegram (TDLib) | TS Adapter Shim 封装 TDLib bindings + UnifiedActionAPI 事件映射 | ~300-500 行 TS |
| WhatsApp (Go:9800) | HTTP/WebSocket 客户端 Adapter 调用 Go 服务 | ~300-500 行 TS |

**V1 范围裁剪：**

| 功能 | V1 | V1.5 | 说明 |
|------|-----|------|------|
| 文本消息收发 | ✅ | — | 核心功能 |
| 图片收发 | ✅ | — | 核心功能 |
| 连接状态监控 | ✅ | — | 账号在线/离线/异常 |
| 去重/幂等 | ✅ | — | `platform_msg_id` UNIQUE |
| 视频/音频/文件 | ❌ | ✅ | 媒体处理复杂度高 |
| 消息撤回 | ❌ | ✅ | 跨平台语义差异大 |
| 消息编辑 | ❌ | ✅ | WA 不支持编辑 |
| 已读回执 | ❌ | ✅ | 平台支持度不一 |
| 输入指示器 | ❌ | ✅ | 非核心功能 |

---

## 8. 实时推送与客户端同步

### 8.1 WebSocket 协议设计

```text
消息帧格式 (JSON):

服务端 → 客户端:
{
  "type": "message.new" | "message.translated" | "message.edited" |
          "typing" | "read" | "analysis.update" | "presence" |
          "sync" | "error",
  "data": { ... },
  "seq": 12345,
  "ts": 1700000000000
}

客户端 → 服务端:
{
  "type": "message.send" | "typing" | "read.ack" | "sync.request" |
          "ping",
  "data": { ... },
  "client_seq": 678
}
```

### 8.2 心跳机制

- 客户端每 30 秒发送一次 `ping`
- 服务端回复 `pong`
- 连续 3 次 ping 无响应（90 秒）即判定断连
- 判定断连后进入客户端重连流程，并在服务端释放连接上下文

### 8.3 多客户端同步

业务员可能同时打开浏览器、Tauri 客户端或多个设备，需保证同一会话视图一致。

**同步模型：**

- 每个客户端本地维护 `last_sync_seq`（per conversation）
- 建连或重连时发送 `sync.request`，携带各会话 `last_sync_seq`
- 服务端返回所有 seq 更大的消息，完成增量同步
- 若落后过多（>1000 条），服务端返回摘要 + 最近 100 条，客户端按需补拉历史

**冲突解决：**

服务端 `conversation_seq` 是唯一顺序权威。客户端本地顺序仅用于乐观展示，收到服务端结果后必须按服务端序号回放。

### 8.4 断线重连策略

```text
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
  3. 发送 sync.request（各会话 last_sync_seq）
  4. 接收增量数据
  5. 恢复正常通信
```

**服务端补偿：**

| 操作 | 实现 |
|------|------|
| 断线检测 | 90 秒无心跳 |
| 消息缓冲 | Redis Sorted Set，score = timestamp，TTL 5 分钟 |
| 超期处理 | 客户端通过 REST API 拉完整历史 |
| UI 提示 | 连接状态指示器（green/yellow/red） |

---

## 9. 客户端工作台

### 9.1 销售工作台

V1 销售工作台交付以下能力：

- 会话列表：按账号、平台、未读、最近消息排序
- 消息详情：原文/译文切换、发送状态、引用关系
- 动态可见性：仅显示授权后的客户字段
- 图片预览：展示缩略图与原图跳转
- AI 分析侧栏：意图、情感、阶段、实体等结果
- 建议回复区：为销售员提供输入辅助
- 连接状态提示：WebSocket / 账号在线状态可视化
- 搜索入口：跨平台跨会话关键词搜索

### 9.2 管理端

V1 管理端交付以下能力：

- 账号管理：账号状态、连接健康、最近同步时间
- 会话监控：全局会话列表、按平台/账号/时间过滤
- 客户映射查看：外部联系人、匿名别名、平台映射信息
- 可见性控制 UI：授权、撤销、到期时间、审计记录
- 任务分配：V1 先支持基础手动分配
- 导出管理：创建导出任务、查看进度、下载结果
- 术语表基础管理：CSV 导入、全局术语查看

### 9.3 客户端形态演进

| 阶段 | 形态 | 说明 |
|------|------|------|
| V1 | 纯 Web App | 开发最快、部署最简、零安装门槛 |
| V2 | Tauri 封装 | 增加系统托盘、原生通知、本地缓存、全局快捷键 |
| V2+ | 移动端 / PWA | 待业务验证后推进 |

---

## 10. V1 交付范围 + V2 规划预览

### 10.1 V1 交付范围

| 模块 | 交付内容 |
|------|---------|
| IM Core | Message Core + Conversation Core + Account Core，统一 PostgreSQL 存储 |
| Translation | 混合路由、语言检测、三层缓存、翻译审计、NLLB-200 本地降级（待业务确认） |
| Connector Adapter | TG/WA Adapter Shim（文本 + 图片） |
| Visibility Control | 动态策略、ViewProjector、审计日志、定时回收、缓存失效推送 |
| Search | PostgreSQL `pg_trgm` + GIN，原文 + 译文双轨搜索 |
| 销售工作台 | 会话列表、消息详情、翻译展示、图片预览、分析侧栏、建议回复 |
| 管理端 | 账号管理、会话监控、可见性控制 UI、任务分配、导出管理 |
| Analysis Adapter | 对接已有分析层，接收分析结果回写 |
| Agent Facade | 标准事件发布 + 命令接口 |
| Replay | 基础回放 API + 简易播放器 |
| Glossary | 全局术语表 + Prompt 注入 + 后处理替换 + CSV 导入 |
| Storage | PostgreSQL + Redis + MinIO |
| Deployment | Docker Compose、环境变量模板、部署文档 |

### 10.2 明确不在 V1 范围内

- Elasticsearch 全文搜索（V2）
- Tauri 桌面客户端（V2）
- LINE Connector（待逆向）
- 高级术语表管理 UI（V2）
- 完整回放播放器（速度控制、分析叠加）
- 客户画像模块（V2）
- 消息撤回/编辑/已读回执（V1.5）
- 移动端（V2+）

### 10.3 V2 规划预览

- 客户画像模块（AI 推断 + 自动更新 + 产品推荐）
- Elasticsearch 全文搜索
- Tauri 桌面客户端
- 高级术语表管理（多作用域 + DeepL Glossary API + 管理 UI）
- 完整回放播放器
- 群聊营销引擎完全迁移到 Agent Facade
- 移动端（Tauri v2 beta / PWA）

---

## 11. 实施路线图

### Phase 1：研究与验证（第 1-2 周）

- 阅读并冻结本文档与数据模型文档
- 初始化 monorepo 仓库（前后端 + shared types）
- 搭建 Docker Compose 开发环境：PostgreSQL + Redis + MinIO
- 验证 Node.js / Bun 运行时与 TDLib binding 兼容性
- 编写数据库 migration（核心表 + 可见性 + 导出 + 术语表）
- 与 Connector 团队对接 UnifiedActionAPI v5 细节
- 执行 NLLB-200 本地翻译质量基线测试（PT-BR、VI）
- 产出：技术验证报告 + 开发环境可用

### Phase 2：详细设计（第 2-3 周）

- ConnectorAdapter 详细设计
- REST API + WebSocket 协议细化
- 可见性控制详细设计（ViewProjector、缓存、审计、到期回收）
- 翻译层详细设计（路由、缓存、术语表注入）
- 客户端销售端/管理端交互方案细化
- Analysis Adapter 接口设计
- Agent Facade 事件目录与命令接口设计
- 产出：完整技术设计文档并团队定稿

### Phase 3：原型开发（第 3-5 周）

- 实现 ConnectorAdapter 框架 + TG Adapter Shim
- 实现 Message Core（持久化、会话序号分配）
- 实现 Event Bus（EventEmitter + BullMQ）
- 实现 WebSocket Gateway + Redis Pub/Sub
- 实现 Translation Module（混合路由 + 缓存）
- 打通原型链路：TG 消息 → Adapter → Message Core → 翻译 → WebSocket → 前端展示
- 产出：可运行原型

### Phase 4：完整开发（第 6-13 周）

按消息链路与业务闭环推进：

1. ConnectorAdapter：TG + WA Adapter Shim（文本 + 图片）
2. Message Core / Conversation Core / Account Core：完整 CRUD、分区管理
3. Translation Module：混合路由、语言检测、缓存、术语表、NLLB 降级
4. Visibility Control：策略 CRUD、ViewProjector、审计日志、定时回收、推送失效
5. Analysis Adapter：对接已有分析层
6. Agent Facade：事件发布 + 命令接口
7. Search：`pg_trgm` + GIN 索引（原文 + 译文）
8. Web 前端 - 销售工作台
9. Web 前端 - 管理端
10. Export：异步导出链路与下载
11. Replay：基础回放 API + 简易播放器
12. 集成测试、压测、翻译质量验证
13. 部署文档、上线手册、运维手册

每个模块完成后立即补集成测试，不把联调债务堆到最后。

**总预计工期：13 周。** 建议在 Phase 2 结束时做一次里程碑评审，再决定是否继续全量投入 Phase 3 和 Phase 4。

---

## 12. 部署与交付模式

### 12.1 部署原则

中心化部署。Connector、kHub 业务层统一部署在服务端，客户端只做展示与交互。

### 12.2 三种部署形态

| 部署方式 | 适用场景 | 数据库 | 缓存 | 对象存储 | 部署工具 |
|---------|---------|--------|------|---------|---------|
| 公有云 SaaS | 标准运营 | 托管 PostgreSQL | ElastiCache | Cloudflare R2 | Kubernetes + Helm |
| 客户私有云 | 企业交付 | 客户 PostgreSQL | 客户 Redis | 客户 S3 兼容 | Docker Compose / K8s |
| 本地机房 | 数据主权 | 内置 PostgreSQL | 内置 Redis | MinIO | 离线安装包 |

### 12.3 部署拓扑

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
│  │    ConnectorAdapter（TG + WA Shim）      │                     │
│  └────────────────────┬────────────────────┘                     │
│                       │                                          │
│  ┌────────────────────▼────────────────────┐                     │
│  │         kHub IM Core（Node.js/Bun）      │                     │
│  │  ┌───────────┐ ┌────────────┐ ┌───────┐ │                     │
│  │  │Message    │ │Translation │ │Agent  │ │                     │
│  │  │Core       │ │  Module    │ │Facade │ │                     │
│  │  │Visibility │ │Analysis    │ │WS     │ │                     │
│  │  │Control    │ │Adapter     │ │Gateway│ │                     │
│  │  └───────────┘ └────────────┘ └───────┘ │                     │
│  └────────────────────┬────────────────────┘                     │
│                       │                                          │
│  ┌────────────────────┼──────────────────────────┐               │
│  │  PostgreSQL  │  Redis  │  MinIO  │  NLLB-200(可选)  │         │
│  │  (统一存储)  │(缓存/队列)│(媒体)  │  (本地翻译)       │         │
│  └───────────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
         │ HTTPS / WSS
         ▼
┌─────────────────────┐
│  Web 客户端（浏览器）  │
│  销售工作台 / 管理端   │
└─────────────────────┘
```

### 12.4 容器化与健康检查

- Docker 镜像：单一镜像，基于 Node.js Alpine，目标体积 <200MB
- 开发环境：Docker Compose 编排全部依赖
- 生产环境：Helm Chart，HPA 以 CPU 和 WebSocket 连接数扩缩容
- 健康检查：`/health`（存活）、`/ready`（就绪，含 DB/Redis/Connector 检查）

### 12.5 监控与可观测性

| 指标类别 | 具体指标 | 告警阈值 |
|---------|---------|---------|
| 消息吞吐 | `messages_received_total`, `messages_processed_total` | 处理延迟 > 5s |
| 翻译延迟 | `translation_duration_seconds`（P50/P95/P99） | P99 > 10s |
| Connector 状态 | `connector_connected_accounts`, `connector_errors_total` | 断连 > 3min |
| WebSocket | `ws_active_connections`, `ws_message_queue_size` | 队列积压 > 1000 |
| 系统 | `process_cpu_usage`, `process_memory_rss`, `event_loop_lag` | 内存 > 80% |

技术方案：Prometheus + Grafana（指标）、OpenTelemetry（分布式追踪）、JSON 结构化日志（correlation ID）。

---

## 13. 关键数字

| 指标 | 数值 |
|------|------|
| V1 预估日消息量 | 500K 条/天 |
| 峰值消息速率 | ~350 条/分钟 |
| 年消息存储增量 | ~180GB |
| 年 `raw_events` 增量 | ~270GB |
| 翻译月成本（混合路由） | ~$4,285 |
| WebSocket 并发连接（V1） | 200-500 |
| 预计工期 | 13 周 |

---

## 14. 风险识别与缓解

| 风险项 | 影响 | 概率 | 缓解措施 |
|-------|------|------|---------|
| Bun 生态不够成熟 | 高 | 中 | Node.js 20 LTS 作为 Plan A，Bun 作为 Plan B；保持代码兼容性 |
| 翻译成本超预期 | 中 | 低 | 三层缓存降低 30-60%；GPT-4o-mini 作为低成本兜底 |
| NLLB-200 翻译质量不达标 | 中 | 中 | Phase 1 做质量基线测试；如不达标回到业务待对齐事项决策 |
| Connector 接口变更 | 高 | 中 | Adapter 模式隔离变更，Core 层不感知 |
| TDLib 在 Node.js/Bun 环境兼容性问题 | 高 | 中 | Phase 1 优先验证；不行则子进程隔离 |
| 消息量增长超预期 | 高 | 低 | 分区策略预留；Redis Pub/Sub 支持多实例 fan-out |
| 已有分析层接口不稳定 | 中 | 中 | Analysis Adapter 做版本管理和降级策略 |
| 可见性控制性能瓶颈 | 中 | 低 | Redis 策略缓存 + ViewProjector 批量查询优化 |

---

## 附：数据模型说明

数据模型详见 `kHub_data_model_v1.md`。

---

**文档结束**
