# kHub V1.2 技术实现规格

## 目录

- [1. Connector Adapter 层](#1-connector-adapter-层)
- [2. Message Core 增强](#2-message-core-增强)
- [3. 出站消息状态机](#3-出站消息状态机)
- [4. WebSocket Gateway](#4-websocket-gateway)
- [5. Visibility Control](#5-visibility-control)
- [6. Account Core](#6-account-core)
- [7. 销售工作台前端](#7-销售工作台前端)

---

## 1. Connector Adapter 层

### 1.1 ConnectorAdapter 接口

```typescript
interface ConnectorAdapter {
  // --- 身份标识 ---
  readonly platform: PlatformKind; // 'telegram' | 'whatsapp'
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
  on(event: 'error', handler: (evt: ConnectorErrorEvent) => void): void;

  // --- 出站命令（Core → Connector）---
  sendMessage(params: SendMessageParams): Promise<SendResult>;
  sendMedia(params: SendMediaParams): Promise<SendResult>;

  // --- 用户解析 ---
  resolveUser(accountId: string, lookup: UserLookup): Promise<ResolvedUser | null>;
}
```

### 1.2 PlatformCapabilityManifest

```typescript
interface PlatformCapabilityManifest {
  platform: PlatformKind;
  maxTextLength: number;
  maxMediaSizeBytes: number;
  maxGroupMembers: number;
  supports: {
    textMessage: boolean;
    imageMessage: boolean;
    videoMessage: boolean;    // V1.5
    audioMessage: boolean;    // V1.5
    fileMessage: boolean;     // V1.5
    messageEdit: boolean;     // V1.5
    messageDelete: boolean;   // V1.5
    readReceipt: boolean;     // V1.5
    typingIndicator: boolean; // V1.5
    groupCreate: boolean;     // V2
  };
}
```

**平台能力对照：**

| 能力 | Telegram | WhatsApp |
|-----|----------|----------|
| 文本消息 | ✅ | ✅ |
| 图片消息 | ✅ | ✅ |
| 视频消息 | ❌ V1.5 | ❌ V1.5 |
| 消息编辑 | ❌ V1.5 | ❌ |
| 已读回执 | ❌ V1.5 | ❌ V1.5 |
| 最大文本长度 | 4096 | 65536 |
| 最大媒体大小 | 2GB | 64MB |

### 1.3 ConnectorRegistry

```typescript
class ConnectorRegistry {
  private adapters: Map<PlatformKind, ConnectorAdapter> = new Map();

  register(adapter: ConnectorAdapter): void;
  get(platform: PlatformKind): ConnectorAdapter | undefined;
  getAll(): ConnectorAdapter[];

  // 健康检查：每 30s 轮询各 adapter 的 getConnectionStatus
  startHealthCheck(intervalMs = 30_000): void;
  stopHealthCheck(): void;
}
```

- 启动时从 Plugin Config 读取 `khub.connector.*` 配置，实例化对应 Adapter
- 断连自动重连，重试采用指数退避：1s → 2s → 4s → 8s → 16s → 30s（上限）
- 健康检查结果写入 `khub_accounts.last_error_code`，并发布 `account.status_changed` 事件

### 1.4 InboundMessageEvent

```typescript
interface InboundMessageEvent {
  eventId: string;           // kHub 生成的 UUID
  receivedAt: number;        // kHub 接收时间戳（毫秒）
  platform: PlatformKind;
  accountId: string;         // kHub 的 khub_accounts.id
  platformMessageId: string; // 平台原始消息 ID
  platformChatId: string;    // 平台原始聊天 ID
  sender: {
    platformUserId: string;
    displayName: string;
    isInternal: boolean;
  };
  messageType: 'text' | 'image' | 'system';
  content: string;
  mediaUrl?: string;
  replyToMessageId?: string;
  isGroup: boolean;
  chatTitle?: string;
  rawPayload: unknown;
}
```

### 1.5 InboundMessageEvent → Tracy MessageRaw 字段映射

```typescript
interface TracyMessageRawPayload {
  direction: 'inbound';
  platform: PlatformKind;
  platform_msg_id: string;        // ← InboundMessageEvent.platformMessageId
  platform_chat_id: string;       // ← InboundMessageEvent.platformChatId
  agent_platform_account: string; // ← InboundMessageEvent.accountId
  sender_platform_user_id: string;// ← InboundMessageEvent.sender.platformUserId
  content_type: string;           // ← InboundMessageEvent.messageType
  content_text: string;           // ← InboundMessageEvent.content
  media_url?: string;             // ← InboundMessageEvent.mediaUrl
  received_at_ms: number;         // ← InboundMessageEvent.receivedAt
  metadata?: Record<string, unknown>;
}
```

### 1.6 TG Adapter Shim

- 预估代码量：~300-500 行 TS
- 子进程隔离：TDLib 运行在独立子进程中，通过 IPC 通信
- 事件映射：TDLib `updateNewMessage` → `InboundMessageEvent`
- 出站调用：`sendMessage` → TDLib `sendMessage`
- V1 只支持文本+图片

### 1.7 WA Adapter Shim

- 预估代码量：~300-500 行 TS
- 通信方式：HTTP POST 到 Go:9800 的消息发送/接收端点
- 事件映射：Go:9800 webhook → `InboundMessageEvent`
- 出站调用：`sendMessage` → HTTP POST Go:9800
- V1 只支持文本+图片

---

## 2. Message Core 增强

### 2.1 conversation_seq 分配机制

```
kHub 收到入站消息
  → 写入 khub_raw_events（conversation_seq = NULL）
  → POST Tracy /ingest/message_raw
  → Tracy 内部通过 PG advisory lock 分配 conversation_seq：
    BEGIN;
    SELECT pg_advisory_lock(hashtext($conversation_id));
    SELECT COALESCE(MAX(conversation_seq), 0) + 1
      INTO v_next_seq FROM message_raw
      WHERE platform_chat_id = $conversation_id;
    INSERT INTO message_raw (..., conversation_seq) VALUES (..., v_next_seq);
    SELECT pg_advisory_unlock(hashtext($conversation_id));
    COMMIT;
  → Tracy 返回 { id, conversation_seq, ... }
  → kHub 回填 khub_raw_events.conversation_seq
  → kHub 通过 WS 推 message.new（含 conversation_seq）
```

### 2.2 写入流程

```
入站：
  Connector 收消息
    → kHub 写 khub_raw_events（status=pending）
    → POST Tracy /ingest/message_raw
    → Tracy 返回 conversation_seq
    → kHub 更新 khub_raw_events（status=ingested, conversation_seq）
    → WS 推 message.new

出站：
  销售员确认发送
    → kHub POST Tracy /ingest/message_raw（direction=out）
    → Tracy 返回 conversation_seq
    → kHub 写 khub_raw_events（direction=outbound）
    → ConnectorAdapter.sendMessage()
    → 成功：更新 status=sent
    → 失败：更新 status=failed + failure_code
```

### 2.3 媒体处理（V1）

- **入站**：Connector 下载媒体文件 → kHub 上传到 MinIO → 存储路径写入 `media_url`
- **出站**：前端上传文件 → kHub 存 MinIO → ConnectorAdapter.sendMedia 从 MinIO 取文件发送
- V1 仅支持图片（JPG/PNG/GIF），视频/音频/文件放到 V1.5

---

## 3. 出站消息状态机

### 3.1 状态定义

```
                    ┌──────────┐
                    │ pending  │ ← 销售员确认发送
                    └────┬─────┘
                         │ ConnectorAdapter.sendMessage()
                    ┌────▼─────┐
                    │  sent    │ ← 平台确认收到
                    └────┬─────┘
                         │ delivery report
                    ┌────▼─────────┐
                    │  delivered   │ ← 平台确认送达对方
                    └────┬─────────┘
                         │ read receipt
                    ┌────▼─────┐
                    │  read    │ ← 对方已读
                    └──────────┘

异常路径：
  pending/sent → failed    ← 发送失败
  pending     → timeout    ← 超时未响应
```

### 3.2 推送链路

```
业务员发起发送
  → kHub 写 khub_raw_events（status=pending）
  → kHub WS 推 message.sent_pending（经过 ViewProjector）
  → kHub ConnectorAdapter.sendMessage()
  → 成功：
    → 更新 status=sent
    → POST Tracy /ingest/message_raw（direction=out, status=sent）
    → kHub WS 推 message.sent（经过 ViewProjector）
    → 收到 delivery report → status=delivered → WS 推
    → 收到 read receipt → status=read → WS 推
  → 失败：
    → 更新 status=failed + failure_code + failure_message
    → kHub WS 推 message.failed（经过 ViewProjector）
```

### 3.3 失败重试策略

| 错误类型 | 重试策略 | 最大重试次数 | 说明 |
|---------|---------|------------|------|
| 网络 5xx | 指数退避重试 | 3 次 | 1s → 2s → 4s |
| 429 Too Many Requests | 遵守 `retry_after` | 无限（遵守 header） | 等待平台指定时间 |
| 401 Unauthorized | **不重试，立即告警** | 0 | 凭据可能失效 |
| 400 Bad Request | **不重试** | 0 | 消息格式问题 |
| 拉黑/封号 | **不重试，立即告警** | 0 | 账号状态异常 |
| 超长消息 | **不重试** | 0 | 截断后重试由前端处理 |

重试决策通过 PlatformCapabilityManifest 声明，不同 Connector 可有不同策略。

---

## 4. WebSocket Gateway

### 4.1 协议格式

**服务端 → 客户端：**

```typescript
interface ServerPushEvent {
  type: 'message.new' | 'message.translated' | 'message.analyzed' |
        'message.sent_pending' | 'message.sent' | 'message.status' |
        'message.failed' | 'visibility.changed' | 'account.status_changed' |
        'sync' | 'error';
  data: Record<string, unknown>;
  seq?: number;
  ts: number;
}
```

**客户端 → 服务端：**

```typescript
interface ClientCommand {
  type: 'auth' | 'message.send' | 'read.ack' | 'sync.request' | 'ping';
  data: Record<string, unknown>;
  client_seq?: number;
}
```

### 4.2 推送事件 data 字段

| 事件类型 | data 字段 |
|---------|----------|
| `message.new` | `{ conversationId, messageId, seq, content, ... }` |
| `message.translated` | `{ messageId, translatedText, srcLang, tgtLang }` |
| `message.analyzed` | `{ messageId, analysisPack }` |
| `message.sent_pending` | `{ messageId, conversationId }` |
| `message.sent` | `{ messageId, conversationId, platformMsgId }` |
| `message.status` | `{ messageId, status, statusUpdatedAtMs }` |
| `message.failed` | `{ messageId, failureCode, failureMessage }` |
| `visibility.changed` | `{ scopeKind, scopeId }` |
| `account.status_changed` | `{ accountId, status, lastErrorCode }` |
| `sync` | `{ conversations: [{ id, lastSeq, messages }] }` |

### 4.3 心跳机制

```
客户端每 30s 发送 ping
  → 服务端回复 pong
  → 连续 3 次 ping 无响应（90s）→ 判定断连
  → 服务端释放连接上下文
```

### 4.4 客户端重连策略

```
重连退避策略（指数退避）：
  第 1 次: 1s 后重连
  第 2 次: 2s 后重连
  第 3 次: 4s 后重连
  第 4 次: 8s 后重连
  第 5 次: 16s 后重连
  第 6+ 次: 30s 后重连（上限）

每次重连时：
  1. 建立 WebSocket 连接
  2. 发送 JWT token 认证
  3. 发送 sync.request（各会话 last_sync_seq）
  4. 接收增量数据
  5. 恢复正常通信
```

### 4.5 增量同步

- 每个客户端本地维护 per-conversation 的 `last_sync_seq`
- 建连或重连时发送 `sync.request`，携带各会话的 `last_sync_seq`
- 服务端返回所有 `seq > last_sync_seq` 的消息
- 如果落后 >1000 条，服务端返回摘要 + 最近 100 条，客户端按需通过 REST API 补拉历史

### 4.6 断线缓冲

- 使用 Redis Sorted Set 存储断线期间的消息
- Score = timestamp，TTL = 5 分钟
- 客户端重连后，通过 `sync.request` 拉取缓冲区间内的消息
- 超过 5 分钟的消息，客户端通过 REST API 拉完整历史

### 4.7 鉴权

```typescript
// WS 建连时客户端发送第一条消息必须包含 JWT
{ type: 'auth', data: { token: 'jwt_string' } }

// 服务端验签流程
const decoded = jwt.verify(token, SHARED_JWT_SECRET); // Tracy 共享 JWT_SECRET
if (decoded.role !== 'sales') {
  ws.close(4003, 'Only sales role allowed');
}
```

- JWT_SECRET 与 Tracy 共享（D-01 协调）
- V1 无 refresh token 机制，过期后重新登录

### 4.8 Redis Pub/Sub 拓扑

```
┌─────────────────────────────────────────────────┐
│              kHub 实例 1                         │
│  ┌──────────┐     ┌────────────────────────┐    │
│  │ WS Conn  │────→│ Redis Pub: khub:push   │    │
│  │ (client) │     │ Redis Sub: khub:push   │    │
│  └──────────┘     └────────────────────────┘    │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│              kHub 实例 2                         │
│  ┌──────────┐     ┌────────────────────────┐    │
│  │ WS Conn  │────→│ Redis Pub: khub:push   │    │
│  │ (client) │     │ Redis Sub: khub:push   │    │
│  └──────────┘     └────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

- V1 单实例即可支撑 200-500 并发连接
- 多实例横扩靠 Redis fan-out
- 推送 scope 基于客户端订阅的 actor scope + visibility policy，服务端过滤

### 4.9 推送 Scope 与过滤

```typescript
function shouldPush(wsClient: WsClient, event: PushEvent): boolean {
  // 1. 基础 scope 过滤：只推该 sales 负责的会话
  if (!wsClient.assignedConversations.has(event.conversationId)) {
    return false;
  }

  // 2. visibility policy 过滤：经过 ViewProjector 投影
  const projected = viewProjector.project(event.data, wsClient.userId);
  if (projected === null) return false; // 完全不可见

  // 3. 替换为投影后的数据
  event.data = projected;
  return true;
}
```

---

## 5. Visibility Control

### 5.1 ViewProjector 中间件

```typescript
class ViewProjector {
  private policyCache: Map<string, CachedPolicy[]> = new Map();
  private redis: Redis;

  async project(data: any, viewerUserId: string): Promise<any | null> {
    // 1. 从 Redis 缓存读取该 viewer 的有效策略
    const policies = await this.getEffectivePolicies(viewerUserId);

    // 2. boss/supervisor 全见（虽然工作台不允许登录，防御性编码）
    if (policies === null) return data; // null 表示全见

    // 3. 按策略过滤字段
    const visibleFields = this.computeVisibleFields(policies, data);
    return this.applyProjection(data, visibleFields);
  }

  // 缓存失效由 visibility.changed 事件触发
  async invalidateCache(viewerUserId: string): Promise<void> {
    await this.redis.del(`visibility:${viewerUserId}`);
    this.policyCache.delete(viewerUserId);
  }
}
```

### 5.2 白名单模式

**默认可见字段**（不需要授权即可看到）：

| 字段 | 说明 |
|------|------|
| `conversation_id` | 会话 ID |
| `anonymized_alias` | 匿名别名（如"客户 #1234"） |
| `lead_status` | 客户阶段 |
| 消息内容 | 原文/译文 |
| 时间 | 消息时间戳 |
| `language` | 检测到的语言 |
| `platform_kind` | 平台类型 |

**默认不可见字段**（需要授权才能看到）：

| 字段 | 说明 |
|------|------|
| `real_name` | 真实姓名 |
| `phone` | 手机号 |
| `email` | 邮箱 |
| `platform_username` | 平台用户名 |
| `avatar_url` | 头像 |
| `platform_user_id` | 平台用户 ID |

### 5.3 定时回收

```typescript
// 每 60 秒扫描即将过期的策略
setInterval(async () => {
  const now = Date.now();
  const threshold = now + 60_000; // 未来 1 分钟内过期

  const expiring = await db
    .select()
    .from(khubVisibilityPolicies)
    .where(
      and(
        isNull(khubVisibilityPolicies.revokedAtMs),
        lte(khubVisibilityPolicies.expiresAtMs, threshold)
      )
    );

  for (const policy of expiring) {
    // 1. 更新 revoked_at_ms
    await db.update(khubVisibilityPolicies)
      .set({ revokedAtMs: now })
      .where(eq(khubVisibilityPolicies.id, policy.id));

    // 2. 写审计日志
    await db.insert(khubVisibilityAuditLog).values({
      policyId: policy.id,
      action: 'expire',
      actorUserId: 'system',
      beforeState: { expiresAtMs: policy.expiresAtMs },
      afterState: { revokedAtMs: now },
    });

    // 3. 清除缓存
    await viewProjector.invalidateCache(policy.viewerUserId);

    // 4. 发送事件
    eventBus.emit('visibility.changed', {
      scopeKind: policy.scopeKind,
      scopeId: policy.scopeId,
      viewerUserId: policy.viewerUserId,
    });
  }
}, 60_000);
```

**实时性目标**：从策略变更到客户端感知，3 秒内全部生效。

---

## 6. Account Core

### 6.1 凭据存储

```typescript
interface AccountCredentials {
  tdlibSessionPath?: string;   // Telegram TDLib session 文件路径
  waSessionToken?: string;     // WhatsApp session token
  phone?: string;              // 关联的手机号
}

// credentials_ref 示例值
// "keychain:telegram:account_abc123"
// "file:/etc/khub/creds/telegram_account_abc123.enc"
```

- **优先方案**：OS keychain（macOS Keychain / Linux Secret Service）
- **降级方案**：加密文件（AES-256-GCM，密钥从环境变量读取）
- `credentials_ref` 字段只存储引用标识，不存储凭据明文

### 6.2 生命周期管理

```
创建账号（管理端操作）
  → khub_accounts（status=inactive）
  → 存储凭据到 keychain/file
  → credentials_ref 写入引用

启动连接
  → status → connecting
  → ConnectorAdapter.connect(accountId, credentials)
  → 成功：status → connected, last_connected_at_ms = now()
  → 失败：status → error, last_error_code + last_error_message

健康检查（每 30s）
  → ConnectorAdapter.getConnectionStatus(accountId)
  → 如果返回 disconnected：
    → status → error
    → 自动重连（指数退避）
    → 重连成功 → status → connected
    → 重连失败超过阈值 → 发送告警到 Tracy /alerts/ingest

停用/封禁
  → status → inactive / banned
  → ConnectorAdapter.disconnect(accountId)
```

### 6.3 多账号 conversation_id 隔离

```typescript
// conversation_id 格式不变
const conversationId = `${platform}::${nativeConversationId}`;

// 多账号隔离靠 message_raw.agent_platform_account 字段
// 同一个 native_conversation_id，不同 agent_platform_account 视为不同会话
// 查询时必须同时带上 platform + native_conversation_id + agent_platform_account
```

---

## 7. 销售工作台前端

### 7.1 技术栈

| 层 | 选型 |
|----|------|
| 框架 | React 19 + TypeScript |
| 状态管理 | Zustand |
| UI 组件库 | shadcn/ui + Tailwind CSS |
| 构建工具 | Vite |
| 虚拟滚动 | @tanstack/virtual |
| HTTP 客户端 | ky（或 fetch 封装） |
| WebSocket | 原生 WebSocket + 自定义重连逻辑 |
| 路由 | React Router v7 |
| 图标 | Lucide React |

### 7.2 Zustand Store 设计

```typescript
// 8 个独立 Store
const useAuthStore = create<AuthState>();       // 登录态、JWT、用户信息
const useAccountStore = create<AccountState>(); // 账号列表、连接状态
const useConversationStore = create<ConvState>(); // 会话列表、当前会话、未读数
const useMessageStore = create<MessageState>(); // 消息列表（per-conversation）、虚拟滚动
const useAnalysisStore = create<AnalysisState>(); // 分析结果、状态摘要
const useVisibilityStore = create<VisibilityState>(); // 当前用户的可见性策略
const useWsStore = create<WsState>();           // WS 连接状态、重连状态
const useConfigStore = create<ConfigState>();   // 插件配置（khub.* 命名空间）
```

### 7.3 数据源

| 数据 | 来源 | 说明 |
|------|------|------|
| 客户列表 | Tracy `GET /v22/leads/list` | 分页拉取 |
| 历史消息 | Tracy `GET /replay` | 按会话分页 |
| 翻译 | Tracy `POST /translate` | 按需调用 |
| 分析结果 | Tracy `GET /analysis_pack` + `GET /state_digest` | 轮询 |
| 建议回复 | Tracy `GET /select_action` | 分析附带 |
| 实时更新 | kHub WebSocket | 推送 |
| 数据脱敏 | kHub ViewProjector | 服务端投影 |

### 7.4 关键交互行为

| 行为 | 实现方式 |
|------|---------|
| 会话切换不重连 WS | WS 连接全局唯一，切换会话只改 store 状态 |
| 翻译预览（不自动发） | 用户输入 → 调 Tracy `/translate` → 显示预览 → 点"确认发送"才发 |
| 入站默认未读 | 新入站消息标记未读，用户进入会话后自动标记已读 |
| 虚拟滚动定位 | 用 `conversation_seq` 做锚点，支持上下滚动加载历史 |
| Connector 断连提示 | 顶部红色横幅："Telegram 账号已断连，正在尝试重连..." |
| 数据脱敏显示 | 未授权的客户字段显示 `anonymized_alias`（如"客户 #1234"） |
| 会话内搜索 | 简单 LIKE 搜索（V1），前端本地过滤已加载消息 |

---

**文档结束**
