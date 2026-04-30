# AGENTS.md — kHub IM Core

## 项目定位

kHub 是 IM 平台壳层的后端核心服务。职责：把多平台 IM Connector 接入进来，经过 Tracy 已有的翻译/分析管道处理，通过 WebSocket 实时推送给前端。

**本项目只包含后端服务（kHub IM Core）。** 销售工作台 SPA 和管理后台 SPA 是独立项目，kHub 负责实现它们所需的 API。

---

## 技术栈

| 层级 | 选型 |
|------|------|
| 语言 | TypeScript (strict mode) |
| 运行时 | Node.js 20 LTS |
| 框架 | Fastify |
| ORM | Drizzle ORM |
| 数据库 | PostgreSQL 14+（共享 Tracy 实例，kHub 表统一 `khub_` 前缀） |
| 缓存/队列 | Redis 6.2+（kHub 独立实例） |
| 对象存储 | MinIO |
| 实时推送 | WebSocket + Redis Pub/Sub |
| 任务队列 | BullMQ（基于 kHub Redis） |
| 进程内事件 | typed EventEmitter |
| 容器化 | Docker Compose（开发）/ Helm（生产） |
| 监控 | Prometheus + Grafana + OpenTelemetry |

---

## 架构约束

### 数据隔离

- kHub 新建表统一使用 `khub_` 前缀
- kHub 不直读 Tracy 业务表，所有 Tracy 数据通过 HTTP API 获取
- 唯一例外：Tracy `message_raw` 表的增强字段（D-01 方案 C），kHub 通过 `POST /ingest/message_raw` 写入
- Tracy 不直读 kHub 表

### conversation_seq

- 由 Tracy ingest 路由通过 PG advisory lock 分配，单调递增
- kHub 不在本地生成序号
- 是消息排序的唯一权威

### 事件总线

- L1 进程内同步：typed EventEmitter（模块间零延迟通信）
- L2 异步任务队列：BullMQ（出站重试、过期回收、断线缓冲清理）
- 不需要协议层抽象，kHub 只服务销售工作台单一消费方

### Connector 通信

- TG Adapter 和 WA Adapter 均通过 HTTP 调用各自的 Connector 服务
- TG：HTTP 调用 TDLib Service（Docker 容器）
- WA：HTTP 调用 Go Service（:9800）
- 风格统一，都是 HTTP Client

---

## 模块结构

```
src/
├── connector/          # ConnectorAdapter 接口、Registry、TG/WA Adapter
├── message/            # Message Core、入站/出站链路、状态机
├── ws/                 # WebSocket Gateway、心跳、增量同步、Redis Pub/Sub
├── visibility/         # ViewProjector、策略 CRUD、定时回收、审计
├── account/            # 多账号管理、凭据加密、健康检查
├── event-bus/          # typed EventEmitter + BullMQ 封装
├── tracy-client/       # Tracy HTTP API 调用封装（translate、ingest、analysis 等）
├── api/                # Fastify 路由（REST API for 销售工作台 + 管理后台）
│   ├── visibility/     # /api/khub/visibility/* — 管理后台调用
│   ├── accounts/       # /api/khub/accounts/* — 管理后台调用
│   ├── messages/       # /api/khub/messages/* — 销售工作台调用
│   └── health/         # /health, /ready
├── db/                 # Drizzle schema、migrations
├── config/             # 环境变量、Plugin Config 拉取
└── shared/             # 共享类型、工具函数、错误码
```

---

## 数据模型

### kHub 新建表

| 表名 | 职责 |
|------|------|
| `khub_raw_events` | 原始事件缓冲，入站/出站事件存档，状态追踪 |
| `khub_accounts` | 受控 IM 账号管理，凭据引用，连接状态 |
| `khub_visibility_policies` | 可见性策略白名单，控制 sales 可见字段 |
| `khub_visibility_audit_log` | 可见性操作审计日志 |

### Tracy 增强字段（message_raw 表）

kHub 通过 `POST /ingest/message_raw` 写入以下字段：
- `conversation_seq` — 消息排序序号
- `platform_msg_id` — 平台原始消息 ID（去重用）
- `status` — 消息状态（received/pending/sent/delivered/read/failed/timeout）
- `agent_platform_account` — 多账号隔离字段

### ID 命名规范

| ID 类型 | 格式 | 示例 |
|--------|------|------|
| conversation_id | `<platform>::<native_conversation_id>` | `telegram::123456789` |
| message_id | `<platform>::<native_conversation_id>::<native_message_id>` | `telegram::123456789::987` |
| platform_msg_id | `<native_message_id>` | `987` |
| 内部实体 ID | UUID v4 | — |

完整 DDL 见 `docs/v1/kHub_data_model_v1.md`。

---

## API 设计规范

### 通用约定

| 约定 | 说明 |
|------|------|
| 认证 | `Authorization: Bearer {jwt}`（与 Tracy 共享 JWT_SECRET） |
| Content-Type | `application/json` |
| Trace ID | `X-Trace-Id: {ulid}`（所有请求必须携带） |
| Client 标识 | `X-Client: khub-im-core` / `khub-workbench` / `tracy-admin` |
| 时间戳 | UTC 毫秒级 Unix timestamp |
| 成功响应 | `{ ok: true, data: T }` |
| 失败响应 | `{ ok: false, error: { code, message, retryable } }` |
| 分页响应 | `{ ok: true, data: { items: T[], total, page, limit } }` |

### 错误码前缀

所有 kHub 错误码以 `KHUB_` 开头：
- `KHUB_AUTH_REQUIRED` (401)
- `KHUB_ACCOUNT_NOT_CONNECTED` (503)
- `KHUB_CONNECTOR_ERROR` (502)
- `KHUB_INVALID_CONVERSATION_ID` (400)
- `KHUB_VISIBILITY_DENIED` (403)
- `KHUB_RATE_LIMITED` (429)
- `KHUB_INTERNAL_ERROR` (500)

### API 路由总览

**销售工作台消费的 API：**
- `POST /api/khub/messages/send` — 发送消息
- `GET /api/khub/messages/history` — 历史消息（代理 Tracy /replay）
- `WS /ws` — WebSocket 实时推送

**管理后台消费的 API：**
- `GET/POST/DELETE /api/khub/visibility/policies` — 可见性策略 CRUD
- `GET /api/khub/visibility/audit-log` — 审计日志
- `GET/POST/DELETE /api/khub/accounts` — 账号管理
- `POST /api/khub/accounts/:id/connect` — 触发连接
- `POST /api/khub/accounts/:id/disconnect` — 断开连接
- `GET /api/khub/accounts/:id/events` — 账号事件历史

完整 API 定义见 `docs/v1/kHub_dashboard_ext_v1.md` §4。

---

## WebSocket 协议

### 服务端推送事件

| 事件类型 | 触发时机 |
|---------|---------|
| `message.new` | 入站新消息 |
| `message.translated` | 翻译完成 |
| `message.analyzed` | 分析完成 |
| `message.sent_pending` | 出站发送中 |
| `message.sent` | 出站发送成功 |
| `message.status` | 状态变更（delivered/read） |
| `message.failed` | 发送失败 |
| `visibility.changed` | 可见性策略变更 |
| `account.status_changed` | 账号状态变更 |
| `sync` | 增量同步数据 |

### 客户端命令

| 命令 | 说明 |
|------|------|
| `auth` | 建连时发送 JWT |
| `message.send` | 发送消息 |
| `read.ack` | 已读回执 |
| `sync.request` | 增量同步请求 |
| `ping` | 心跳（30s 间隔） |

### 关键机制

- 心跳：客户端每 30s 发 ping，连续 3 次无响应（90s）判定断连
- 重连：指数退避 1s → 2s → 4s → 8s → 16s → 30s（上限）
- 断线缓冲：Redis Sorted Set，TTL = 5 分钟
- 鉴权：建连时发送 JWT，验签后校验 `role === 'sales'`
- 推送过滤：所有推送必须经过 ViewProjector 投影

---

## 消息链路

### 入站

```
外部 IM 平台 → Connector Service → kHub TG/WA Adapter (HTTP)
  → 写 khub_raw_events (status=pending)
  → POST Tracy /ingest/message_raw → Tracy 返回 conversation_seq
  → 回填 khub_raw_events (status=ingested)
  → WS 推 message.new（经 ViewProjector）
  → 轮询 Tracy /analysis_pack → WS 推 message.analyzed
```

### 出站

```
销售员确认发送
  → POST Tracy /ingest/message_raw (direction=out)
  → 写 khub_raw_events (direction=outbound)
  → WS 推 message.sent_pending
  → ConnectorAdapter.sendMessage() via HTTP
  → 成功: status=sent → WS 推 message.sent
  → 失败: status=failed → WS 推 message.failed
```

### 出站重试策略

| 错误类型 | 策略 | 最大重试 |
|---------|------|---------|
| 网络 5xx | 指数退避 1s→2s→4s | 3 次 |
| 429 | 遵守 retry_after | 无限 |
| 401/400/封号 | 不重试 | 0 |

---

## 可见性控制

- 白名单模式：默认脱敏，授权后可见
- ViewProjector 中间件：所有 API 和 WS 响应必须经过此中间件
- 策略缓存：Redis，由 `visibility.changed` 事件触发失效
- 定时回收：每 60s 扫描过期策略，自动撤销并写审计日志
- 实时性目标：策略变更到客户端感知 < 3 秒

**默认可见字段：** conversation_id, anonymized_alias, lead_status, 消息内容, 时间, language, platform_kind

**默认不可见字段（需授权）：** real_name, phone, email, platform_username, avatar_url, platform_user_id

---

## 开发规范

### 代码风格

- TypeScript strict mode，不允许 `any`、`@ts-ignore`、`@ts-expect-error`
- 使用 Drizzle ORM 的类型安全查询，不写裸 SQL（migration 除外）
- 错误处理：不允许空 catch 块，所有错误必须记录或传播
- 日志：JSON 结构化日志，包含 trace_id
- 环境变量：通过 config 模块统一读取和校验，不在业务代码中直接 `process.env`

### 命名约定

| 类型 | 风格 | 示例 |
|------|------|------|
| 文件名 | kebab-case | `connector-adapter.ts` |
| 类/接口 | PascalCase | `ConnectorAdapter` |
| 函数/变量 | camelCase | `sendMessage` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| 数据库表 | snake_case + `khub_` 前缀 | `khub_raw_events` |
| 数据库字段 | snake_case | `conversation_seq` |
| API 路由 | kebab-case | `/api/khub/visibility/audit-log` |
| 事件名 | dot.separated | `message.new` |

### 测试

- 单元测试：Vitest
- 集成测试：Vitest + testcontainers（PG/Redis）
- Connector 测试：mock HTTP 调用
- 覆盖率目标：核心模块（message、visibility、ws）> 80%

### Git 约定

- 分支命名：`feat/xxx`、`fix/xxx`、`refactor/xxx`
- Commit message：conventional commits（`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`）
- 不允许直接 push main

---

## Tracy 对接

### kHub 调用 Tracy 的 API

| 用途 | 端点 |
|------|------|
| 登录鉴权 | `POST /auth/login` |
| 翻译 | `POST /translate` |
| 消息写入 | `POST /ingest/message_raw` |
| 分析结果 | `GET /analysis_pack` |
| 会话摘要 | `GET /state_digest` |
| 建议回复 | `GET /select_action` |
| 客户列表 | `GET /v22/leads/list` |
| 客户操作 | `POST /v22/leads/mark`, `POST /v22/leads/display_name` |
| 历史消息 | `GET /replay` |
| 插件配置 | `GET /plugin/config/resolved` |
| 遥测上报 | `POST /telemetry/ingest` |
| 告警上报 | `POST /alerts/ingest` |

### 调用规范

- Base URL 从环境变量 `TRACY_API_BASE_URL` 读取
- 所有请求携带 `X-Trace-Id` (ULID) 和 `X-Client: khub-im-core`
- 重试策略：5xx 指数退避最多 3 次，429 遵守 retry_after，4xx 不重试
- Tracy 源码 clone 到本地运行，开发阶段不依赖远程 staging

---

## 部署

### Docker Compose（开发环境）

```
services:
  - postgres (共享实例)
  - redis (kHub 独立)
  - minio
  - tdlib-service (TG Connector)
  - tracy-core (本地 Tracy)
  - khub-im-core (本项目)
```

### 健康检查

- `/health` — 存活探针
- `/ready` — 就绪探针（含 DB/Redis/Connector 状态检查）

### 环境变量（关键）

| 变量 | 说明 |
|------|------|
| `TRACY_API_BASE_URL` | Tracy Core API 地址 |
| `DATABASE_URL` | PostgreSQL 连接串 |
| `REDIS_URL` | Redis 连接串 |
| `MINIO_ENDPOINT` | MinIO 地址 |
| `JWT_SECRET` | 与 Tracy 共享的 JWT 密钥 |
| `KHUB_ENCRYPTION_KEY` | 凭据加密密钥（AES-256-GCM） |

---

## 参考文档

| 文档 | 路径 | 内容 |
|------|------|------|
| 实施计划 | `docs/v1/kHub_plan_v1-2.md` | 架构、模块、路线图、风险 |
| 技术规格 | `docs/v1/kHub_plan_ts_v1.md` | 接口定义、协议细节、实现伪代码 |
| 数据模型 | `docs/v1/kHub_data_model_v1.md` | 表结构 DDL、索引、生命周期 |
| 管理后台 API | `docs/v1/kHub_dashboard_ext_v1.md` | Visibility + Account Health API 定义 |
| 销售工作台 PRD | `docs/v1/kHub_workbench_prd_v1.md` | 前端功能需求（独立项目，kHub 提供 API） |
