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
| 版本 | v1.2.2 |
| 日期 | 2026-04-30 |
| 状态 | 路线图细化 |
| 关联文档 | kHub_plan_ts_v1.md（技术实现）、kHub_data_model_v1.md（数据模型） |

---

## 2. 项目定位与目标

> **kHub = IM 中间平台 + 销售工作台**
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

**Event Bus 设计：** V1 阶段 kHub 只服务销售工作台单一消费方，不需要协议层。直接使用 typed EventEmitter 作为进程内事件总线，无需额外抽象。

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
   ┌────▼─────┐  ┌───▼───────────┐
   │TG Adapter│  │WA Adapter     │
   │(HTTP)    │  │(HTTP Client)  │
   └────┬─────┘  └────┬──────────┘
        │             │
   ┌────▼─────────┐  ┌────▼──────┐
   │TDLib Service │  │Go Service │
   │(Docker/HTTP) │  │(:9800)    │
   └──────────────┘  └───────────┘
```

**关键机制：**

- TG Adapter 和 WA Adapter 均通过 HTTP 调用各自的 Connector 服务，风格统一
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

D 档改造由 Tracy 侧负责实施（CTO 忙完后直接推 GitHub），kHub 侧 clone 源码本地使用。

| 编号 | 改造内容 | Tracy 工作量 | 阻塞关系 | kHub 验收标准 |
|------|---------|------------|---------|-------------|
| D-01 | Postgres 共享 + message_raw 增强方案 C | 2-3 人天 | 阻塞 Phase 2 | kHub 能连接共享 PG，message_raw 新字段可写 |
| D-02 | Ingest 路由增强（conversation_seq + platform_msg_id 强去重） | 1-2 人天 | 阻塞 Phase 2 | POST /ingest 返回 conversation_seq，重复 platform_msg_id 返回 409 |
| D-03 | RBAC 加 grant_visibility_policy capability | 1 人天 | 阻塞 Phase 4 | supervisor/boss 能授予/撤销 visibility policy |
| ~~D-04~~ | ~~unified-contract 吸收 Agent Facade~~ | — | — | ~~已取消：V1 单一消费方，不需要协议层~~ |
| D-05 | V1 轮询 /analysis_pack，V2 升级事件推送 | 0.5 人天 | 不阻塞 | GET /analysis_pack 支持 status 过滤 |
| D-06 | Plugin Config 加 khub.* 命名空间 | 0.5 人天 | 阻塞 Phase 3 | GET /plugin/config/resolved 返回 khub.* 配置项 |
| D-07 | trace_id 透传 X-Trace-Id header | 0.5 人天 | 阻塞 Phase 1 | Tracy response header 包含 X-Trace-Id |
| D-08 | Admin SPA 加 2 Page（Visibility 管理 + Account Health） | 3-4 人天 | 阻塞 Phase 4 | Visibility 管理 Page + Account Health Page |
| D-09 | 从 Tracy 源码直接复制 contracts 类型定义 | 0 人天（kHub 自行完成） | 阻塞 Phase 1 | kHub 可 import 共享类型定义 |
| D-10 | weakDedupe V1 保留兜底，V2 删除 | 0 人天 | 不阻塞 | message_raw 已有 platform_msg_id 唯一约束 |

**Tracy 改造工作量总计：~8-12 人天**（D-04 取消，D-09 改为 kHub 自行完成）

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

> **核心原则：** kHub 侧完全独立推进，不阻塞等待 Tracy。后端直接 clone Tracy 源码本地跑，不依赖远程 staging API。

### Phase 1：独立验证 + 骨架搭建（第 1-2 周）

#### 1.1 初始化项目骨架

| # | 子任务 | 产出 |
|---|--------|------|
| 1.1.1 | 初始化 Node.js 20 + TypeScript strict 项目（tsconfig、eslint、prettier） | 可编译的空项目 |
| 1.1.2 | 配置 Vitest 测试框架 | `pnpm test` 可运行 |
| 1.1.3 | 搭建 Fastify 应用入口 + `/health`、`/ready` 路由 | 服务可启动，健康检查可访问 |
| 1.1.4 | 搭建 config 模块（环境变量校验 + 类型安全读取） | 所有 env 统一入口 |
| 1.1.5 | 搭建 shared 模块（错误码定义、通用类型、trace-id 工具） | 共享基础设施就绪 |

**依赖关系：** 无前置依赖，Phase 1 第一步。

#### 1.2 Docker Compose 编排

| # | 子任务 | 产出 |
|---|--------|------|
| 1.2.1 | 编写 docker-compose.yml（PG + Redis + MinIO） | 基础设施一键启动 |
| 1.2.2 | 添加 TDLib Service 容器（基于社区 Docker 镜像或自建） | TDLib HTTP API 可调用 |
| 1.2.3 | 添加 kHub 本体 Dockerfile（开发模式，热重载） | `docker compose up` 全栈启动 |
| 1.2.4 | 编写 `.env.example` + 启动文档 | 新人 clone 后 5 分钟内可跑通 |

**依赖关系：** 1.2.1 无依赖；1.2.2 依赖 TDLib 镜像调研（1.3）；1.2.3 依赖 1.1。

#### 1.3 TDLib 兼容性验证

| # | 子任务 | 产出 |
|---|--------|------|
| 1.3.1 | 调研 TDLib Docker 镜像方案（社区镜像 vs 自建 HTTP wrapper） | 技术选型结论 |
| 1.3.2 | 在 Docker 容器内跑通 TDLib 登录（手机号 + 验证码） | 登录流程验证通过 |
| 1.3.3 | 验证收消息：监听 `updateNewMessage`，打印到 stdout | 入站事件可接收 |
| 1.3.4 | 验证发消息：调用 `sendMessage` 发送文本 | 出站发送成功 |
| 1.3.5 | 验证稳定性：连续运行 24h，记录内存占用和重连次数 | 稳定性报告 |

**依赖关系：** 1.3.1 无依赖；1.3.2~1.3.5 串行执行；与 1.1/1.2 可并行。

#### 1.4 ConnectorAdapter 接口 + Registry

| # | 子任务 | 产出 |
|---|--------|------|
| 1.4.1 | 定义 `ConnectorAdapter` 接口（生命周期、收发、能力声明） | `src/connector/types.ts` |
| 1.4.2 | 定义 `InboundMessageEvent`、`SendMessageParams`、`SendResult` 等类型 | 完整类型体系 |
| 1.4.3 | 实现 `ConnectorRegistry`（注册、查找、健康检查轮询） | Registry 可用 |
| 1.4.4 | 编写 ConnectorAdapter 单元测试（mock adapter） | 测试覆盖 |

**依赖关系：** 依赖 1.1（项目骨架）；与 1.3 可并行。

#### 1.5 TG Adapter 实现

| # | 子任务 | 产出 |
|---|--------|------|
| 1.5.1 | 实现 TG Adapter HTTP Client（封装 TDLib Service 的 HTTP API） | HTTP 调用层 |
| 1.5.2 | 实现入站事件映射：TDLib webhook/polling → `InboundMessageEvent` | 入站可用 |
| 1.5.3 | 实现出站发送：`sendMessage` → HTTP POST TDLib Service | 出站可用 |
| 1.5.4 | 实现连接管理：connect/disconnect/getConnectionStatus | 生命周期可用 |
| 1.5.5 | 集成测试：Docker 环境内 TG 收发消息端到端验证 | E2E 通过 |

**依赖关系：** 依赖 1.3（TDLib 验证通过）+ 1.4（接口定义）。

#### 1.6 Tracy 本地化 + 共享类型

| # | 子任务 | 产出 |
|---|--------|------|
| 1.6.1 | Clone Tracy 源码，按 README 本地跑通 | Tracy API 本地可调用 |
| 1.6.2 | 将 Tracy 加入 Docker Compose（或独立启动脚本） | 开发环境完整 |
| 1.6.3 | 从 Tracy 源码提取 contracts 类型定义到 `src/shared/tracy-contracts/` | kHub 可 import |
| 1.6.4 | 验证 Tracy `/auth/login` + `/translate` 一次往返 | 联调基线通过 |

**依赖关系：** 1.6.1 无依赖（CTO 推代码后即可开始）；1.6.2 依赖 1.2.1；1.6.3 依赖 1.6.1；1.6.4 依赖 1.6.2 + 1.1。

#### Phase 1 执行顺序总览

```
Week 1:
  1.1 项目骨架 ──────────────────────────────────────►
  1.2 Docker Compose ────────────────────────────────►
  1.3 TDLib 验证 ────────────────────────────────────► (可与 1.1/1.2 并行)

Week 2:
  1.4 ConnectorAdapter 接口 ─────► (依赖 1.1)
  1.5 TG Adapter 实现 ──────────► (依赖 1.3 + 1.4)
  1.6 Tracy 本地化 ─────────────► (CTO 推代码后)
```

**出口标准：** Docker Compose 一键启动全部服务；TDLib 容器内稳定收发 TG 消息；ConnectorAdapter 接口定义完成并有 TG 实现；Tracy 本地可调用。

---

### Phase 2：Message Core + 数据层打通（第 3-4 周）

#### 2.1 数据层搭建

| # | 子任务 | 产出 |
|---|--------|------|
| 2.1.1 | 配置 Drizzle ORM + PG 连接 | ORM 可用 |
| 2.1.2 | 编写 `khub_raw_events` 表 schema + migration | 表创建成功 |
| 2.1.3 | 编写 `khub_accounts` 表 schema + migration | 表创建成功 |
| 2.1.4 | 编写 `khub_visibility_policies` + `khub_visibility_audit_log` schema | 表创建成功 |
| 2.1.5 | 验证 Tracy `message_raw` 增强字段存在（D-01 方案 C） | 字段可写入 |

**依赖关系：** 依赖 Phase 1 完成（PG 可用 + 项目骨架）；2.1.1 → 2.1.2~2.1.4 串行；2.1.5 依赖 Tracy 本地跑通。

#### 2.2 Event Bus 基础设施

| # | 子任务 | 产出 |
|---|--------|------|
| 2.2.1 | 实现 typed EventEmitter（L1 进程内事件） | 事件类型安全 |
| 2.2.2 | 定义完整事件目录（message.*、account.*、visibility.*） | 事件类型定义 |
| 2.2.3 | 实现 BullMQ 封装（L2 异步队列：出站重试、过期回收） | 队列可用 |
| 2.2.4 | 编写 Event Bus 单元测试 | 测试覆盖 |

**依赖关系：** 依赖 1.1（项目骨架）+ Redis 可用；与 2.1 可并行。

#### 2.3 Tracy Client 封装

| # | 子任务 | 产出 |
|---|--------|------|
| 2.3.1 | 实现 `tracy-client` 模块骨架（HTTP client + 重试 + trace-id 注入） | 基础 HTTP 层 |
| 2.3.2 | 封装 `POST /ingest/message_raw`（入站/出站写入） | ingest 可调用 |
| 2.3.3 | 封装 `POST /translate`（翻译调用） | 翻译可调用 |
| 2.3.4 | 封装 `GET /analysis_pack`（分析结果轮询） | 分析可查询 |
| 2.3.5 | 封装 `POST /auth/login`（鉴权） | 登录可用 |

**依赖关系：** 依赖 1.6（Tracy 本地可调用 + contracts 类型）；与 2.1/2.2 可并行。

#### 2.4 Message Core 入站链路

| # | 子任务 | 产出 |
|---|--------|------|
| 2.4.1 | 实现入站消息处理器：Adapter 事件 → 写 khub_raw_events | 事件落库 |
| 2.4.2 | 对接 Tracy ingest：POST /ingest/message_raw → 获取 conversation_seq | 序号分配 |
| 2.4.3 | 回填 khub_raw_events（status=ingested, conversation_seq） | 状态更新 |
| 2.4.4 | 触发翻译：POST /translate → 结果回写 | 翻译链路通 |
| 2.4.5 | 发布 `message.received` 事件 | 事件总线联通 |
| 2.4.6 | platform_msg_id 去重逻辑（唯一索引 + 409 处理） | 去重可用 |

**依赖关系：** 依赖 2.1（表就绪）+ 2.2（Event Bus）+ 2.3（Tracy Client）+ 1.5（TG Adapter）。

#### 2.5 Message Core 出站链路

| # | 子任务 | 产出 |
|---|--------|------|
| 2.5.1 | 实现出站消息状态机（pending → sent → delivered → read / failed / timeout） | 状态流转 |
| 2.5.2 | 出站流程：写 khub_raw_events → POST Tracy ingest → ConnectorAdapter.sendMessage | 发送链路 |
| 2.5.3 | 实现重试策略（BullMQ job：5xx 退避、429 遵守 retry_after、4xx 不重试） | 重试可用 |
| 2.5.4 | 状态回写：成功/失败更新 khub_raw_events + Tracy message_raw | 状态同步 |
| 2.5.5 | 发布 `message.sent` / `message.failed` 事件 | 事件联通 |

**依赖关系：** 依赖 2.4 完成（入站链路验证了基础设施）。

#### 2.6 WA Adapter 实现

| # | 子任务 | 产出 |
|---|--------|------|
| 2.6.1 | 实现 WA Adapter HTTP Client（调用 Go:9800） | HTTP 层 |
| 2.6.2 | 实现入站事件映射：Go:9800 webhook → `InboundMessageEvent` | 入站可用 |
| 2.6.3 | 实现出站发送：`sendMessage` → HTTP POST Go:9800 | 出站可用 |
| 2.6.4 | 注册到 ConnectorRegistry，验证双平台并行工作 | 双平台可用 |

**依赖关系：** 依赖 1.4（ConnectorAdapter 接口）；与 2.4/2.5 可并行。

#### 2.7 端到端联调

| # | 子任务 | 产出 |
|---|--------|------|
| 2.7.1 | TG 入站全链路：收消息 → 落库 → Tracy ingest → 翻译 → 分析 | 入站 E2E 通过 |
| 2.7.2 | TG 出站全链路：发送 → Tracy ingest → Adapter 发送 → 状态回写 | 出站 E2E 通过 |
| 2.7.3 | 编写集成测试（testcontainers：PG + Redis） | CI 可跑 |

**依赖关系：** 依赖 2.4 + 2.5 完成。

#### Phase 2 执行顺序总览

```
Week 3:
  2.1 数据层 ──────────────────►
  2.2 Event Bus ───────────────► (与 2.1 并行)
  2.3 Tracy Client ────────────► (与 2.1/2.2 并行)
  2.6 WA Adapter ──────────────► (与 2.1~2.3 并行)

Week 4:
  2.4 入站链路 ────────────────► (依赖 2.1 + 2.2 + 2.3)
  2.5 出站链路 ────────────────► (依赖 2.4)
  2.7 端到端联调 ──────────────► (依赖 2.4 + 2.5)
```

**出口标准：** TG 收到消息 → khub_raw_events 落库 → Tracy ingest 返回 conversation_seq → 翻译完成 → 分析结果可查；出站消息发送成功并回写状态。

---

### Phase 3：WebSocket + 实时推送（第 5-6 周）

#### 3.1 WebSocket Gateway 核心

| # | 子任务 | 产出 |
|---|--------|------|
| 3.1.1 | Fastify WebSocket 插件集成 + 连接管理器 | WS 可建连 |
| 3.1.2 | 实现鉴权：建连时 JWT 验签 + role=sales 校验 | 鉴权可用 |
| 3.1.3 | 实现心跳：ping/pong + 90s 超时断连 | 心跳可用 |
| 3.1.4 | 实现服务端推送协议（ServerPushEvent 格式） | 推送格式定义 |
| 3.1.5 | 实现客户端命令协议（ClientCommand 解析 + 路由） | 命令处理 |

**依赖关系：** 依赖 Phase 1（Fastify 骨架）+ config 模块（JWT_SECRET）。

#### 3.2 推送管道 + 断线缓冲

| # | 子任务 | 产出 |
|---|--------|------|
| 3.2.1 | Event Bus → WS Gateway 桥接（订阅 message.* 事件 → 推送） | 事件驱动推送 |
| 3.2.2 | 推送 scope 过滤（只推该 sales 负责的会话） | 精准推送 |
| 3.2.3 | 断线缓冲：Redis Sorted Set 存储离线消息（TTL=5min） | 缓冲可用 |
| 3.2.4 | 增量同步：`sync.request` 命令 → 返回 last_sync_seq 之后的消息 | 同步可用 |
| 3.2.5 | Redis Pub/Sub fan-out（多实例横扩支持） | 多实例就绪 |

**依赖关系：** 依赖 3.1（WS 核心）+ 2.2（Event Bus）。

#### 3.3 ViewProjector 集成

| # | 子任务 | 产出 |
|---|--------|------|
| 3.3.1 | 实现 ViewProjector 核心逻辑（策略读取 + 字段过滤） | 投影可用 |
| 3.3.2 | 集成到 WS 推送管道（所有推送经过 ViewProjector） | WS 推送脱敏 |
| 3.3.3 | 集成到 REST API 中间件（所有响应经过 ViewProjector） | API 响应脱敏 |
| 3.3.4 | Redis 策略缓存 + `visibility.changed` 事件触发失效 | 缓存机制 |

**依赖关系：** 依赖 3.1（WS 可用）+ 2.1（visibility_policies 表就绪）。

#### 3.4 REST API 层

| # | 子任务 | 产出 |
|---|--------|------|
| 3.4.1 | `POST /api/khub/messages/send`（出站发消息） | 发送 API |
| 3.4.2 | `GET /api/khub/messages/history`（代理 Tracy /replay） | 历史 API |
| 3.4.3 | 请求校验中间件（Trace ID、JWT、入参 schema） | 通用中间件 |
| 3.4.4 | CORS 配置（允许 workbench.huidu.ai + admin.huidu.ai） | 跨域可用 |

**依赖关系：** 依赖 3.3（ViewProjector）+ 2.3（Tracy Client）。

#### 3.5 Plugin Config 集成

| # | 子任务 | 产出 |
|---|--------|------|
| 3.5.1 | 实现 Plugin Config 拉取模块（GET /plugin/config/resolved → 过滤 khub.*） | 配置可读 |
| 3.5.2 | 30s 轮询更新 + 变更检测 | 动态配置 |
| 3.5.3 | 在 Tracy 本地源码中添加 khub.* 配置项 | 配置存在 |

**依赖关系：** 依赖 2.3（Tracy Client）；与 3.1~3.4 可并行。

#### Phase 3 执行顺序总览

```
Week 5:
  3.1 WS Gateway 核心 ─────────────────────────────►
  3.5 Plugin Config ───────────────────────────────► (与 3.1 并行)
  3.2 推送管道 + 断线缓冲 ─────────────────────────► (依赖 3.1)

Week 6:
  3.3 ViewProjector 集成 ──────────────────────────► (依赖 3.1 + 3.2)
  3.4 REST API 层 ─────────────────────────────────► (依赖 3.3)
```

**出口标准：** WS 建连鉴权通过；入站消息实时推送到客户端（经 ViewProjector 脱敏）；REST API 可发消息、查历史；断线重连后增量同步正常。

---

### Phase 4：Visibility + Account Core + 收尾（第 7-8 周）

#### 4.1 Visibility Control 完整实现

| # | 子任务 | 产出 |
|---|--------|------|
| 4.1.1 | 策略 CRUD API：`GET/POST/DELETE /api/khub/visibility/policies` | API 可用 |
| 4.1.2 | 审计日志 API：`GET /api/khub/visibility/audit-log` | 审计可查 |
| 4.1.3 | 定时回收：每 60s 扫描过期策略 → 自动撤销 → 写审计日志 | 回收可用 |
| 4.1.4 | 实时推送：策略变更 → `visibility.changed` 事件 → WS 推送 | 实时生效 |
| 4.1.5 | 端到端验证：创建策略 → sales 3 秒内看到字段 → 撤销 → 字段消失 | E2E 通过 |

**依赖关系：** 依赖 3.3（ViewProjector 已集成）+ 3.2（WS 推送管道）。

#### 4.2 Account Core

| # | 子任务 | 产出 |
|---|--------|------|
| 4.2.1 | 账号 CRUD API：`GET/POST/DELETE /api/khub/accounts` | API 可用 |
| 4.2.2 | 连接管理 API：`POST /accounts/:id/connect`、`POST /accounts/:id/disconnect` | 连接控制 |
| 4.2.3 | 事件历史 API：`GET /accounts/:id/events` | 事件可查 |
| 4.2.4 | 凭据加密存储（AES-256-GCM，credentials_ref 引用） | 凭据安全 |
| 4.2.5 | 健康检查：每 30s 轮询 ConnectorAdapter.getConnectionStatus | 健康监控 |
| 4.2.6 | 自动重连：断连检测 → 指数退避重连 → 超阈值告警 | 自动恢复 |
| 4.2.7 | `account.status_changed` 事件 → WS 推送 | 状态实时 |

**依赖关系：** 依赖 1.4（ConnectorRegistry）+ 2.1（khub_accounts 表）+ 3.1（WS Gateway）。

#### 4.3 Tracy 侧改造对接（CTO 推代码后）

| # | 子任务 | 产出 |
|---|--------|------|
| 4.3.1 | 验证 D-03：RBAC grant_visibility_policy capability 生效 | 权限可用 |
| 4.3.2 | 验证 D-08：Admin SPA Visibility 管理页可操作 | 管理页可用 |
| 4.3.3 | 验证 D-08：Admin SPA Account Health 页可操作 | 管理页可用 |
| 4.3.4 | 端到端：Admin 创建策略 → kHub API → WS 推送 → 工作台生效 | 全链路通 |

**依赖关系：** 依赖 CTO 推代码 + 4.1/4.2 完成。

#### 4.4 集成测试 + 质量收尾

| # | 子任务 | 产出 |
|---|--------|------|
| 4.4.1 | 核心模块单元测试补全（message、visibility、ws 覆盖率 > 80%） | 测试报告 |
| 4.4.2 | 集成测试：testcontainers 全链路（PG + Redis + mock Connector） | CI 绿灯 |
| 4.4.3 | 压测：模拟 500 WS 并发 + 350 条/分钟消息吞吐 | 性能报告 |
| 4.4.4 | 安全审查：JWT 校验、凭据加密、SQL 注入、XSS | 安全清单 |
| 4.4.5 | 部署文档 + Docker Compose 生产配置 + 上线手册 | 文档交付 |

**依赖关系：** 依赖 4.1 + 4.2 完成；4.4.3 可与 4.3 并行。

#### Phase 4 执行顺序总览

```
Week 7:
  4.1 Visibility Control ──────────────────────────►
  4.2 Account Core ────────────────────────────────► (与 4.1 并行)

Week 8:
  4.3 Tracy 侧对接验证 ───────────────────────────► (依赖 CTO + 4.1/4.2)
  4.4 集成测试 + 收尾 ────────────────────────────► (依赖 4.1 + 4.2)
```

**出口标准：** 可见性策略实时生效（3 秒内），多账号同时在线，核心模块测试覆盖率 > 80%，压测通过，1-2 个真实业务员开始内测。

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
| Phase 1 TDLib 验证失败 | TG Connector 不可用 | 中 | Phase 1 第一优先验证；备选：TDLib 独立 Docker 容器 + HTTP API 封装 |
| Tracy 源码本地跑不通 | 数据层对接延迟 | 低 | CTO 提供 README / docker-compose，必要时远程协助 |
| Tracy 节奏不匹配 | D 档改造延迟 | 中 | Phase 1-3 完全不依赖 Tracy 改造；Phase 4 才需要 D-03/D-08 |
| kHub 被 Tracy 限流 | 翻译/分析请求被拒 | 低 | 本地部署无限流问题；生产环境加白名单或单独限流桶 |
| WS 连接数超预期 | 内存/CPU 不足 | 低 | Redis Pub/Sub 支持多实例横扩 |
| PostgreSQL 共享性能 | kHub 读写影响 Tracy | 低 | khub_ 前缀隔离，kHub 读写量远小于 Tracy |

---

## 13. 待对齐事项

| # | 事项 | 状态 | 结论 |
|---|------|------|------|
| 1 | Postgres 共享 vs 双库 | ✅ 已确认 | 共享（khub_ 前缀隔离） |
| 2 | message_raw 增强方案 | ✅ 已确认 | 方案 C（加字段不迁移） |
| 3 | unified-contract 合并方向 | ✅ 已关闭 | V1 单一消费方，不需要协议层 |
| 4 | 历史数据切换日 | ✅ 已关闭 | 旧扩展只内测过、无客户使用，kHub V1 上线全员直接用 |
| 5 | Tracy staging 环境 | ✅ 已关闭 | Clone Tracy 源码本地跑，不需要远程 staging |
| 6 | Connector 接 Tracy TG/WA 的方式 | ✅ 已确认 | HTTP（与现有 Go:9800 风格一致） |
| 7 | BullMQ 是否独立 | 待确认 | kHub 和 Tracy 各自独立 BullMQ，需确认无冲突 |

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
