# kHub V2 数据模型

---

## 1. 文档信息

| 项目 | 内容 |
|------|------|
| 文档标题 | kHub V2 数据模型 |
| 版本 | v2.0 |
| 日期 | 2026-04-27 |
| 状态 | 初稿 |
| 适用范围 | kHub V2 自建 IM Core 方案 |
| 说明 | 本文独立收敛 V2 所有核心数据模型、分区策略、消息序号设计和数据生命周期策略 |

---

## 2. 设计原则

1. **统一存储**：消息原文、译文、分析结果、原始事件、匿名映射、导出任务统一落在 PostgreSQL 主存储中，避免双数据源 join。
2. **三轨文本**：`messages` 必须同时保留 `raw_text`、`display_text`、`translated_text`，分别服务审计、展示、翻译与训练导出。
3. **会话内严格有序**：每个会话维护单调递增的 `conversation_seq`，作为消息排序、重传、同步和分页的顺序权威。
4. **冷热分层**：消息与原始事件从第一天起保留，但按时间进入 Hot / Warm / Cold 层，控制存储成本。
5. **服务端可见性控制**：客户身份字段授权、撤销、过期、审计必须在服务端持久化并可追责。
6. **可训练资产沉淀**：导出链路、术语表、翻译审计都必须结构化落库，便于后续模型微调与平行语料生产。

---

## 3. 核心表 DDL

以下 15 张表覆盖 V2 的完整数据模型：10 张统一中台核心表、3 张 V2 新增表，以及 2 张术语表。

### 3.1 `accounts`（受控账号表）

存放我们控制的 IM 账号信息。

```sql
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
```

### 3.2 `external_identities`（外部联系人表）

存放所有外部联系人（客户、潜在客户）。

```sql
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
```

### 3.3 `conversations`（统一会话表）

统一会话的核心实体。一个会话可能关联多个平台的消息流。

```sql
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
```

### 3.4 `conversation_participants`（会话参与者表）

多态关联，支持受控账号和外部联系人两种参与者类型。

```sql
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
```

### 3.5 `messages`（统一消息表）

整个中台最核心的表。三轨文本设计（`raw_text + display_text + translated_text`）是关键特性。

```sql
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
```

### 3.6 `attachments`（附件表）

```sql
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
```

### 3.7 `raw_events`（平台原始事件表）

从第一天开始保存全部平台原始事件数据。这张表的价值随时间增长，是不可妥协的数据资产。

```sql
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
```

### 3.8 `analysis_results`（分析结果表）

```sql
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
```

### 3.9 `translation_records`（翻译审计记录表）

```sql
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
```

### 3.10 `conversation_aliases`（客户匿名化别名表）

```sql
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
```

### 3.11 `visibility_policies`（可见性策略表）

记录“谁在什么范围内可以看到哪些敏感字段”，用于服务端白名单投影。

```sql
CREATE TABLE visibility_policies (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_type     VARCHAR(20) NOT NULL,  -- 'user' | 'role'
  viewer_id       UUID        NOT NULL,  -- 指向 internal_users.id 或 role_id
  target_type     VARCHAR(20) NOT NULL,  -- 'conversation' | 'identity' | 'global'
  target_id       UUID,                  -- conversation_id 或 identity_id，global 时为 NULL
  fields_visible  JSONB       NOT NULL DEFAULT '[]',  -- 可见字段白名单：['real_name','phone','avatar','username']
  granted_by      UUID        NOT NULL,  -- 操作人
  granted_at      TIMESTAMPTZ DEFAULT now(),
  expires_at      TIMESTAMPTZ,           -- NULL = 永不过期
  revoked_at      TIMESTAMPTZ            -- 非 NULL = 已撤销
);

CREATE INDEX idx_visibility_viewer_active
  ON visibility_policies(viewer_type, viewer_id)
  WHERE revoked_at IS NULL;
CREATE INDEX idx_visibility_target_active
  ON visibility_policies(target_type, target_id)
  WHERE revoked_at IS NULL;
CREATE INDEX idx_visibility_expires_active
  ON visibility_policies(expires_at)
  WHERE expires_at IS NOT NULL AND revoked_at IS NULL;
```

### 3.12 `visibility_audit_log`（可见性审计日志表）

记录授权、撤销、过期和修改动作，满足追责审计需要。

```sql
CREATE TABLE visibility_audit_log (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id       UUID        REFERENCES visibility_policies(id),
  action          VARCHAR(20) NOT NULL,  -- 'grant' | 'revoke' | 'expire' | 'modify'
  operator_id     UUID        NOT NULL,  -- 操作人
  viewer_id       UUID        NOT NULL,
  target_id       UUID,
  fields_before   JSONB,
  fields_after    JSONB,
  reason          TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_policy ON visibility_audit_log(policy_id);
CREATE INDEX idx_audit_viewer ON visibility_audit_log(viewer_id, created_at DESC);
CREATE INDEX idx_audit_created ON visibility_audit_log(created_at DESC);
```

### 3.13 `export_tasks`（导出任务表）

管理平行语料、结构化对话、CSV/JSON 等异步导出任务。

```sql
CREATE TABLE export_tasks (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by    UUID        NOT NULL,
  export_type     VARCHAR(30) NOT NULL,  -- 'parallel_corpus' | 'structured_dialog' | 'csv' | 'json'
  filters         JSONB       NOT NULL,  -- {time_range, account_ids, conversation_ids, platforms, languages}
  status          VARCHAR(20) DEFAULT 'pending',  -- 'pending' | 'processing' | 'completed' | 'failed'
  progress        INTEGER     DEFAULT 0,  -- 0-100
  result_file_key TEXT,                   -- 对象存储键
  result_file_size BIGINT,
  row_count       BIGINT,
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_export_status ON export_tasks(status, created_at DESC);
CREATE INDEX idx_export_user ON export_tasks(requested_by, created_at DESC);
```

### 3.14 `glossaries`（术语表主表）

支持多级作用域的术语表定义，用于翻译前后的一致性约束。

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
```

### 3.15 `glossary_entries`（术语条目表）

```sql
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

作用域优先级：`account > scenario > global`。`priority` 字段用于同层级内进一步排序。

---

## 4. 表职责总览

| 类别 | 表名 | 作用 |
|------|------|------|
| 账号与身份 | `accounts` | 管理我方受控 IM 账号 |
| 账号与身份 | `external_identities` | 管理外部联系人主档 |
| 会话 | `conversations` | 统一会话主表 |
| 会话 | `conversation_participants` | 记录会话参与者与角色 |
| 消息 | `messages` | 消息主表，承载三轨文本与顺序权威 |
| 消息 | `attachments` | 媒体、文件与缩略图元数据 |
| 原始事件 | `raw_events` | 保存平台原始载荷，用于排障/回放/抽样 |
| 分析 | `analysis_results` | 存放意图、情感、摘要等分析结果 |
| 翻译 | `translation_records` | 存放翻译审计、成本、延迟、缓存命中 |
| 脱敏 | `conversation_aliases` | 管理客户匿名别名与匿名头像 |
| 脱敏 | `visibility_policies` | 管理 viewer × target 的敏感字段授权 |
| 脱敏 | `visibility_audit_log` | 记录授权、撤销、过期与修改审计 |
| 导出 | `export_tasks` | 管理训练数据与报表导出异步任务 |
| 术语 | `glossaries` | 管理术语表作用域与语言方向 |
| 术语 | `glossary_entries` | 管理具体术语映射规则 |

---

## 5. 分区策略

### 5.1 `messages` 按 `sent_at` 做 RANGE 月分区

```sql
-- 示例：2025年1月分区
CREATE TABLE messages_2025_01 PARTITION OF messages
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

设计目的：

- 把高频写入和按时间范围查询控制在小分区内
- 让历史数据归档与冷迁移成为分区级操作
- 降低全表 vacuum、索引维护和备份恢复的成本

### 5.2 `raw_events` 按 `received_at` 做 RANGE 月分区

`raw_events` 的增长速度高于 `messages`，并且更偏审计/排障用途，因此单独按接收时间做月分区，便于快速冷热切换和分区 DETACH。

### 5.3 自动分区管理

使用 `pg_partman` 自动管理分区：

- `premake = 3`：提前创建未来 3 个月分区
- `retention = '3 months'`：到期后自动 detach 历史分区

### 5.4 预估数据量

| 指标 | 日 | 月 | 年 |
|------|-----|------|------|
| 消息量 | 500K | 15M | 180M |
| 消息存储 | ~500MB | ~15GB | ~180GB |
| `raw_events`（约为消息 1.5x） | ~750MB | ~22GB | ~270GB |

---

## 6. 数据生命周期

```text
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
```

### 6.1 Hot 层（0-3 月）

- 使用主分区，部署在 SSD
- 保留完整索引
- 主要服务实时会话、全局搜索、翻译回查、管理台审计、工作台高频查询

### 6.2 Warm 层（3-12 月）

- 转为压缩分区或迁移到低成本存储盘
- 仅保留核心索引
- 仍支持秒级查询，但不追求极限低延迟

### 6.3 Cold 层（>12 月）

- 将历史分区导出为 Parquet 到对象存储
- 通过分区 DETACH 从主库摘除
- 主要用于离线分析、训练样本抽样、历史归档取证

### 6.4 `raw_events` 特殊保留策略

`raw_events` 更偏调试和回溯，因此生命周期更短：

- Hot：1 个月
- Warm：1-3 个月
- Cold：>3 个月导出为 Parquet，再做分区 DETACH

---

## 7. 消息序号设计

每个会话维护一个单调递增的 `conversation_seq`，作为会话内消息顺序的唯一权威。

### 7.1 用途

- **消息排序**：定义会话内绝对顺序
- **Gap 检测**：客户端上报 `last_seen_seq=100`，服务端发现 101-105 缺失时触发补发
- **增量同步**：客户端断线重连后发送 `last_sync_seq`，服务端返回 seq 更大的消息
- **分页**：用 seq 做 keyset pagination，避免深分页 OFFSET 性能劣化

### 7.2 实现方案

每个 `conversation` 对应一个 PostgreSQL `SEQUENCE`，命名约定为 `seq_conv_{conversation_id}`。在消息写入事务中调用 `nextval()` 获取 `conversation_seq`。

该方案在 V1/V2 消息量下性能足够，单序列每秒可分配超过 100K 个值。若未来出现极端热点单会话，可切换为 Redis `INCR` 分配并异步回写 PostgreSQL，但在当前阶段不必过早复杂化。

---

## 8. 数据模型与上层能力的对应关系

| 上层能力 | 关键表 | 说明 |
|---------|--------|------|
| 动态可见性控制 | `visibility_policies`、`visibility_audit_log`、`conversation_aliases` | 支撑服务端白名单投影、撤销路径、审计追责、定时回收 |
| 跨平台跨会话搜索 | `messages` | 原文与译文统一存储，便于做双索引检索 |
| 训练数据导出 | `messages`、`translation_records`、`analysis_results`、`conversation_aliases`、`export_tasks` | 支撑平行语料和结构化对话导出 |
| 实时消息闭环 | `messages`、`raw_events`、`attachments` | 支撑入站、出站、媒体与回放 |
| 术语约束翻译 | `glossaries`、`glossary_entries` | 支撑术语加载、注入、后处理校验 |

---

## 9. 结论

这套数据模型有三个核心特点：

1. **统一消息主存储**：原文、译文、分析和导出不再分裂在多个系统中。
2. **面向业务控制**：可见性、审计、匿名化、导出任务都作为一等实体建模。
3. **面向未来演进**：分区、冷热分层、术语表、训练导出、事件归档都为 V2/V3 留出扩展空间。

---

**文档结束**
