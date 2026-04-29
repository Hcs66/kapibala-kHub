# kHub V1.2 实施计划

---

## 目录

- [1. 文档信息](#1-文档信息)
- [2. 项目定位与目标](#2-项目定位与目标)
- [3. 范围边界](#3-范围边界)
- [4. 技术栈与关键决策](#4-技术栈与关键决策)
- [5. 核心架构](#5-核心架构)
- [6. 功能模块](#6-功能模块)
- [7. Tracy 对接](#7-tracy-对接)
- [8. 接入规范](#8-接入规范)
- [9. 实施路线图](#9-实施路线图)
- [10. 部署与交付](#10-部署与交付)
- [11. 关键数字](#11-关键数字)
- [12. 风险与缓解](#12-风险与缓解)
- [13. 待对齐事项](#13-待对齐事项)
- [14. V2 规划预览](#14-v2-规划预览)

---

## 1. 文档信息

| 项目 | 内容 |
|------|------|
| 文档标题 | kHub V1.2 实施计划 |
| 版本 | v1.2 |
| 日期 | 2026-04-29 |
| 状态 | 修订稿 |
| 关联文档 | kHub_plan_ts_v1.md（技术实现）、kHub_data_model_v1.md（数据模型） |

---

## 2. 项目定位与目标

> **kHub = IM 平台壳层 + 销售工作台**
>
> kHub 的职责是：把多平台 IM Connector 接入进来，经过 Tracy 已有的翻译/分析管道处理，最终通过一个实时 Web 工作台呈现给销售员。数据中台能力（存储、翻译、分析、客户管理）由 Tracy Core API 提供。

**核心用户：** 销售员（唯一使用 kHub 工作台的角色，boss/supervisor/lead 继续用 Tracy Admin）

**V1 核心目标：** 跑通最小闭环：Connector 收消息 → Tracy 处理（翻译+分析） → 销售工作台实时展示 → 销售员发消息 → 状态回写。同时补齐可见性控制和多账号管理。

---

## 3. 范围边界

### 3.1 三档边界模型（B/C/D）

#### B 档：Tracy 已有，kHub 直接对接（不动）

| 能力 | Tracy 已有实现 | kHub 对接方式 |
|------|---------------|-------------|
| 鉴权 JWT + 4 档角色 | 生产级 | 调 `/auth/login`，校验 `role=sales` |
| 翻译 `/translate` | 多引擎支持 | HTTP 调用，结果写入 `translated_text` |
| 分析整链 | 生产级 | Post-ingest 自动触发，kHub 轮询 `analysis_pack` |
| Leads/Profile/Replay API | 生产级 | HTTP 调用 |
| Admin SPA（32K 行 17 Page） | 生产级 | 不动，仅通过 D-08 加 2 个 Page |
| Plugin Config | 生产级 | `khub.*` 命名空间扩展 |
| Telemetry/Alerts/Ops | 生产级 | kHub 上报 |
| v22 聚合 API | 生产级 | 客户列表等直接调 |
| PostgreSQL 历史数据 | 生产级 | 不迁移，新 kHub 从切换日开始 ingest |

#### C 档：必须新建（kHub 真增量）

| 模块 | 职责 | 预估代码量 |
|------|------|----------|
| Connector Adapter 层 | 统一 Connector 抽象、TG/WA Adapter Shim | ~2,000 行 TS |
| Message Core 增强 | khub_raw_events + conversation_seq 协调 + 出站消息持久化 | ~3,000 行 TS |
| 出站消息状态机 | pending → sent → delivered → read / failed / timeout | ~1,500 行 TS |
| WebSocket Gateway | 实时推送、心跳、增量同步、断线缓冲 | ~2,500 行 TS |
| Visibility Control | 策略 CRUD、ViewProjector、审计、定时回收 | ~2,000 行 TS |
| Account Core | 多账号管理、凭据加密、健康检查、自动重连 | ~1,500 行 TS |
| 销售工作台 Web UI | React SPA、会话列表、消息视图、翻译预览、分析侧栏 | ~8,000 行 TSX |

**C 档总计：~20,500 行 TS/TSX**

#### D 档：Tracy 需要改造（kHub 给 spec，Tracy 实施）

详见 §7.2 D 档改造协调。

### 3.2 V1 明确不做清单

| 序号 | 不做的内容 | 放到哪个版本 | 理由 |
|------|----------|------------|------|
| 1 | 翻译混合路由（多引擎决策） | Tracy 已有 | Tracy `/translate` 已生产 |
| 2 | 三层翻译缓存 | Tracy 已有 | Tracy 内部管理 |
| 3 | NLLB-200 本地翻译引擎 | V2+ | 翻译成本由 Tracy cloud8b 承担 |
| 4 | pg_trgm 全局搜索 | V2（ES） | V1 不做搜索 |
| 5 | 训练数据导出 | V2 | 非核心闭环 |
| 6 | Glossary 术语表管理 | Tracy 侧 | 翻译由 Tracy 负责 |
| 7 | 管理端整体重做 | 不做 | Tracy Admin SPA 已 32K 行 |
| 8 | 高级 Replay 播放器 | V2 | Tracy `/replay` API 够用 |
| 9 | LINE / Zalo Connector | V2 | V1 只做 TG + WA |
| 10 | Tauri 桌面壳 | V2 | V1 只做 Web SPA |
| 11 | 移动端 / PWA | V2+ | 待业务验证 |
| 12 | 客户画像 LLM | V2+ | 非核心 |
| 13 | 离线模式 | V2+ | 非核心 |
| 14 | 全局快捷键 | V2 | 非核心 |
| 15 | 多语言界面 | V2+ | V1 只做简体中文 |

---

## 4. 技术栈与关键决策

### 4.1 技术栈

| 层级 | 选型 | 说明 |
|------|------|------|
| 后端语言 | TypeScript | — |
| 运行时 | Node.js 20 LTS | 锁定，Bun 推 V2 重估 |
| 后端框架 | Fastify | — |
| ORM | Drizzle ORM | — |
| 数据库 | PostgreSQL 14+ | 共享 Tracy 实例，kHub 表统一 `khub_` 前缀 |
| 缓存/队列 | Redis 6.2+ | kHub 独立实例 |
| 对象存储 | MinIO | — |
| 实时推送 | WebSocket + Redis Pub/Sub | — |
| 前端框架 | React 19 + TypeScript | — |
| 状态管理 | Zustand | — |
| UI 组件库 | shadcn/ui + Tailwind CSS | — |
| 构建工具 | Vite | — |
| 虚拟滚动 | @tanstack/virtual | — |
| 部署架构 | 模块化单体 | — |
| 监控 | Prometheus + Grafana + OpenTelemetry | — |

### 4.2 角色模型

Tracy 已有 4 档角色模型，kHub 沿用：

| 角色 | Tracy Admin | kHub 销售工作台 |
|------|-----------|---------------|
| boss | 全部功能 | 不允许登录 |
| supervisor | 全部功能 | 不允许登录 |
| lead | 全部功能 | 不允许登录 |
| sales | 受限功能 | **唯一允许登录的角色** |

### 4.3 设计原则

1. **kHub 不直读 Tracy 的业务表**：所有数据通过 Tracy HTTP API 获取。唯一例外是 D-01 方案 C 的字段级共享。
2. **kHub 自己的表统一 `khub_` 前缀**：在共享 PostgreSQL 实例中与 Tracy 表物理隔离。
3. **conversation_seq 由 Tracy ingest 路由分配**：kHub 不在本地生成，通过 `POST /ingest/message_raw` 由 Tracy 负责分配和返回。
4. **所有推送必须经过 ViewProjector 投影**：REST API 和 WebSocket 推送返回给客户端的数据必须经过 Visibility Control 投影。
5. **trace_id 跨服务透传**：所有跨 Tracy/kHub 的 HTTP 请求必须携带 `X-Trace-Id` header（ULID 格式）。

---

## 5. 核心架构

### 5.1 总体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer                              │
│    React 19 · TypeScript · Zustand · shadcn/ui · Tailwind    │
│   ┌──────────────────┐                                       │
│   │  销售工作台 Web    │  workbench.huidu.ai                  │
│   └────────┬─────────┘                                       │
└────────────┼────────────────────────────────────────────────┘
             │ WebSocket + REST API
┌────────────▼────────────────────────────────────────────────┐
│              kHub IM Core · TypeScript · 模块化单体           │
│                                                               │
│  ┌──────────┐ ┌──────────────┐ ┌──────────────────────┐    │
│  │ WS       │ │ Connector    │ │ Message Core         │    │
│  │ Gateway  │ │ Adapter 层   │ │ (增强 + 出站状态机)   │    │
│  └──────────┘ └──────────────┘ └──────────────────────┘    │
│  ┌──────────┐ ┌──────────────┐ ┌──────────────────────┐    │
│  │Visibility│ │ Account      │ │ Analysis Adapter     │    │
│  │ Control  │ │ Core         │ │ (薄壳轮询层)         │    │
│  └──────────┘ └──────────────┘ └──────────────────────┘    │
│  ┌──────────────────────────────────────────────────┐      │
│  │ Event Bus: EventEmitter(L1) + BullMQ(L2)        │      │
│  └──────────────────────────────────────────────────┘      │
└────────────┬────────────────────────────────────────────────┘
             │ HTTP API（kHub → Tracy，只调不存）
┌────────────▼────────────────────────────────────────────────┐
│                    Tracy Core API                             │
│  Auth · Translate · Analysis · Leads · Config · Telemetry    │
└────────────┬────────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────────┐
│                        Storage Layer                         │
│  共享 PostgreSQL (khub_ 前缀) │ kHub Redis │ kHub MinIO      │
└────────────────────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────────┐
│                      Connectors                              │
│  TG Connector (TDLib)  │  WA Connector (Go:9800)            │
└────────────────────────────────────────────────────────────┘
```

### 5.2 消息链路

#### 入站链路

```
外部 IM 平台（TG/WA 客户发消息）
  → Connector（TDLib / Go:9800，已有）
  → kHub ConnectorAdapter（转换为 InboundMessageEvent）
  → kHub 写 khub_raw_events（kHub 自己的原始事件存档）
  → kHub POST Tracy /ingest/message_raw
    → Tracy 分配 conversation_seq 并返回
    → Tracy 自动触发翻译和分析链路
  → kHub 调 Tracy POST /translate（如需手动触发补充）
  → kHub WS 推 message.new（含 conversation_seq，经过 ViewProjector 脱敏）
  → kHub 轮询 Tracy GET /analysis_pack（status=completed）
  → kHub WS 推 message.analyzed（经过 ViewProjector 脱敏）
```

#### 出站链路

```
销售员在工作台输入中文消息
  → 前端调 Tracy POST /translate（src=zh, tgt=customer_lang）→ 预览译文
  → 销售员确认发送
  → kHub POST Tracy /ingest/message_raw（direction=out, status=pending）
  → kHub 写 khub_raw_events（出站事件）
  → kHub WS 推 message.sent_pending（经过 ViewProjector）
  → kHub ConnectorAdapter.sendMessage()（发送到外部平台）
  → 成功：更新 status=sent → WS 推 message.sent
  → 失败：更新 status=failed → WS 推 message.failed
```

### 5.3 Event Bus

| 层级 | 技术 | 用途 |
|------|------|------|
| L1 进程内同步 | Node.js EventEmitter（typed-emitter） | kHub 模块间零延迟通信 |
| L2 异步任务队列 | BullMQ（基于 kHub Redis） | 出站重试、过期回收、断线缓冲清理 |

**Agent Facade 处置：** V1 先用 EventEmitter 占位，暴露统一事件格式。等 Tracy unified-contract spec 出来后再切。

**V1 事件目录：**

| 事件名 | 触发时机 | 消费方 |
|--------|---------|--------|
| `message.received` | 入站消息写入 khub_raw_events 后 | WS Gateway |
| `message.translated` | Tracy 翻译结果返回后 | WS Gateway |
| `message.analyzed` | Tracy analysis_pack 完成后 | WS Gateway |
| `message.sent` | 出站消息发送成功后 | WS Gateway |
| `message.failed` | 出站消息发送失败后 | WS Gateway |
| `message.status_changed` | 消息状态机流转后 | WS Gateway |
| `account.status_changed` | 账号连接状态变化后 | WS Gateway |
| `visibility.changed` | 可见性策略变更/过期/撤销后 | WS Gateway |

---

## 6. 功能模块

### 6.1 Connector Adapter 层

**职责：** 统一 Connector 抽象，将 TG/WA Connector 的协议差异封装为标准 ConnectorAdapter 接口。

**核心拓扑：**

```
┌─────────────────────────────────┐
│          kHub IM Core            │
│    (依赖 ConnectorAdapter)       │
└──────────────┬──────────────────┘
               │
    ┌──────────▼──────────┐
    │  ConnectorRegistry   │
    └───┬─────────────┬───┘
        │             │
   ┌────▼────┐  ┌────▼──────────┐
   │TG Adapter│  │WA Adapter     │
   │(Shim)    │  │(HTTP Client)  │
   └────┬─────┘  └────┬──────────┘
        │             │
   ┌────▼────┐  ┌────▼──────┐
   │TDLib    │  │Go Service │
   │(子进程)  │  │(:9800)    │
   └─────────┘  └───────────┘
```

**关键机制：**

- ConnectorRegistry 启动时从 Plugin Config 读取 `khub.connector.*` 配置，实例化对应 Adapter
- 断连自动重连：指数退避 1s → 2s → 4s → 8s → 16s → 30s（上限）
- 健康检查：每 30s 轮询各 adapter 的 getConnectionStatus
- 平台能力声明：通过 PlatformCapabilityManifest 声明各平台支持的消息类型和限制

**V1 范围：**

| 功能 | V1 | V1.5 |
|------|-----|------|
| 文本消息收发 | ✅ | — |
| 图片收发 | ✅ | — |
| 连接状态监控 | ✅ | — |
| platform_msg_id 去重 | ✅ | — |
| 视频/音频/文件 | ❌ | ✅ |
| 消息撤回/编辑 | ❌ | ✅ |
| 已读回执 | ❌ | ✅ |

> 接口定义和类型详见 kHub_plan_ts_v1.md §1

### 6.2 Message Core 增强

**设计决策：** 基于 Tracy message_raw 表增强（方案 C），kHub 不新建独立的 messages 表。

**核心流程：**

- **入站**：Connector 收消息 → kHub 写 khub_raw_events（status=pending） → POST Tracy /ingest/message_raw → Tracy 返回 conversation_seq → kHub 回填 → WS 推 message.new
- **出站**：销售员确认发送 → kHub POST Tracy /ingest/message_raw（direction=out） → Tracy 返回 conversation_seq → ConnectorAdapter.sendMessage() → 成功/失败更新状态

**conversation_seq 分配机制：** 由 Tracy ingest 路由通过 PG advisory lock 分配，单调递增，是消息排序的唯一权威。

**媒体处理（V1）：**
- 入站：Connector 下载 → kHub 上传 MinIO → 路径写入 media_url
- 出站：前端上传 → kHub 存 MinIO → ConnectorAdapter.sendMedia 取文件发送
- V1 仅支持图片（JPG/PNG/GIF）

> 数据表定义详见 kHub_data_model_v1.md；实现代码详见 kHub_plan_ts_v1.md §2

### 6.3 出站消息状态机

**状态流转：**

```
pending → sent → delivered → read
pending/sent → failed
pending → timeout
```

**推送链路：** 每次状态变更都通过 WS 推送给客户端（经过 ViewProjector）。

**失败重试策略：**

| 错误类型 | 重试策略 | 最大重试次数 |
|---------|---------|------------|
| 网络 5xx | 指数退避 | 3 次（1s → 2s → 4s） |
| 429 Too Many Requests | 遵守 retry_after | 无限 |
| 401 Unauthorized | 不重试，立即告警 | 0 |
| 400 Bad Request | 不重试 | 0 |
| 拉黑/封号 | 不重试，立即告警 | 0 |

> 实现代码详见 kHub_plan_ts_v1.md §3

### 6.4 WebSocket Gateway

**推送事件（服务端 → 客户端）：**

| 事件类型 | 说明 |
|---------|------|
| `message.new` | 新消息（入站） |
| `message.translated` | 翻译完成 |
| `message.analyzed` | 分析完成 |
| `message.sent_pending` | 出站发送中 |
| `message.sent` | 出站发送成功 |
| `message.status` | 状态变更（delivered/read） |
| `message.failed` | 发送失败 |
| `visibility.changed` | 可见性策略变更 |
| `account.status_changed` | 账号状态变更 |
| `sync` | 增量同步数据 |

**客户端命令（客户端 → 服务端）：**

| 事件类型 | 说明 |
|---------|------|
| `message.send` | 发送消息 |
| `read.ack` | 已读回执 |
| `sync.request` | 增量同步请求 |
| `ping` | 心跳 |

**关键机制：**

- **心跳**：客户端每 30s 发 ping，连续 3 次无响应（90s）判定断连
- **重连**：指数退避 1s → 2s → 4s → 8s → 16s → 30s（上限），重连时发 sync.request 拉增量
- **增量同步**：per-conversation 的 last_sync_seq，落后 >1000 条时返回摘要 + 最近 100 条
- **断线缓冲**：Redis Sorted Set，TTL = 5 分钟
- **鉴权**：建连时发送 JWT，验签后校验 role === 'sales'
- **多实例横扩**：Redis Pub/Sub fan-out（V1 单实例即可支撑 200-500 并发）
- **推送过滤**：基于客户端订阅的 actor scope + visibility policy，服务端过滤

> 协议细节和实现代码详见 kHub_plan_ts_v1.md §4

### 6.5 Visibility Control

**策略模型：** 白名单模式，默认脱敏，授权后可见。

**默认可见字段：** conversation_id、anonymized_alias、lead_status、消息内容、时间、language、platform_kind

**默认不可见字段（需授权）：** real_name、phone、email、platform_username、avatar_url、platform_user_id

**核心机制：**

- **ViewProjector 中间件**：所有 API 和 WS 响应经过此中间件，从 Redis 缓存读取有效策略并过滤字段
- **定时回收**：每 60 秒扫描即将过期的策略，自动撤销并写审计日志
- **实时性目标**：从策略变更到客户端感知，3 秒内全部生效
- **缓存失效**：由 visibility.changed 事件触发

**V1 范围限制：**
- 仅做 kHub 侧投影，Tracy Admin 的 sales 视图不加 ViewProjector
- 策略 CRUD API 由 Tracy Admin 侧提供（D-08 新增 Visibility 管理 Page）

> 数据表详见 kHub_data_model_v1.md；实现代码详见 kHub_plan_ts_v1.md §5

### 6.6 Account Core

**职责：** 多账号管理、凭据加密存储、健康检查、自动重连。

**生命周期：**

```
创建（inactive） → 启动连接（connecting） → 成功（connected） / 失败（error）
                                          ↓
                              健康检查（每 30s）→ 断连 → 自动重连（指数退避）
                                          ↓
                              停用（inactive） / 封禁（banned）
```

**凭据存储：**
- 优先方案：OS keychain（macOS Keychain / Linux Secret Service）
- 降级方案：加密文件（AES-256-GCM，密钥从环境变量读取）
- credentials_ref 字段只存储引用标识，不存储凭据明文

**多账号 conversation_id 隔离：** 保持 `<platform>::<native_conversation_id>` 格式，靠 agent_platform_account 字段隔离同一平台不同账号的会话。

> 数据表详见 kHub_data_model_v1.md；实现代码详见 kHub_plan_ts_v1.md §6

### 6.7 销售工作台 Web UI

**独立部署：**
- 域名：`workbench.huidu.ai`
- 独立 SPA，与 Tracy Admin 完全分离
- API 走 `api.huidu.ai`，WS 走 `wss://ws.huidu.ai`

**布局：**

```
┌────────────────────────────────────────────────────────────┐
│  kHub 销售工作台              [账号状态指示]    [退出登录]   │
├──────────┬───────────────────────────┬─────────────────────┤
│  客户列表 │  消息气泡列表（虚拟滚动）   │  AI 分析侧栏        │
│          │  [原文/译文切换]          │  意图/情感/阶段      │
│          │  [输入框] [发送] [预览]   │  建议回复            │
└──────────┴───────────────────────────┴─────────────────────┘
```

**数据源：**

| 数据 | 来源 |
|------|------|
| 客户列表 | Tracy `GET /v22/leads/list` |
| 历史消息 | Tracy `GET /replay` |
| 翻译 | Tracy `POST /translate` |
| 分析结果 | Tracy `GET /analysis_pack` + `GET /state_digest` |
| 建议回复 | Tracy `GET /select_action` |
| 实时更新 | kHub WebSocket |
| 数据脱敏 | kHub ViewProjector |

**关键交互行为：**

| 行为 | 实现方式 |
|------|---------|
| 会话切换不重连 WS | WS 连接全局唯一，切换会话只改 store 状态 |
| 翻译预览（不自动发） | 用户输入 → 调 Tracy /translate → 显示预览 → 点确认发送才发 |
| 入站默认未读 | 新入站消息标记未读，用户进入会话后自动标记已读 |
| 虚拟滚动定位 | 用 conversation_seq 做锚点，支持上下滚动加载历史 |
| Connector 断连提示 | 顶部红色横幅提示 |
| 数据脱敏显示 | 未授权的客户字段显示 anonymized_alias |
| 会话内搜索 | 简单 LIKE 搜索（V1），前端本地过滤已加载消息 |

> 前端技术栈和 Store 设计详见 kHub_plan_ts_v1.md §7

---

## 7. Tracy 对接

### 7.1 B 档直接对接

#### 鉴权

```
POST /auth/login → 校验 role === 'sales' → 存 JWT → 所有请求携带 Bearer token
401 → 清 token → 跳登录页
V1 无 refresh token，过期后重新登录
```

#### 翻译

```
入站翻译：POST Tracy /translate { text, src: 'auto', tgt: 'zh-CN' } → 写入 translated_text → WS 推
出站翻译：POST Tracy /translate { text, src: 'zh-CN', tgt: customerLang } → 显示预览 → 确认发送
```

#### 分析

```
分析触发：Post-ingest trigger 自动跑（Tracy 侧已有）
kHub 获取：轮询 GET /analysis_pack?message_id=xxx&status=completed（间隔 5s）
工作台展示：GET /state_digest（会话摘要）+ GET /analysis_pack（单条详细）
建议回复：来自 Tracy /select_action 输出
```

#### 客户 / Leads / Replay

```
客户列表：GET /v22/leads/list?page=1&limit=50
客户操作：POST /v22/leads/mark（打标）、POST /v22/leads/display_name（改备注）
客户画像：GET /profile?platform_user_id=xxx
历史消息：GET /replay?conversation_id=xxx&before_seq=100&limit=50
```

#### Plugin Config

```
启动时拉取：GET /plugin/config/resolved → 过滤 khub.* 命名空间
30s 轮询更新

khub.* 配置项：
  khub.enabled                    - kHub 总开关
  khub.auto_send                  - 是否自动发送（V1 默认 false）
  khub.preview_translation        - 出站翻译预览开关
  khub.connector.telegram.enabled - TG Connector 开关
  khub.connector.whatsapp.enabled - WA Connector 开关
  khub.ws.heartbeat_interval_ms   - WS 心跳间隔
  khub.ws.reconnect_max_delay_ms  - WS 最大重连延迟
  khub.visibility.default_mode    - 默认可见性模式
  khub.translation.auto_translate - 入站自动翻译开关
  khub.telemetry.enabled          - 遥测上报开关
```

#### Telemetry / Alerts

```
遥测上报：POST /telemetry/ingest { source: 'khub-im-core', metrics, events }
告警上报：POST /alerts/ingest { severity, source: 'khub-im-core', message, metadata }
```

### 7.2 D 档改造协调

D 档改造由 Tracy 侧负责实施，kHub 侧提供需求规格和验收标准。

| 编号 | 改造内容 | Tracy 工作量 | 阻塞关系 | kHub 验收标准 |
|------|---------|------------|---------|-------------|
| D-01 | Postgres 共享 + message_raw 增强方案 C | 2-3 人天 | 阻塞 Phase 1 | kHub 能连接共享 PG，message_raw 新字段可写 |
| D-02 | Ingest 路由增强（conversation_seq + platform_msg_id 强去重） | 1-2 人天 | 阻塞 Phase 2 | POST /ingest 返回 conversation_seq，重复 platform_msg_id 返回 409 |
| D-03 | RBAC 加 grant_visibility_policy capability | 1 人天 | 阻塞 Phase 4 | supervisor/boss 能授予/撤销 visibility policy |
| D-04 | unified-contract 吸收 Agent Facade | V1 先占位 | 不阻塞 | V1 EventEmitter 占位，接口格式对齐 |
| D-05 | V1 轮询 /analysis_pack，V2 升级事件推送 | 0.5 人天 | 不阻塞 | GET /analysis_pack 支持 status 过滤 |
| D-06 | Plugin Config 加 khub.* 命名空间 | 0.5 人天 | 阻塞 Phase 3 | GET /plugin/config/resolved 返回 khub.* 配置项 |
| D-07 | trace_id 透传 X-Trace-Id header | 0.5 人天 | 阻塞 Phase 1 | Tracy response header 包含 X-Trace-Id |
| D-08 | Admin SPA 加 2 Page（Visibility 管理 + Account Health） | 3-4 人天 | 阻塞 Phase 4 | Visibility 管理 Page + Account Health Page |
| D-09 | V1 临时复制 contracts 类型，V1+ 切 npm package | 1 人天 | 阻塞 Phase 1 | kHub 可 import 共享类型定义 |
| D-10 | weakDedupe V1 保留兜底，V2 删除 | 0 人天 | 不阻塞 | message_raw 已有 platform_msg_id 唯一约束 |

**Tracy 改造工作量总计：5-12 人天**

---

## 8. 接入规范

### 8.1 通用约定

| 约定 | 说明 |
|------|------|
| Base URL | 环境变量 `TRACY_API_BASE_URL` |
| 认证 | `Authorization: Bearer {jwt}` |
| Content-Type | `application/json` |
| Trace ID | `X-Trace-Id: {ulid}`（所有请求） |
| Client 标识 | `X-Client: khub-im-core` 或 `X-Client: khub-workbench` |
| 时区 | 所有时间戳使用 UTC 毫秒级 Unix timestamp |

### 8.2 ID 命名规范

| ID 类型 | 格式 | 示例 |
|--------|------|------|
| conversation_id | `<platform>::<native_conversation_id>` | `telegram::123456789` |
| message_id | `<platform>::<native_conversation_id>::<native_message_id>` | `telegram::123456789::987` |
| platform_msg_id | `<native_message_id>` | `987` |
| 多账号隔离 | `agent_platform_account` 字段 | Tracy message_raw 表字段 |

### 8.3 错误处理与重试

**统一响应格式：**

```
成功：{ ok: true, data: T }
失败：{ ok: false, error: { code, message, retryable, details? } }
```

**重试策略：**

| HTTP 状态码 | 重试 | 说明 |
|-----------|------|------|
| 429 | 遵守 retry_after_ms | 请求过于频繁 |
| 500/502/503/504 | 指数退避，最多 3 次 | 服务端错误 |
| 401 | 不重试，清 token | 认证失败 |
| 400/403/404 | 不重试 | 客户端错误 |

### 8.4 kHub 自身错误码

| 错误码 | HTTP 状态码 | 说明 |
|--------|-----------|------|
| `KHUB_AUTH_REQUIRED` | 401 | 未认证或 JWT 过期 |
| `KHUB_ACCOUNT_NOT_CONNECTED` | 503 | 指定账号未连接 |
| `KHUB_CONNECTOR_ERROR` | 502 | Connector 调用失败 |
| `KHUB_INVALID_CONVERSATION_ID` | 400 | conversation_id 格式错误 |
| `KHUB_VISIBILITY_DENIED` | 403 | 访问了未授权的可见性字段 |
| `KHUB_RATE_LIMITED` | 429 | 触发限流 |
| `KHUB_INTERNAL_ERROR` | 500 | 内部错误 |

---

## 9. 实施路线图

### Phase 1：研究 + 数据层对齐（第 1-2 周）

| 任务 | 负责方 | 产出 |
|------|--------|------|
| 阅读交付包，确认范围共识 | kHub + Tracy | 范围确认会议纪要 |
| 与 Tracy 决策 D-01 ~ D-10 | kHub + Tracy | D 档改造单全部拍板 |
| Tracy 实施 D-01/02/03/06/07/09 | Tracy | 改造完成并部署 staging |
| 验证 TDLib Node.js 兼容性 | kHub | 技术验证报告 |
| 初始化 monorepo + Docker Compose | kHub | PG + Redis + MinIO + kHub 骨架 |
| 调通 Tracy staging：login + translate 一次往返 | kHub | 接口联调通过 |
| 共享类型复制（D-09） | kHub | contracts types 可 import |

**出口标准：** 本地起 Tracy Core API + kHub 骨架，跑通 /auth/login + /translate 一次完整往返，D-01 ~ D-10 全部拍板。

### Phase 2：Connector + Message Core（第 3-4 周）

| 任务 | 负责方 | 产出 |
|------|--------|------|
| ConnectorAdapter 接口 + ConnectorRegistry | kHub | 接口定义 + 注册机制 |
| TG Adapter Shim（含 TDLib 子进程隔离） | kHub | TG Connector 可用 |
| WA Adapter Shim（HTTP 调 Go:9800） | kHub | WA Connector 可用 |
| Message Core（khub_raw_events + ingest + conversation_seq） | kHub | 入站链路打通 |
| 出站链路（发送 → ConnectorAdapter → 状态机回写） | kHub | 出站链路打通 |

**出口标准：** TG 收到消息 → 落库 → 翻译 → 分析结果回写；出站消息发送成功并回写状态。

### Phase 3：WebSocket + 销售工作台（第 5-6 周）

| 任务 | 负责方 | 产出 |
|------|--------|------|
| WebSocket Gateway + 心跳 + 重连 + 增量同步 | kHub | WS 实时推送可用 |
| Redis Pub/Sub fan-out | kHub | 多实例推送支持 |
| 销售工作台骨架（React 19 + Zustand + shadcn） | kHub | UI 骨架 |
| 会话列表 + 消息详情 + 翻译切换 | kHub | 核心页面可用 |
| 出站发消息（输入 → 翻译预览 → 确认 → ConnectorAdapter） | kHub | 出站闭环 |
| 分析侧栏（轮询 analysis_pack → WS 推） | kHub | 分析展示 |
| Tracy 实施 D-06（Plugin Config khub.*） | Tracy | 配置可拉取 |

**出口标准：** 销售员在工作台能完整收发消息，翻译预览可用，消息状态实时更新，分析结果展示。

### Phase 4：Visibility + Account Core + 收尾（第 7-8 周）

| 任务 | 负责方 | 产出 |
|------|--------|------|
| Visibility Control 全套 | kHub | 策略/审计/ViewProjector/定时回收 |
| Account Core（多账号 + 凭据加密 + 健康检查） | kHub | 账号管理可用 |
| Tracy 实施 D-08（Admin SPA 加 2 Page） | Tracy | Visibility 管理 + Account Health Page |
| Tracy 实施 D-03（RBAC visibility capability） | Tracy | 权限控制 |
| 集成测试 + 压测 | kHub | 测试报告 |
| 部署文档 + 上线手册 | kHub | 文档交付 |
| 灰度计划协调 | kHub + Tracy | 灰度方案 |

**出口标准：** 可见性策略实时生效（3 秒内），多账号同时在线，1-2 个真实业务员开始内测。

---

## 10. 部署与交付

### 10.1 部署原则

中心化部署。Connector、kHub 业务层统一部署在服务端，客户端只做展示与交互。

### 10.2 三种部署形态

| 部署方式 | 适用场景 | 数据库 | 缓存 | 对象存储 | 部署工具 |
|---------|---------|--------|------|---------|---------|
| 公有云 SaaS | 标准运营 | 共享 Tracy PG（khub_ 前缀） | kHub Redis | kHub MinIO | Docker Compose / K8s |
| 客户私有云 | 企业交付 | 共享 Tracy PG | kHub Redis | kHub MinIO | Docker Compose |
| 本地机房 | 数据主权 | 共享 Tracy PG | kHub Redis | kHub MinIO | 离线安装包 |

### 10.3 部署拓扑

```
┌─────────────────────────────────────────────────────────────────┐
│                        服务端部署                                │
│                                                                 │
│  ┌──────────────────┐   ┌──────────────────┐                     │
│  │ TG Connector     │   │ WA Connector     │  (已有，不碰)        │
│  │ (TDLib)          │   │ (Go:9800)        │                     │
│  └────────┬─────────┘   └────────┬─────────┘                     │
│           │                      │                                │
│  ┌────────▼──────────────────────▼─────────┐                    │
│  │    kHub IM Core（Node.js 20 LTS）        │                    │
│  │  ┌─────────────┐ ┌───────────┐ ┌──────┐ │                    │
│  │  │Connector     │ │ WS        │ │Msg   │ │                    │
│  │  │Adapter 层    │ │ Gateway   │ │Core  │ │                    │
│  │  └─────────────┘ └───────────┘ └──────┘ │                    │
│  │  ┌─────────────┐ ┌───────────┐ ┌──────┐ │                    │
│  │  │Visibility   │ │Account    │ │Event │ │                    │
│  │  │Control      │ │Core       │ │Bus   │ │                    │
│  │  └─────────────┘ └───────────┘ └──────┘ │                    │
│  └────────────────────┬────────────────────┘                    │
│                       │                                         │
│  ┌────────────────────▼──────────────────────────┐              │
│  │  Tracy Core API（已有，不碰）                    │              │
│  │  Auth · Translate · Analysis · Leads · Config  │              │
│  └────────────────────┬──────────────────────────┘              │
│                       │                                         │
│  ┌────────────────────▼──────────────────────────┐              │
│  │  共享 PostgreSQL  │  kHub Redis  │  kHub MinIO │             │
│  │  (khub_ 前缀隔离) │  (推送/队列)  │  (媒体)     │             │
│  └───────────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
          │ HTTPS / WSS
          ▼
┌─────────────────────────────────────────────────┐
│  Web 客户端                                      │
│  销售工作台: workbench.huidu.ai                   │
│  管理后台:   admin.huidu.ai (Tracy, 不动)        │
└─────────────────────────────────────────────────┘
```

### 10.4 容器化

- **Docker 镜像**：基于 Node.js 20 LTS Alpine，目标体积 <200MB
- **开发环境**：Docker Compose 编排（PG + Redis + MinIO + Tracy Core API + kHub）
- **生产环境**：Helm Chart，HPA 以 CPU 和 WebSocket 连接数扩缩容
- **健康检查**：`/health`（存活探针）、`/ready`（就绪探针，含 DB/Redis/Connector 状态检查）

### 10.5 监控

| 指标类别 | 具体指标 | 告警阈值 |
|---------|---------|---------|
| 消息吞吐 | `messages_received_total` | 处理延迟 > 5s |
| 翻译延迟 | `translation_duration_seconds`（P50/P95/P99） | P99 > 10s |
| Connector | `connector_connected_accounts` | 断连 > 3min |
| WebSocket | `ws_active_connections` | 队列积压 > 1000 |
| 系统 | `process_cpu_usage`, `process_memory_rss`, `event_loop_lag` | 内存 > 80% |

技术方案：Prometheus + Grafana（指标）、OpenTelemetry（分布式追踪，与 Tracy 通过 D-07 trace_id 串起来）、JSON 结构化日志。

### 10.6 域名规划

| 域名 | 服务 | 说明 |
|------|------|------|
| `admin.huidu.ai` | Tracy Admin SPA | 不动 |
| `workbench.huidu.ai` | kHub 销售工作台 | **新建** |
| `api.huidu.ai` | Tracy Core API | 不动，kHub 后端也调这个 |
| `wss://ws.huidu.ai` | kHub WebSocket Gateway | **新建** |

---

## 11. 关键数字

| 指标 | 数值 | 说明 |
|------|------|------|
| V1 预估日消息量 | 500K 条/天 | 待客户校准 |
| 峰值消息速率 | ~350 条/分钟 | — |
| WS 并发连接（V1） | 200-500 | — |
| 翻译月成本 | 由 Tracy cloud8b 承担 | kHub 不承担翻译成本 |
| 预计工期 | 6-8 周 | 聚焦 C 档真增量 |
| Tracy 改造工作量 | 5-12 人天 | D 档改造 |
| C 档代码量 | ~20,500 行 TS/TSX | 7 个模块 |

---

## 12. 风险与缓解

| 风险项 | 影响 | 概率 | 缓解措施 |
|-------|------|------|---------|
| Phase 1 数据层对齐拖延 | 全部 Phase 推迟 | 中 | D 档改造单 W1 末全部拍板，不拖延到 W2 |
| TDLib Node.js 兼容性问题 | TG Connector 不可用 | 中 | Phase 1 优先验证；备选子进程隔离方案 |
| 双轨期消息重复 | 旧扩展和新 Connector 同时 ingest | 中 | 禁止同一 sales 同时跑旧扩展和新 Connector |
| Tracy 节奏不匹配 | D 档改造延迟 | 中 | 每周 30min 同步会，阻塞项及时升级 |
| 历史数据迁移 | 切换后看不到旧消息 | 低 | 方案 C 不迁移，旧消息通过 Tracy /replay API 查 |
| kHub 被 Tracy 限流 | 翻译/分析请求被拒 | 低 | Tracy 加白名单或为 kHub 设置单独限流桶 |
| WS 连接数超预期 | 内存/CPU 不足 | 低 | Redis Pub/Sub 支持多实例横扩 |
| PostgreSQL 共享性能 | kHub 读写影响 Tracy | 低 | khub_ 前缀隔离，kHub 读写量远小于 Tracy |

---

## 13. 待对齐事项

| # | 事项 | kHub 建议 | 需 Tracy 确认 |
|---|------|----------|-------------|
| 1 | Postgres 共享 vs 双库 | 共享（khub_ 前缀隔离） | Tracy 推荐？ |
| 2 | message_raw 增强方案 | 方案 C（加字段不迁移） | Tracy 推荐 C，是否同意？ |
| 3 | unified-contract 合并方向 | V1 EventEmitter 占位，等 spec | Tracy spec 预计什么时候出？ |
| 4 | 历史数据切换日 | 旧扩展停采 + 新 Connector 上线同一天 | 业务方确认切换日 |
| 5 | Tracy staging 环境 | 需要 baseUrl + 测试租户 + JWT_SECRET + PG/Redis 连接信息 | Tracy 何时提供？ |
| 6 | Connector 接 Tracy TG/WA 的方式 | HTTP 还是 IPC？ | Tracy 侧偏好？ |
| 7 | BullMQ 是否独立 | kHub 和 Tracy 各自独立 BullMQ | 确认无冲突 |

---

## 14. V2 规划预览

| 能力 | 计划版本 | 说明 |
|------|---------|------|
| 翻译混合路由（多引擎决策） | V2 | 在 Tracy /translate 基础上升级路由策略 |
| 三层缓存 + Glossary 术语表 | V2 | Tracy 翻译侧增强 |
| Elasticsearch 全文搜索 | V2 | 跨平台跨会话搜索，原文 + 译文双轨 |
| 训练数据导出 | V2 | 平行语料 TSV + 结构化 JSON |
| Tauri 桌面客户端 | V2 | 系统托盘、原生通知、本地缓存 |
| 高级 Replay 播放器 | V2 | 速度控制、分析叠加、时间轴标记 |
| 群聊营销引擎完全迁移到 unified-contract | V2 | Agent Facade 正式版 |
| 客户画像 LLM | V2+ | AI 推断 + 自动更新 + 产品推荐 |
| 移动端 / PWA | V2+ | 待业务验证后推进 |
| LINE / Zalo Connector | V2+ | 待逆向和接口确认 |

---

**文档结束**
