# kHub V1.2 数据模型

---

## 目录

- [1. 文档信息](#1-文档信息)
- [2. 设计原则](#2-设计原则)
- [3. 数据架构概览](#3-数据架构概览)
- [4. kHub 新建表（khub_ 前缀）](#4-khub-新建表khub_-前缀)
  - [4.1 khub_raw_events（原始事件存档）](#41-khub_raw_events原始事件存档)
  - [4.2 khub_accounts（账号管理）](#42-khub_accounts账号管理)
  - [4.3 khub_visibility_policies（可见性策略）](#43-khub_visibility_policies可见性策略)
  - [4.4 khub_visibility_audit_log（可见性审计日志）](#44-khub_visibility_audit_log可见性审计日志)
- [5. Tracy message_raw 表增强字段（D-01 方案 C）](#5-tracy-message_raw-表增强字段d-01-方案-c)
- [6. 表职责总览](#6-表职责总览)
- [7. 命名与隔离规则](#7-命名与隔离规则)
- [8. ID 命名规范](#8-id-命名规范)
- [9. 数据生命周期](#9-数据生命周期)

---

## 1. 文档信息

| 项目 | 内容 |
|------|------|
| 文档标题 | kHub V1.2 数据模型 |
| 版本 | v1.2 |
| 日期 | 2026-04-29 |
| 状态 | 修订稿 |
| 适用范围 | kHub V1.2（IM 平台壳层 + 销售工作台） |
| 说明 | 本文收敛 V1.2 所有数据表定义。kHub 不自建完整消息表，基于 Tracy message_raw 增强 + kHub 自有表（khub_ 前缀） |

---

## 2. 设计原则

1. **共享 PostgreSQL 实例**：kHub 与 Tracy 共享同一个 PostgreSQL 实例，通过表名前缀隔离。
2. **kHub 不直读 Tracy 业务表**：所有 Tracy 数据通过 HTTP API 获取，唯一例外是 D-01 方案 C 的字段级共享。
3. **khub_ 前缀隔离**：kHub 新建表统一使用 `khub_` 前缀，与 Tracy 表物理隔离。
4. **conversation_seq 由 Tracy 分配**：kHub 不在本地生成序号，通过 `POST /ingest/message_raw` 由 Tracy 负责分配。
5. **服务端可见性控制**：可见性策略和审计日志作为一等实体建模，支撑 ViewProjector 投影。
6. **凭据不存明文**：账号凭据通过引用标识存储，明文存放在 OS keychain 或加密文件中。

---

## 3. 数据架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                  共享 PostgreSQL 实例                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Tracy 已有表（不动）                                 │    │
│  │  message_raw · translation_records · analysis_results │    │
│  │  leads · profiles · ...                              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Tracy message_raw 增强字段（D-01 方案 C）            │    │
│  │  + conversation_seq · platform_msg_id · status ...   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  kHub 新建表（khub_ 前缀）                            │    │
│  │  khub_raw_events · khub_accounts                     │    │
│  │  khub_visibility_policies · khub_visibility_audit_log │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. kHub 新建表（khub_ 前缀）

### 4.1 khub_raw_events（原始事件存档）

kHub 自己的原始事件缓冲表，记录所有入站和出站事件的原始数据。

```sql
CREATE TABLE khub_raw_events (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id            VARCHAR(100) NOT NULL,     -- InboundMessageEvent.eventId
  platform            VARCHAR(20) NOT NULL,      -- 'telegram' | 'whatsapp'
  account_id          UUID        NOT NULL REFERENCES khub_accounts(id),
  platform_msg_id     VARCHAR(200) NOT NULL,     -- 平台原始消息 ID
  platform_chat_id    VARCHAR(200) NOT NULL,     -- 平台原始聊天 ID
  direction           VARCHAR(10) NOT NULL DEFAULT 'inbound', -- 'inbound' | 'outbound'
  message_type        VARCHAR(20) NOT NULL,      -- 'text' | 'image' | 'system'
  content             TEXT,                      -- 消息文本内容
  media_url           TEXT,                      -- 媒体文件 MinIO 路径
  sender_platform_user_id VARCHAR(200),          -- 发送者平台用户 ID
  raw_payload         JSONB,                     -- 平台原始数据完整保留
  tracy_message_id    UUID,                      -- Tracy ingest 返回的 message_raw id
  conversation_seq    BIGINT,                    -- Tracy 分配后回填
  status              VARCHAR(20) DEFAULT 'pending',
                      -- 'pending' | 'ingested' | 'sent' | 'failed'
  failure_code        VARCHAR(50),               -- 发送失败错误码
  failure_message     TEXT,                      -- 发送失败错误信息
  status_updated_at_ms BIGINT,                   -- 状态最后更新时间
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- 去重索引：同一平台 + 同一消息 ID + 同一账号 = 唯一
CREATE UNIQUE INDEX idx_khub_raw_events_platform_msg
  ON khub_raw_events(platform, platform_msg_id, account_id);

-- 时间查询
CREATE INDEX idx_khub_raw_events_created_at
  ON khub_raw_events(created_at);

-- 按 conversation_seq 查询
CREATE INDEX idx_khub_raw_events_conversation_seq
  ON khub_raw_events(conversation_seq);

-- 按状态查询（用于重试等）
CREATE INDEX idx_khub_raw_events_status
  ON khub_raw_events(status)
  WHERE status IN ('pending', 'failed');
```

### 4.2 khub_accounts（账号管理）

管理 kHub 控制的 IM 账号信息。

```sql
CREATE TABLE khub_accounts (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID        NOT NULL,
  owner_user_id          UUID        NOT NULL,   -- 负责此账号的 sales 用户 ID
  platform               VARCHAR(20) NOT NULL,   -- 'telegram' | 'whatsapp'
  account_name           VARCHAR(100) NOT NULL,  -- 账号显示名
  platform_account_id    VARCHAR(200) NOT NULL,  -- 平台侧账号标识
  credentials_ref        VARCHAR(500),           -- 凭据引用（不存明文）
                         -- 格式: "keychain:<platform>:<account_id>"
                         -- 或:   "file:/path/to/encrypted.enc"
  status                 VARCHAR(20) DEFAULT 'inactive',
                         -- 'inactive' | 'connecting' | 'connected' | 'error' | 'banned'
  last_connected_at_ms   BIGINT,                 -- 最后成功连接时间
  last_error_code        VARCHAR(50),            -- 最近错误码
  last_error_message     TEXT,                   -- 最近错误信息
  metadata               JSONB       DEFAULT '{}',
  created_at             TIMESTAMPTZ DEFAULT now(),
  updated_at             TIMESTAMPTZ DEFAULT now()
);

-- 平台 + 平台账号 ID 唯一
CREATE UNIQUE INDEX idx_khub_accounts_platform_account
  ON khub_accounts(platform, platform_account_id);

-- 按 owner 查询
CREATE INDEX idx_khub_accounts_owner
  ON khub_accounts(owner_user_id);

-- 按状态查询
CREATE INDEX idx_khub_accounts_status
  ON khub_accounts(status);
```

### 4.3 khub_visibility_policies（可见性策略）

记录"谁在什么范围内可以看到哪些敏感字段"，用于服务端白名单投影。

```sql
CREATE TABLE khub_visibility_policies (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_user_id    UUID        NOT NULL,   -- 被授权的 sales 用户 ID
  scope_kind        VARCHAR(20) NOT NULL,   -- 'conversation' | 'customer' | 'team' | 'tenant'
  scope_id          VARCHAR(200) NOT NULL,  -- scope_kind 对应的 ID
  fields            JSONB       NOT NULL DEFAULT '[]',
                    -- 授权的字段列表，如 ["real_name", "phone", "avatar_url"]
  granted_by        UUID        NOT NULL,   -- 授予者（通常是 supervisor/boss）
  granted_at_ms     BIGINT      NOT NULL,   -- 授予时间（毫秒时间戳）
  expires_at_ms     BIGINT,                 -- NULL = 永不过期
  revoked_at_ms     BIGINT,                 -- NULL = 未撤销
  metadata          JSONB       DEFAULT '{}'
);

-- 按 viewer 查询有效策略
CREATE INDEX idx_visibility_policies_viewer
  ON khub_visibility_policies(viewer_user_id);

-- 按 scope 查询
CREATE INDEX idx_visibility_policies_scope
  ON khub_visibility_policies(scope_kind, scope_id);

-- 过期扫描索引（定时回收用）
CREATE INDEX idx_visibility_policies_expires
  ON khub_visibility_policies(expires_at_ms)
  WHERE revoked_at_ms IS NULL AND expires_at_ms IS NOT NULL;
```

### 4.4 khub_visibility_audit_log（可见性审计日志）

记录授权、撤销、过期和修改动作，满足追责审计需要。

```sql
CREATE TABLE khub_visibility_audit_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id     UUID        NOT NULL REFERENCES khub_visibility_policies(id),
  action        VARCHAR(20) NOT NULL,   -- 'grant' | 'revoke' | 'expire' | 'modify'
  actor_user_id UUID        NOT NULL,   -- 操作人（'system' 表示定时回收）
  before_state  JSONB,                  -- 变更前状态快照
  after_state   JSONB,                  -- 变更后状态快照
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 按 policy 查询审计历史
CREATE INDEX idx_visibility_audit_policy
  ON khub_visibility_audit_log(policy_id);

-- 按时间查询
CREATE INDEX idx_visibility_audit_created
  ON khub_visibility_audit_log(created_at);
```

---

## 5. Tracy message_raw 表增强字段（D-01 方案 C）

以下字段由 Tracy 侧实施，kHub 通过 `POST /ingest/message_raw` 写入。

```sql
-- Tracy message_raw 表新增字段（由 Tracy 实施 D-01）
ALTER TABLE message_raw ADD COLUMN IF NOT EXISTS conversation_seq              BIGINT;
ALTER TABLE message_raw ADD COLUMN IF NOT EXISTS platform_msg_id              VARCHAR(200);
ALTER TABLE message_raw ADD COLUMN IF NOT EXISTS display_text                 TEXT;
ALTER TABLE message_raw ADD COLUMN IF NOT EXISTS translated_text              TEXT;
ALTER TABLE message_raw ADD COLUMN IF NOT EXISTS status                       VARCHAR(20) DEFAULT 'received';
ALTER TABLE message_raw ADD COLUMN IF NOT EXISTS status_updated_at_ms         BIGINT;
ALTER TABLE message_raw ADD COLUMN IF NOT EXISTS failure_code                 VARCHAR(50);
ALTER TABLE message_raw ADD COLUMN IF NOT EXISTS failure_message              TEXT;
ALTER TABLE message_raw ADD COLUMN IF NOT EXISTS platform_message_id_returned VARCHAR(200);
ALTER TABLE message_raw ADD COLUMN IF NOT EXISTS raw_payload_id               UUID;
ALTER TABLE message_raw ADD COLUMN IF NOT EXISTS agent_platform_account       VARCHAR(100);
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `conversation_seq` | BIGINT | 由 Tracy ingest 路由通过 PG advisory lock 分配，单调递增 |
| `platform_msg_id` | VARCHAR(200) | 平台原始消息 ID，用于去重（UNIQUE 约束） |
| `display_text` | TEXT | 展示文本（经过格式化） |
| `translated_text` | TEXT | 翻译结果文本 |
| `status` | VARCHAR(20) | 消息状态：received / pending / sent / delivered / read / failed / timeout |
| `status_updated_at_ms` | BIGINT | 状态最后更新时间（毫秒时间戳） |
| `failure_code` | VARCHAR(50) | 发送失败错误码 |
| `failure_message` | TEXT | 发送失败错误信息 |
| `platform_message_id_returned` | VARCHAR(200) | 平台返回的消息 ID（出站发送成功后回填） |
| `raw_payload_id` | UUID | 关联 khub_raw_events.id |
| `agent_platform_account` | VARCHAR(100) | 多账号隔离字段（标识接收/发送此消息的受控账号） |

---

## 6. 表职责总览

| 归属 | 表名 | 作用 |
|------|------|------|
| kHub | `khub_raw_events` | kHub 原始事件缓冲，入站/出站事件存档，状态追踪 |
| kHub | `khub_accounts` | 受控 IM 账号管理，凭据引用，连接状态 |
| kHub | `khub_visibility_policies` | 可见性策略白名单，控制 sales 可见字段 |
| kHub | `khub_visibility_audit_log` | 可见性操作审计日志 |
| Tracy（增强） | `message_raw` + 新字段 | 消息主存储，conversation_seq 排序权威，出站状态机 |
| Tracy（已有） | `translation_records` | 翻译审计（Tracy 管理） |
| Tracy（已有） | `analysis_results` | 分析结果（Tracy 管理） |
| Tracy（已有） | `leads` / `profiles` | 客户/Leads 数据（Tracy 管理） |

---

## 7. 命名与隔离规则

| 规则 | 说明 |
|------|------|
| Tracy 已有表 | 保持原名（message_raw, translation_records 等） |
| kHub 新建表 | 统一 `khub_` 前缀 |
| 共享实例隔离 | 靠表名前缀 + schema 权限控制 |
| kHub 不直读 Tracy 表 | 通过 HTTP API 获取数据 |
| Tracy 不直读 kHub 表 | kHub 表仅 kHub 进程读写 |

---

## 8. ID 命名规范

| ID 类型 | 格式 | 示例 |
|--------|------|------|
| conversation_id | `<platform>::<native_conversation_id>` | `telegram::123456789` |
| message_id | `<platform>::<native_conversation_id>::<native_message_id>` | `telegram::123456789::987` |
| platform_msg_id | `<native_message_id>` | `987` |
| 多账号隔离 | `agent_platform_account` 字段 | Tracy message_raw 表字段 |
| khub_accounts.id | UUID | `550e8400-e29b-41d4-a716-446655440000` |
| khub_raw_events.id | UUID | `550e8400-e29b-41d4-a716-446655440001` |
| visibility policy id | UUID | `550e8400-e29b-41d4-a716-446655440002` |

---

## 9. 数据生命周期

### 9.1 khub_raw_events

| 阶段 | 时间范围 | 策略 |
|------|---------|------|
| Hot | 0-7 天 | 主表，全索引，实时查询 |
| Warm | 7-30 天 | 保留，降低查询优先级 |
| Cold | >30 天 | 可归档到对象存储（V2 实现） |

**说明**：khub_raw_events 主要用于事件缓冲和状态追踪，消息的长期存储由 Tracy message_raw 负责。

### 9.2 khub_visibility_policies

- 已撤销的策略（`revoked_at_ms IS NOT NULL`）保留 90 天用于审计，之后可归档
- 有效策略永久保留

### 9.3 khub_visibility_audit_log

- 审计日志永久保留（合规要求）
- V2 可考虑按时间分区

### 9.4 khub_accounts

- 账号记录永久保留（含已停用/封禁的账号）
- 凭据引用在账号停用后清除

---

**文档结束**
