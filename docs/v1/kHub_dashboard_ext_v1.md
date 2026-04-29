# kHub 管理看板扩展产品文档 v1

## 1. 文档信息

| 字段 | 内容 |
|------|------|
| 标题 | kHub 管理看板扩展产品文档 |
| 版本 | v1 |
| 日期 | 2026-04-29 |
| 状态 | 初稿 |
| 关联文档 | kHub_plan_v1-2.md, 09-admin-spa-inventory.md, 08-admin-spa-additions.md |

---

## 2. 概述与定位

本文档描述在 Tracy Admin SPA（admin.huidu.ai）中新增的两个管理页面，分别支撑 kHub 的 **Visibility Control**（可见性策略管理）和 **Account Health**（账号健康管理）功能。

### 为什么在 Tracy Admin SPA 加页面，而不是在销售工作台

kHub 的管理操作面向 boss、supervisor、lead 角色，而销售工作台面向 sales 角色，两者用户群体不同。把管理功能塞进销售工作台既不符合角色权限模型，也会增加工作台的复杂度。Tracy Admin SPA 已有完整的框架、组件库、权限体系和部署管线，且目标用户正好是管理角色。所以把这两个管理页面放在 Admin SPA 中是最合理的选择。

### 各方职责

```
┌──────────────────────┐        ┌──────────────────────┐
│   Tracy 团队负责     │        │    kHub 团队负责      │
│                      │        │                      │
│  - 页面 UI 开发      │        │  - 后端 API 实现      │
│  - 路由与权限集成     │        │  - 数据存储与缓存     │
│  - 跨域 API 调用      │        │  - 事件总线与 WS 推送  │
│  - i18n 翻译         │        │  - 审计日志           │
└──────────┬───────────┘        └──────────┬───────────┘
           │                               │
           └──────── API 契约 ─────────────┘
```

---

## 3. 功能模块

### 3.1 Visibility Policy 管理页

#### 功能概述

管理可见性策略，控制哪些销售员能看到哪些客户的敏感信息字段（真实姓名、手机号、邮箱、平台用户名、头像等）。比如 supervisor 给某个 sales 授予"查看 A 客户手机号"的权限，并设置过期时间。

#### 页面入口

`/khub/visibility`

#### 页面布局

```
┌─────────────────────────────────────────────────────────────┐
│  可见性策略管理                          [+ 新建策略]        │
├─────────────────────────────────────────────────────────────┤
│  Viewer用户 [___▼___]  Scope类型 [___▼___]  状态 [___▼___]  │
├─────┬────────┬──────┬─────────┬────────┬─────────┬─────────┤
│Viewer│Scope类型│Scope ID│授权字段 │ 到期时间 │  状态  │  操作  │
├─────┼────────┼──────┼─────────┼────────┼─────────┼─────────┤
│张三 │customer│C-0042│手机号... │2026-06 │  有效  │ [撤销]  │
│李四 │team    │T-SZ01│全字段   │永久     │  有效  │ [撤销]  │
│王五 │tenant  │*      │姓名     │2026-03 │ 已过期 │   --    │
├─────┴────────┴──────┴─────────┴────────┴─────────┴─────────┤
│                     < 1  2  3  4  5 >                       │
└─────────────────────────────────────────────────────────────┘
```

点击策略行可展开查看审计日志。

#### 新建策略弹窗

```
┌─────────────────── 新建可见性策略 ───────────────────┐
│                                                      │
│  Viewer 用户:   [搜索并选择 sales 用户...]            │
│                                                      │
│  Scope 类型:    [conversation ▼]                     │
│                 conversation / customer / team /      │
│                 tenant                               │
│                                                      │
│  Scope ID:     [输入具体 ID，tenant 类型可为空]        │
│                                                      │
│  授权字段:                                            │
│    [x] 真实姓名  [x] 手机号  [ ] 邮箱               │
│    [x] 平台用户名 [ ] 头像                            │
│                                                      │
│  过期时间:     [2026-06-30 ▼]  (留空=永久)            │
│                                                      │
│  授权原因:     [_________________________________]     │
│                                                      │
│              [取消]                    [确认创建]       │
└──────────────────────────────────────────────────────┘
```

#### 核心工作流

**工作流 1: 授予可见性**

supervisor/boss 登录 Admin → 进入 Visibility 页面 → 点击"新建策略" → 搜索并选择 sales 用户 → 选择 scope 类型和 ID → 勾选需要授权的字段 → 设置过期时间 → 填写原因 → 确认创建。kHub 写入策略并推送通知，被授权的 sales 在 3 秒内即可在销售工作台看到相应字段。

**工作流 2: 撤销可见性**

在策略列表中找到目标策略 → 点击"撤销" → 二次确认 → 策略立即失效。kHub 清除 Redis 缓存，通过 WS 推送 `visibility.changed` 事件，sales 工作台实时移除对应字段的展示。

**工作流 3: 审计查看**

点击策略行展开审计日志面板，展示该策略的全生命周期事件：创建、撤销、过期、字段变更，每条记录包含操作人、时间、详情。

#### 权限控制

| 角色 | 权限范围 |
|------|---------|
| boss | 可管理 tenant 级别策略（scope_type = tenant） |
| supervisor / lead | 可管理本团队范围内策略（scope_type = conversation / customer / team） |
| sales | 无权限进入此页面 |

页面显示前置条件：当前登录用户具有 `grant_visibility_policy` capability。

#### 信息流

```
Admin SPA (Tracy)
    │
    ▼ HTTP POST /api/khub/visibility/policies
kHub Visibility API
    │
    ├──► kHub DB (写入 khub_visibility_policies 表)
    ├──► kHub Redis (写入策略缓存 / 失效旧缓存)
    └──► kHub Event Bus (publish: visibility.changed)
              │
              ▼
         WS Gateway
              │
              ▼
         销售工作台 (ViewProjector 重新投影，UI 实时更新)
```

---

### 3.2 Account Health 管理页

#### 功能概述

多平台多账号 IM 连接状态总览。查看所有业务员的 Telegram / WhatsApp 账号连接健康状况，支持主动重连、禁用、删除等操作。让管理层能一眼看出哪些账号有问题，快速介入处理。

#### 页面入口

`/khub/accounts`

#### 页面布局

```
┌─────────────────────────────────────────────────────────────────────┐
│  账号健康管理                              [+ 新增账号]              │
├─────────────────────────────────────────────────────────────────────┤
│  平台 [TG/WA ▼]  业务员 [___▼___]  状态 [___▼___]   [刷新]         │
├──────┬──────┬──────┬─────────┬──────────┬──────────┬───────────────┤
│ 平台 │账号名│业务员│  状态   │最近连接  │  错误信息 │    操作       │
├──────┼──────┼──────┼─────────┼──────────┼──────────┼───────────────┤
│  TG  │Alice │ 张三  │ ●已连接 │10:32:05 │    --    │ [断开] [详情] │
│  WA  │Bob   │ 李四  │ ●重连中 │10:28:11 │timeout  │ [禁用] [详情] │
│  TG  │Carol │ 王五  │ ●断开   │09:15:00 │auth_fail│ [重连] [详情] │
│  WA  │Dave  │ 赵六  │ ●禁用   │ --      │    --    │ [启用] [删除] │
├──────┴──────┴──────┴─────────┴──────────┴──────────┴───────────────┤
│                        < 1  2  3  4  5 >                           │
└─────────────────────────────────────────────────────────────────────┘
状态色标:  ● 已连接(绿)  ● 重连中(黄)  ● 断开(红)  ● 禁用(灰)
```

#### 详情面板（展开行）

```
┌─────────────────────────────────────────────────────────────────┐
│  Alice (TG)  │  业务员: 张三  │  状态: ●已连接  │  ID: acct_001 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  最近事件:                                                       │
│  10:32:05  connected     成功建立连接                             │
│  10:31:58  connecting    正在尝试连接...                          │
│  10:30:00  reconnecting  检测到断开，自动重连                      │
│  09:55:00  error         connection_lost, retrying in 30s        │
│  09:54:55  disconnected  网络异常断开                             │
│                                                                 │
│  最近错误:  无                                                  │
│                                                                 │
│  [断开连接]  [禁用账号]  [删除账号]                               │
└─────────────────────────────────────────────────────────────────┘
```

#### 新增账号弹窗

```
┌─────────────────── 新增 IM 账号 ────────────────────┐
│                                                      │
│  平台:          [Telegram ▼]  (TG / WhatsApp)        │
│                                                      │
│  账号显示名:    [Alice                             ]  │
│                                                      │
│  归属业务员:    [搜索并选择...                   ]    │
│                                                      │
│  凭据文件:      [选择文件...]  (仅支持 .json/.zip)    │
│                 凭据在服务端加密存储，不会返回给客户端   │
│                                                      │
│              [取消]                    [确认创建]       │
└──────────────────────────────────────────────────────┘
```

创建后账号初始状态为 `inactive`，系统自动触发首次连接尝试。

#### 核心工作流

**工作流 1: 创建账号**

supervisor 进入 Account Health 页面 → 点击"新增账号" → 选择平台 → 填写显示名 → 指定归属业务员 → 上传加密凭据文件 → 确认。kHub 创建账号记录，凭据存入 keychain，然后自动发起首次连接。

**工作流 2: 日常监控**

管理员打开页面，通过颜色状态指示器快速定位异常账号。红色（断开）和黄色（重连中）的账号需要关注。点击行展开详情查看事件历史和错误信息。

**工作流 3: 故障处理**

发现某个账号长时间处于断开状态 → 展开详情查看错误类型（auth_fail / timeout / banned 等）→ 判断处理方式：如果是临时网络问题点击"立即重连"；如果是凭据失效则禁用后等待更新凭据；如果是平台封禁则标记并通知相关人。

**工作流 4: 账号生命周期**

```
inactive (新建)
    │
    ▼ (自动/手动触发连接)
connecting
    │
    ├─► connected ◄──── reconnecting ◄──── error
    │       │                                      │
    │       │ (主动断开)                            │ (超过重试上限)
    │       ▼                                      ▼
    │    inactive                              banned
    │       │
    │       │ (手动禁用)
    │       ▼
    │    disabled
    │
    │  (手动删除，所有状态均可)
    ▼
  deleted
```

#### 权限控制

| 角色 | 可见范围 |
|------|---------|
| boss / supervisor | 全部账号 |
| lead | 本团队账号（按 team ID 过滤） |
| sales | 仅看自己的账号（在销售工作台查看，不在此页面） |

#### 信息流

```
Admin SPA (Tracy)
    │
    ▼ HTTP POST /api/khub/accounts/:id/connect
kHub Account API
    │
    ├──► kHub DB (更新 khub_platform_accounts 状态)
    ├──► kHub ConnectorRegistry
    │         │
    │         ▼
    │    Connector Adapter (TG / WA SDK)
    │
    └──► kHub Event Bus (publish: account.status_changed)
              │
              ▼
         WS Gateway
              │
              ▼
         销售工作台 (连接状态指示器实时更新)
```

---

## 4. API 调用说明

### 4.1 通用约定

| 项目 | 说明 |
|------|------|
| Base URL | 由环境变量 `KHUB_API_BASE_URL` 配置，如 `https://api-khub.huidu.ai` |
| 认证方式 | Bearer JWT，使用 Tracy 登录同一套 token，kHub 侧校验 |
| 请求头 | `Content-Type: application/json`<br>`X-Trace-Id: {ulid}` (链路追踪)<br>`X-Client: tracy-admin` (客户端标识) |
| 成功响应 | `{ "ok": true, "data": T }` |
| 失败响应 | `{ "ok": false, "error": { "code": "string", "message": "string", "retryable": boolean } }` |
| 分页格式 | `{ "ok": true, "data": { "items": T[], "total": number, "page": number, "limit": number } }` |

> 凭据上传接口使用 `multipart/form-data`，其余接口均为 JSON。

### 4.2 Visibility Policy APIs

#### 查询策略列表

```
GET /api/khub/visibility/policies
```

**Query 参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| viewer_user_id | string | 否 | 按 viewer 用户筛选 |
| scope_type | string | 否 | conversation / customer / team / tenant |
| status | string | 否 | active / expired / revoked |
| page | number | 否 | 页码，默认 1 |
| limit | number | 否 | 每页条数，默认 20 |

**Response:**

```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": "vp_001",
        "viewer_user_id": "u_0042",
        "viewer_display_name": "张三",
        "scope_type": "customer",
        "scope_id": "C-0042",
        "scope_display_name": "深圳华强电子",
        "allowed_fields": ["real_name", "phone"],
        "granted_by": "u_0001",
        "granted_at": 1714300000000,
        "expires_at": 1780000000000,
        "status": "active",
        "reason": "需要跟进客户手机号"
      }
    ],
    "total": 47,
    "page": 1,
    "limit": 20
  }
}
```

#### 创建策略

```
POST /api/khub/visibility/policies
```

**Request Body:**

```json
{
  "viewer_user_id": "u_0042",
  "scope_type": "customer",
  "scope_id": "C-0042",
  "allowed_fields": ["real_name", "phone"],
  "expires_at": 1780000000000,
  "reason": "需要跟进客户手机号"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| viewer_user_id | string | 是 | 被授权的 sales 用户 ID |
| scope_type | string | 是 | conversation / customer / team / tenant |
| scope_id | string | 条件 | tenant 类型可为空，其余必填 |
| allowed_fields | string[] | 是 | 授权的字段列表 |
| expires_at | number / null | 否 | 过期时间 (unix ms)，null 或不传表示永久 |
| reason | string | 是 | 授权原因 |

**Response:** 返回创建后的完整策略对象。

**权限要求:** 调用者需具有 `grant_visibility_policy` capability，且 scope 不能超出调用者自身的管理权限范围。

#### 撤销策略

```
DELETE /api/khub/visibility/policies/:id
```

**Response:**

```json
{
  "ok": true,
  "data": {
    "revoked_at": 1714350000000
  }
}
```

**副作用:** 立即生效。kHub 清除 Redis 缓存，发布 `visibility.changed` 事件，WS Gateway 在 3 秒内推送给受影响的 sales 用户。

#### 查看审计日志

```
GET /api/khub/visibility/audit-log
```

**Query 参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| policy_id | string | 是 | 策略 ID |
| page | number | 否 | 页码 |
| limit | number | 否 | 每页条数 |

**Response:**

```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "event_type": "created",
        "actor_user_id": "u_0001",
        "timestamp": 1714300000000,
        "details": { "allowed_fields": ["real_name", "phone"], "reason": "..." }
      },
      {
        "event_type": "revoked",
        "actor_user_id": "u_0001",
        "timestamp": 1714350000000,
        "details": {}
      }
    ]
  }
}
```

event_type 枚举: `created` / `revoked` / `expired` / `fields_changed`

### 4.3 Account Health APIs

#### 查询账号列表

```
GET /api/khub/accounts
```

**Query 参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| owner_user_id | string | 否 | 按归属业务员筛选 |
| platform | string | 否 | telegram / whatsapp |
| status | string | 否 | connected / connecting / error / inactive / banned |
| page | number | 否 | 页码，默认 1 |
| limit | number | 否 | 每页条数，默认 20 |

**Response:**

```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": "acct_001",
        "platform": "telegram",
        "display_name": "Alice",
        "owner_user_id": "u_0042",
        "owner_display_name": "张三",
        "status": "connected",
        "last_connected_at": 1714350000000,
        "last_error": null,
        "created_at": 1714000000000
      }
    ],
    "total": 15,
    "page": 1,
    "limit": 20
  }
}
```

> 注意: 任何 GET 响应中都不会返回凭据内容，仅返回 `credentials_ref` 标识符。

#### 创建账号

```
POST /api/khub/accounts
Content-Type: multipart/form-data
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| platform | string | 是 | telegram / whatsapp |
| display_name | string | 是 | 账号显示名 |
| owner_user_id | string | 是 | 归属业务员 ID |
| credentials | file | 是 | 凭据文件 (.json / .zip)，服务端加密存储 |

**Response:** 返回创建后的账号对象，初始 status 为 `inactive`。创建成功后系统自动触发首次连接尝试。

#### 删除账号

```
DELETE /api/khub/accounts/:id
```

删除账号，如当前已连接则先断开，同时从 keychain 中移除凭据。

**Response:**

```json
{
  "ok": true
}
```

#### 触发连接

```
POST /api/khub/accounts/:id/connect
```

**Response:**

```json
{
  "ok": true,
  "data": { "status": "connecting" }
}
```

连接结果通过 `account.status_changed` 事件异步通知，不会阻塞此接口。

#### 断开连接

```
POST /api/khub/accounts/:id/disconnect
```

优雅断开，不删除账号和凭据。

**Response:**

```json
{
  "ok": true,
  "data": { "status": "inactive" }
}
```

#### 查询事件历史

```
GET /api/khub/accounts/:id/events
```

**Query 参数:** page, limit

**Response:**

```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "event_type": "connected",
        "timestamp": 1714350000000,
        "details": { "session_id": "sess_abc123" }
      },
      {
        "event_type": "error",
        "timestamp": 1714349000000,
        "details": { "message": "connection timeout" },
        "error_code": "CONN_TIMEOUT"
      }
    ]
  }
}
```

event_type 枚举: `connected` / `disconnected` / `error` / `reconnecting` / `banned`

---

## 5. 跨域与网络方案

### 问题

Tracy Admin SPA 运行在 `admin.huidu.ai`，kHub API 运行在 `api-khub.huidu.ai`（或 `api.huidu.ai/khub`），浏览器会触发跨域限制。

### 方案对比

| 方案 | 优点 | 缺点 |
|------|------|------|
| (1) Tracy 反向代理 kHub API | 前端无跨域问题，统一域名 | Tracy 需要改 Nginx 配置，增加代理层，kHub 和 Tracy 耦合 |
| (2) kHub 配置 CORS | 改动小，职责清晰，Tracy 只需配置 API base URL | 需要确保 JWT 在跨域场景下正确传递 |

### 推荐方案: CORS (方案 2)

理由：改动最小，职责分离最清晰。kHub API 层配置允许 `admin.huidu.ai` 来源的跨域请求，携带 credentials。

### Tracy Admin SPA 侧实现

1. 环境配置新增 `KHUB_API_BASE_URL`
2. 新建 API client 文件 `khubApi.ts`，复用与现有 `adminApi.ts` 相同的模式（axios 实例、JWT 拦截器、trace ID 生成）
3. 所有 kHub 相关的 API 调用走这个 client，JWT token 与 Admin 自身的 API 调用共用

---

## 6. 实时性与事件联动

Admin 页面的操作需要实时同步到销售工作台。以下是两个场景的完整链路：

### 可见性策略变更

```
Admin 操作 (创建/撤销策略)
    │
    ▼ HTTP
kHub API 写入策略
    │
    ├─► DB 持久化
    ├─► Redis 缓存更新/失效
    └─► Event Bus: visibility.changed
              │
              ▼
         WS Gateway 订阅该事件
              │
              ▼
         推送给受影响的 sales 用户 (< 3s)
              │
              ▼
         ViewProjector 重新投影客户数据
              │
              ▼
         销售工作台 UI 更新 (字段显示/隐藏)
```

### 账号连接状态变更

```
Admin 操作 (重连/断开) 或 系统自动检测
    │
    ▼
kHub ConnectorRegistry 更新状态
    │
    ├─► DB 更新
    └─► Event Bus: account.status_changed
              │
              ▼
         WS Gateway 推送给账号归属的 sales
              │
              ▼
         销售工作台连接状态指示器刷新
```

两个场景都依赖 kHub 的 Event Bus 和 WS Gateway，这是 kHub 已有的基础设施，不需要 Tracy 额外开发。

---

## 7. 与现有 Admin SPA 的集成方式

### 文件结构

```
apps/admin/src/ui/
├── pages/
│   └── khub/
│       ├── VisibilityPage.tsx      ← 可见性策略管理页
│       └── AccountHealthPage.tsx   ← 账号健康管理页
├── api/
│   └── khubApi.ts                  ← kHub API client
└── ...
```

### 路由注册

在 Admin SPA 路由配置中新增 `/khub/*` 命名空间下的两个路由。这两个路由需要经过 `grant_visibility_policy` capability 的权限守卫。

### API client

新建 `khubApi.ts`，参考现有 `adminApi.ts` 的模式：
- 使用 axios 创建独立实例
- baseURL 读取 `KHUB_API_BASE_URL` 环境变量
- 请求拦截器注入 JWT token 和 trace ID
- 响应拦截器统一处理错误码

### 组件复用

Admin SPA 已有的组件库可直接使用：
- 表格组件（排序、分页、行展开）
- 弹窗组件（表单弹窗、确认弹窗）
- 筛选栏组件（下拉、搜索）
- 状态标签/色点组件

### i18n

新增 `khub` 命名空间的翻译文件，覆盖两个页面的所有文案。

### 构建

无需修改构建流程。这两个页面和现有页面一起打包，执行 `npm run build:admin` 即可。

---

## 8. 待决策事项

| # | 事项 | 选项 | 建议 | 决定时间 |
|---|------|------|------|---------|
| 1 | 页面路径命名 | `/v22/admin/visibility` vs `/khub/visibility` | `/khub/visibility`，与功能归属一致 | 开发前确认 |
| 2 | kHub API baseUrl 配置方式 | 环境变量 vs 运行时配置 | 环境变量，与现有 Admin 配置方式一致 | 开发前确认 |
| 3 | 跨域方案 | Tracy 反代 vs CORS | CORS，改动小、职责清晰 | 开发前确认 |
| 4 | 凭据上传方式 | form upload vs 其他安全方案 | form upload + 服务端加密，简单够用 | 开发前确认 |
| 5 | 实施排期 | Phase 4 (第 7-8 周) | 按计划文档执行 | 排期确认 |

---

> 本文档为初稿，随 API 设计和 UI 实现推进会持续更新。Tracy 团队和 kHub 团队如有疑问，在对应文档的讨论区或日常站会中沟通。
